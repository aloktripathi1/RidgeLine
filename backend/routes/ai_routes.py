from __future__ import annotations

import os
import json
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import get_current_user, require_roles
from ..database import get_db
from ..models.user import UserRole, User
from ..schemas.common import success_response
from ..services import trek_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])


def _get_client():
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI features require ANTHROPIC_API_KEY environment variable.",
        )
    import anthropic
    return anthropic.Anthropic(api_key=api_key)


def _extract_json(text: str) -> dict:
    """Parse JSON from Claude output, stripping markdown code fences if present."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        inner = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])
        text = inner.strip()
    return json.loads(text)


def _trek_summary(t) -> str:
    return (
        f"- {t.name} ({t.location}) | {t.difficulty.value} | {t.duration_days} days | "
        f"₹{t.price:,} | Status: {t.status.value} | Slots: {t.available_slots}/{t.max_slots}"
        + (f" | Starts: {t.start_date}" if t.start_date else "")
    )


# ── Schemas ──────────────────────────────────────────────────────────────────

class RecommendRequest(BaseModel):
    experience: str = "beginner"   # beginner | intermediate | expert
    duration_pref: str = "any"     # short (<=5d) | medium (6-8d) | long (9+d) | any
    goal: str = "scenic"           # scenic | adventure | easy | cultural | snow
    max_budget: int | None = None
    notes: str = ""


class ItineraryRequest(BaseModel):
    special_needs: str = ""


class DescribeRequest(BaseModel):
    name: str
    location: str
    difficulty: str
    duration_days: int
    price: int
    highlights: str = ""


class ChatMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    trek_id: int | None = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/recommend")
async def recommend_trek(
    payload: RecommendRequest,
    db: Session = Depends(get_db),
):
    client = _get_client()
    treks = trek_service.list_treks(db, None, None, None, None)
    open_treks = [t for t in treks if t.status.value in ("Open", "Approved")]

    if not open_treks:
        raise HTTPException(status_code=404, detail="No open treks available")

    trek_list = "\n".join(_trek_summary(t) for t in open_treks)
    duration_hint = {
        "short": "3-5 days", "medium": "6-8 days", "long": "9+ days", "any": "any duration"
    }.get(payload.duration_pref, "any duration")

    budget_hint = f"Budget: up to ₹{payload.max_budget:,}" if payload.max_budget else ""

    prompt = f"""You are a helpful trekking advisor for Ridgeline, an Indian Himalayan trek booking platform.

A user has the following preferences:
- Experience level: {payload.experience}
- Preferred duration: {duration_hint}
- Goal: {payload.goal}
{budget_hint}
- Additional notes: {payload.notes or "None"}

Available treks:
{trek_list}

Recommend the TOP 3 most suitable treks for this user. For each, explain in 1-2 sentences WHY it matches.
Respond with ONLY valid JSON in this exact format (no markdown, no extra text):
{{
  "recommendations": [
    {{"trek_name": "...", "reason": "...", "match": "Excellent" | "Good" | "Fair"}},
    {{"trek_name": "...", "reason": "...", "match": "Excellent" | "Good" | "Fair"}},
    {{"trek_name": "...", "reason": "...", "match": "Excellent" | "Good" | "Fair"}}
  ],
  "summary": "One sentence overall advice for this trekker."
}}"""

    try:
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text.strip()
        data = _extract_json(raw)

        # Attach trek ids to recommendations
        trek_map = {t.name: t.id for t in open_treks}
        for rec in data.get("recommendations", []):
            rec["trek_id"] = trek_map.get(rec.get("trek_name"))

        return success_response(data, message="Recommendations ready")
    except json.JSONDecodeError:
        logger.warning("AI recommend returned non-JSON: %s", raw[:200])
        raise HTTPException(status_code=502, detail="AI returned unexpected format. Please try again.")
    except Exception as e:
        logger.error("AI recommend error: %s", e)
        raise HTTPException(status_code=502, detail="AI service error. Please try again.")


@router.post("/itinerary/{trek_id}")
async def generate_itinerary(
    trek_id: int,
    payload: ItineraryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client = _get_client()
    trek = trek_service.get_trek_or_404(db, trek_id)

    prompt = f"""You are an expert Himalayan trek planner for Ridgeline.

Generate a detailed day-by-day itinerary for this trek:
- Name: {trek.name}
- Location: {trek.location}
- Difficulty: {trek.difficulty.value}
- Duration: {trek.duration_days} days
- Description: {trek.description or ""}
- Start date: {trek.start_date or "TBD"}
{f"- Special needs/notes: {payload.special_needs}" if payload.special_needs else ""}

Provide a practical, engaging itinerary with:
- Day-by-day breakdown with titles, activities, and overnight camp/stay location
- A packing essentials list (10-12 items)
- 3-4 key safety tips

Respond with ONLY valid JSON (no markdown, no extra text):
{{
  "itinerary": [
    {{"day": 1, "title": "...", "activities": "...", "stay": "..."}}
  ],
  "packing_list": ["item1", "item2"],
  "tips": ["tip1", "tip2"]
}}"""

    try:
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text.strip()
        data = _extract_json(raw)
        data["trek_name"] = trek.name
        data["trek_location"] = trek.location
        return success_response(data, message="Itinerary generated")
    except json.JSONDecodeError:
        logger.warning("AI itinerary returned non-JSON: %s", raw[:200])
        raise HTTPException(status_code=502, detail="AI returned unexpected format. Please try again.")
    except Exception as e:
        logger.error("AI itinerary error: %s", e)
        raise HTTPException(status_code=502, detail="AI service error. Please try again.")


@router.post("/describe")
async def enhance_description(
    payload: DescribeRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles([UserRole.admin])),
):
    client = _get_client()

    prompt = f"""Write a compelling 2-3 sentence trek description for a trekking booking platform.

Trek details:
- Name: {payload.name}
- Location: {payload.location}
- Difficulty: {payload.difficulty}
- Duration: {payload.duration_days} days
- Price: ₹{payload.price:,}
- Key highlights: {payload.highlights or "Himalayan scenery, nature, adventure"}

Write in second person, evocative language that makes trekkers want to book immediately.
Keep it under 60 words. No quotes, no markdown, just the description text."""

    try:
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )
        description = msg.content[0].text.strip().strip('"').strip("'")
        return success_response({"description": description}, message="Description generated")
    except Exception as e:
        logger.error("AI describe error: %s", e)
        raise HTTPException(status_code=502, detail="AI service error. Please try again.")


@router.post("/chat")
async def trek_chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
):
    client = _get_client()
    treks = trek_service.list_treks(db, None, None, None, None)
    open_treks = [t for t in treks if t.status.value in ("Open", "Approved")]
    trek_context = "\n".join(_trek_summary(t) for t in open_treks[:10])

    trek_detail = ""
    if payload.trek_id:
        try:
            t = trek_service.get_trek_or_404(db, payload.trek_id)
            trek_detail = f"\nCurrently viewing: {t.name} in {t.location} ({t.difficulty.value}, {t.duration_days} days, ₹{t.price:,}). {t.description or ''}"
        except Exception:
            pass

    system = f"""You are Ridge, a friendly and knowledgeable trek advisor for Ridgeline — a Himalayan trekking platform based in India.
Help users choose treks, answer questions about preparation, gear, safety, and booking.
Keep responses concise (under 120 words), friendly, and practical.
{trek_detail}

Available treks:
{trek_context}

If asked about specific treks not in the list, say you don't have info on them yet.
Never make up trek details. Always encourage users to book via the platform."""

    messages = [{"role": m.role, "content": m.content} for m in payload.messages]

    try:
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=300,
            system=system,
            messages=messages,
        )
        reply = msg.content[0].text.strip()
        return success_response({"reply": reply}, message="OK")
    except Exception as e:
        logger.error("AI chat error: %s", e)
        raise HTTPException(status_code=502, detail="AI service error. Please try again.")

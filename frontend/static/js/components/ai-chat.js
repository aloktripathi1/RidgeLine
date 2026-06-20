/* Floating AI Chat widget — Ridge, the trek advisor.
   Appears on all pages as a bottom-right floating button.
*/
(function (global) {
  const AiChat = {
    data() {
      return {
        open: false,
        messages: [],   // {role: "user"|"assistant", content: str}
        input: "",
        loading: false,
        error: "",
      };
    },
    template: /*html*/`
      <div>
        <!-- Floating trigger button -->
        <button
          class="btn rounded-circle shadow-lg d-flex align-items-center justify-content-center"
          style="position:fixed;bottom:24px;right:24px;width:56px;height:56px;background:var(--ridge);color:#fff;z-index:1050;border:none;transition:transform .15s ease;"
          :style="open ? 'transform:scale(0.9)' : ''"
          @click="toggleChat"
          :title="open ? 'Close chat' : 'Ask Ridge — AI trek advisor'"
        >
          <i :class="open ? 'bi bi-x-lg' : 'bi bi-chat-dots-fill'" style="font-size:1.3rem;"></i>
        </button>

        <!-- Chat panel -->
        <div v-if="open"
             class="card border-0 shadow-lg"
             style="position:fixed;bottom:92px;right:24px;width:360px;max-width:calc(100vw - 32px);height:480px;max-height:calc(100vh - 110px);z-index:1049;display:flex;flex-direction:column;overflow:hidden;border-radius:16px;">

          <!-- Header -->
          <div class="d-flex align-items-center gap-2 p-3 border-bottom" style="background:var(--ridge);color:#fff;border-radius:16px 16px 0 0;">
            <div class="rounded-circle bg-white d-flex align-items-center justify-content-center flex-shrink-0"
                 style="width:32px;height:32px;">
              <i class="bi bi-stars text-ridge" style="font-size:0.9rem;"></i>
            </div>
            <div>
              <div class="fw-semibold lh-1">Ridge</div>
              <div style="font-size:0.68rem;opacity:.8;">AI Trek Advisor · Ridgeline</div>
            </div>
            <span class="ms-auto badge" style="background:rgba(255,255,255,.2);font-size:0.65rem;">Beta</span>
          </div>

          <!-- Messages -->
          <div class="flex-grow-1 overflow-auto p-3" ref="msgBox" style="background:#f7f5f1;">
            <!-- Welcome message -->
            <div v-if="!messages.length" class="text-center py-3">
              <div class="mb-3">
                <i class="bi bi-mountains display-5 text-ridge"></i>
              </div>
              <p class="small text-muted mb-3">Hi! I'm Ridge, your AI trek advisor.<br/>Ask me anything about our treks.</p>
              <div class="d-flex flex-wrap gap-2 justify-content-center">
                <button v-for="q in quickQuestions" :key="q"
                        class="btn btn-sm btn-outline-ridge"
                        style="font-size:0.72rem;"
                        @click="sendQuick(q)">
                  {{ q }}
                </button>
              </div>
            </div>

            <!-- Message bubbles -->
            <div v-for="(m, i) in messages" :key="i" class="mb-2"
                 :class="m.role === 'user' ? 'd-flex justify-content-end' : 'd-flex justify-content-start'">
              <div class="px-3 py-2 rounded-3"
                   :style="m.role === 'user'
                     ? 'background:var(--ridge);color:#fff;max-width:80%;font-size:0.83rem;border-radius:14px 14px 4px 14px;'
                     : 'background:#fff;color:#1c1f1a;max-width:85%;font-size:0.83rem;border-radius:14px 14px 14px 4px;border:1px solid #eee;'">
                {{ m.content }}
              </div>
            </div>

            <!-- Loading bubble -->
            <div v-if="loading" class="d-flex justify-content-start mb-2">
              <div class="px-3 py-2 rounded-3" style="background:#fff;border:1px solid #eee;border-radius:14px 14px 14px 4px;">
                <div class="d-flex gap-1">
                  <span class="dot-pulse" style="width:6px;height:6px;background:#aaa;border-radius:50%;animation:dotPulse 1.2s infinite;"></span>
                  <span class="dot-pulse" style="width:6px;height:6px;background:#aaa;border-radius:50%;animation:dotPulse 1.2s .2s infinite;"></span>
                  <span class="dot-pulse" style="width:6px;height:6px;background:#aaa;border-radius:50%;animation:dotPulse 1.2s .4s infinite;"></span>
                </div>
              </div>
            </div>
          </div>

          <!-- Error -->
          <div v-if="error" class="px-3 py-2 bg-danger-subtle text-danger small border-top">{{ error }}</div>

          <!-- Input -->
          <div class="p-2 border-top d-flex gap-2 align-items-end" style="background:#fff;">
            <textarea
              v-model="input"
              class="form-control form-control-sm"
              placeholder="Ask anything about treks…"
              rows="1"
              style="resize:none;font-size:0.83rem;border-radius:8px;max-height:80px;"
              @keydown.enter.exact.prevent="send"
              @input="autoResize"
              ref="inputEl"
              :disabled="loading"
            ></textarea>
            <button class="btn btn-ridge btn-sm flex-shrink-0" @click="send" :disabled="!input.trim() || loading"
                    style="height:34px;width:34px;padding:0;border-radius:8px;">
              <i class="bi bi-send-fill" style="font-size:0.8rem;"></i>
            </button>
          </div>
        </div>

        <!-- CSS for dot animation -->
        <style>
          @keyframes dotPulse {
            0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
            40% { opacity: 1; transform: scale(1); }
          }
        </style>
      </div>
    `,
    computed: {
      quickQuestions() {
        return [
          "Best trek for beginners?",
          "What to pack for high altitude?",
          "Which trek has snow?",
        ];
      },
    },
    methods: {
      toggleChat() {
        this.open = !this.open;
        if (this.open) this.$nextTick(() => this.$refs.inputEl?.focus());
      },
      sendQuick(q) {
        this.input = q;
        this.send();
      },
      autoResize(e) {
        e.target.style.height = "auto";
        e.target.style.height = Math.min(e.target.scrollHeight, 80) + "px";
      },
      async send() {
        const text = this.input.trim();
        if (!text || this.loading) return;
        this.input = "";
        this.error = "";
        this.messages.push({ role: "user", content: text });
        this.$nextTick(() => this.scrollBottom());

        this.loading = true;
        try {
          const result = await api.aiChat(
            this.messages.map(m => ({ role: m.role, content: m.content }))
          );
          this.messages.push({ role: "assistant", content: result.reply });
          this.$nextTick(() => this.scrollBottom());
        } catch (e) {
          this.error = e?.response?.data?.detail || "Could not reach AI. Please try again.";
          // Remove the user message that failed so they can retry
          this.messages.pop();
        } finally {
          this.loading = false;
        }
      },
      scrollBottom() {
        const box = this.$refs.msgBox;
        if (box) box.scrollTop = box.scrollHeight;
      },
    },
  };

  global.AiChat = AiChat;
})(window);

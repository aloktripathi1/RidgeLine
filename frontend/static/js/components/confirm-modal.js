/* Generic confirm modal (destructive actions). Controlled via prop+events. */
window.ConfirmModal = {
  props: ["title", "body", "confirmLabel", "variant"],
  emits: ["confirm"],
  template: /*html*/`
    <div class="modal fade" id="confirmModal" tabindex="-1" aria-hidden="true" ref="root">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow">
          <div class="modal-header border-0 pb-0">
            <h5 class="modal-title display-serif">{{ title || 'Are you sure?' }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body pt-2">
            <p class="mb-0 text-body-secondary" style="text-wrap:pretty;">{{ body }}</p>
          </div>
          <div class="modal-footer border-0">
            <button class="btn btn-link text-muted" data-bs-dismiss="modal">Cancel</button>
            <button class="btn" :class="'btn-' + (variant || 'danger')" @click="$emit('confirm')" data-bs-dismiss="modal">
              {{ confirmLabel || 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
};

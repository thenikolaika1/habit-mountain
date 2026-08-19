// Minimal reusable bottom-sheet modal. No dialog element dependency (wider
// browser/PWA-webview compatibility) — just a fixed-position backdrop + sheet.

let activeModal = null;

export function openModal({ title, bodyHtml, onMount, onClose }) {
  closeModal();

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";

  const sheet = document.createElement("div");
  sheet.className = "modal-sheet";
  sheet.innerHTML = `
    <div class="modal-header">
      <h2>${title}</h2>
      <button type="button" class="modal-close" aria-label="Закрыть">✕</button>
    </div>
    <div class="modal-body">${bodyHtml}</div>
  `;

  backdrop.appendChild(sheet);
  document.body.appendChild(backdrop);
  document.body.style.overflow = "hidden";

  const close = () => {
    document.body.style.overflow = "";
    backdrop.remove();
    document.removeEventListener("keydown", onKeydown);
    if (activeModal === controller) activeModal = null;
    if (onClose) onClose();
  };

  const onKeydown = (e) => {
    if (e.key === "Escape") close();
  };

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  sheet.querySelector(".modal-close").addEventListener("click", close);
  document.addEventListener("keydown", onKeydown);

  const controller = { close, sheet, backdrop };
  activeModal = controller;

  if (onMount) onMount(sheet, close);

  return controller;
}

export function closeModal() {
  if (activeModal) activeModal.close();
}

/**
 * A confirm/cancel dialog built on the same in-app modal, instead of the
 * browser's native window.confirm() — which is silently blocked (calling
 * it does nothing, no dialog, no return value change) inside a sandboxed
 * iframe without allow-modals, e.g. an embedded preview. This always
 * works, and matches the app's own styling.
 */
export function openConfirm({ title = "Подтвердите действие", message, confirmLabel = "Подтвердить", cancelLabel = "Отмена", danger = false, onConfirm }) {
  return openModal({
    title,
    bodyHtml: `
      <p class="modal-message">${message}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn-block" id="confirm-cancel">${cancelLabel}</button>
        <button type="button" class="btn ${danger ? "btn-danger" : "btn-primary"} btn-block" id="confirm-ok">${confirmLabel}</button>
      </div>
    `,
    onMount: (sheet, close) => {
      sheet.querySelector("#confirm-cancel").addEventListener("click", close);
      sheet.querySelector("#confirm-ok").addEventListener("click", () => {
        close();
        onConfirm();
      });
    },
  });
}

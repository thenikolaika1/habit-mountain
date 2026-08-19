let hideTimer = null;

export function showToast(message) {
  let toast = document.getElementById("app-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "app-toast";
    toast.className = "app-toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;

  // Remove -> reflow -> re-add so back-to-back toasts (e.g. two achievements
  // unlocked in quick succession) replay the pop-in transition each time,
  // instead of silently staying in the already-visible state.
  toast.classList.remove("is-visible");
  void toast.offsetWidth;
  requestAnimationFrame(() => {
    toast.classList.add("is-visible");
  });

  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2600);
}

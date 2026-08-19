let hideTimer = null;

export function showToast(message) {
  let toast = document.getElementById("app-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "app-toast";
    toast.style.position = "fixed";
    toast.style.left = "50%";
    toast.style.bottom = "calc(var(--tabbar-height) + env(safe-area-inset-bottom) + 16px)";
    toast.style.transform = "translateX(-50%) translateY(12px)";
    toast.style.background = "var(--color-accent-dark)";
    toast.style.color = "var(--color-accent-contrast)";
    toast.style.padding = "12px 18px";
    toast.style.borderRadius = "999px";
    toast.style.fontWeight = "700";
    toast.style.fontSize = "14px";
    toast.style.boxShadow = "var(--shadow-md)";
    toast.style.zIndex = "200";
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.25s ease, transform 0.25s ease";
    toast.style.maxWidth = "90vw";
    toast.style.textAlign = "center";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateX(-50%) translateY(0)";
  });

  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(12px)";
  }, 2600);
}

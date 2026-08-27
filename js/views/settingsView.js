import { loadState, saveState } from "../state/storage.js";
import { openConfirm } from "../components/modal.js";
import { showToast } from "../components/toast.js";
import { UNITS, UNIT_ICONS } from "../logic/units.js";
import { gearIllustration, iconTheme, iconUnit, iconBell, iconDownload, iconTrash, iconInfo, iconChevronDown } from "../illustrations.js";

const APP_VERSION = "2.0";

function updateSettings(patch) {
  const state = loadState();
  Object.assign(state.meta.settings, patch);
  saveState(state);
}

export function renderSettingsView(container) {
  const { settings } = loadState().meta;

  container.innerHTML = `
    <section class="view">
      <div class="view-header">
        <h1>Настройки</h1>
      </div>

      <div class="illustration-frame illustration-frame--accent">${gearIllustration()}</div>

      <h3 class="section-heading">Оформление</h3>
      <div class="card settings-row">
        <span class="settings-row-icon">${iconTheme()}</span>
        <div class="settings-row-label">
          <div class="settings-row-title">Тема</div>
          <div class="settings-row-desc">Светлая, тёмная или как в системе</div>
        </div>
        <div class="segmented settings-theme-picker" id="theme-picker">
          <button type="button" data-value="light" class="${settings.theme === "light" ? "is-active" : ""}">Светлая</button>
          <button type="button" data-value="system" class="${settings.theme === "system" ? "is-active" : ""}">Авто</button>
          <button type="button" data-value="dark" class="${settings.theme === "dark" ? "is-active" : ""}">Тёмная</button>
        </div>
      </div>

      <h3 class="section-heading">Привычки</h3>
      <div class="card settings-row">
        <span class="settings-row-icon">${iconUnit()}</span>
        <div class="settings-row-label">
          <div class="settings-row-title">Единица измерения по умолчанию</div>
          <div class="settings-row-desc">Подставляется в форму новой числовой привычки</div>
        </div>
        <div class="settings-dropdown" id="default-unit-dropdown">
          <button type="button" class="settings-dropdown-trigger" id="default-unit-trigger" aria-haspopup="listbox" aria-expanded="false">
            <span class="settings-dropdown-trigger-icon">${UNIT_ICONS[settings.defaultUnit] || ""}</span>
            <span class="settings-dropdown-trigger-label">${settings.defaultUnit}</span>
            <span class="settings-dropdown-chevron">${iconChevronDown()}</span>
          </button>
          <div class="settings-dropdown-menu" id="default-unit-menu" role="listbox" hidden>
            ${UNITS.map(
              (u) => `
              <button type="button" role="option" class="settings-dropdown-option${u === settings.defaultUnit ? " is-selected" : ""}" data-value="${u}" aria-selected="${u === settings.defaultUnit}">
                <span class="settings-dropdown-option-icon">${UNIT_ICONS[u] || ""}</span>
                <span class="settings-dropdown-option-label">${u}</span>
              </button>`
            ).join("")}
          </div>
        </div>
      </div>

      <h3 class="section-heading">Уведомления</h3>
      <div class="card settings-row">
        <span class="settings-row-icon">${iconBell()}</span>
        <div class="settings-row-label">
          <div class="settings-row-title">Напоминания</div>
          <div class="settings-row-desc">Приложение без сервера — фоновые пуш-напоминания недоступны, но можно включить локальное уведомление-подтверждение</div>
        </div>
        <button type="button" class="settings-toggle ${settings.notificationsEnabled ? "is-on" : ""}" id="notifications-toggle" aria-pressed="${settings.notificationsEnabled}">
          <span class="settings-toggle-knob"></span>
        </button>
      </div>

      <h3 class="section-heading">Данные</h3>
      <div class="card settings-row">
        <span class="settings-row-icon">${iconDownload()}</span>
        <div class="settings-row-label">
          <div class="settings-row-title">Экспорт данных</div>
          <div class="settings-row-desc">Скачать все привычки и отметки в файле .json</div>
        </div>
        <button type="button" class="btn" id="export-data-btn">Скачать</button>
      </div>

      <div class="card settings-row settings-row-danger">
        <span class="settings-row-icon settings-row-icon--danger">${iconTrash()}</span>
        <div class="settings-row-label">
          <div class="settings-row-title">Сбросить аккаунт</div>
          <div class="settings-row-desc">Удаляет все привычки, отметки, ачивки и испытания без возможности восстановления</div>
        </div>
        <button type="button" class="btn btn-danger" id="reset-account-btn">Сбросить</button>
      </div>

      <h3 class="section-heading">О приложении</h3>
      <div class="card settings-row">
        <span class="settings-row-icon">${iconInfo()}</span>
        <div class="settings-about-text">
          <p class="modal-message">Habit Mountain ${APP_VERSION} — трекер привычек с горой прогресса, испытаниями и достижениями. Данные хранятся только на этом устройстве (localStorage), приложение работает офлайн и устанавливается как обычное приложение.</p>
          <p class="settings-about-credit">Приложение разработано Капустиным Николаем</p>
        </div>
      </div>
    </section>
  `;

  wireSettings(container);
}

function wireSettings(container) {
  container.querySelectorAll("#theme-picker button").forEach((btn) => {
    btn.addEventListener("click", () => updateSettings({ theme: btn.dataset.value }));
  });

  wireUnitDropdown(container);

  container.querySelector("#notifications-toggle").addEventListener("click", async () => {
    const state = loadState();
    const turningOn = !state.meta.settings.notificationsEnabled;
    if (turningOn && "Notification" in window) {
      const permission = await Notification.requestPermission().catch(() => "denied");
      if (permission === "granted") {
        new Notification("Habit Mountain", { body: "Напоминания включены — так будет выглядеть уведомление." });
      } else {
        showToast("Уведомления заблокированы в браузере");
        return;
      }
    }
    updateSettings({ notificationsEnabled: turningOn });
  });

  container.querySelector("#export-data-btn").addEventListener("click", () => {
    const state = loadState();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `habit-mountain-export-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Данные экспортированы");
  });

  container.querySelector("#reset-account-btn").addEventListener("click", () => {
    openConfirm({
      title: "Сбросить аккаунт?",
      message: "Все привычки, отметки, ачивки и испытания будут удалены безвозвратно. Это нельзя отменить.",
      confirmLabel: "Сбросить",
      danger: true,
      onConfirm: () => {
        localStorage.clear();
        location.reload();
      },
    });
  });
}

// Custom listbox replacing a native <select> — a native select's own popup
// is drawn by the browser/OS (its highlight color, corner radius, etc. are
// entirely outside CSS's reach), so matching the app's rounded/soft-shadow/
// green-accent style requires a real custom widget instead.
function wireUnitDropdown(container) {
  const dropdown = container.querySelector("#default-unit-dropdown");
  const trigger = container.querySelector("#default-unit-trigger");
  const menu = container.querySelector("#default-unit-menu");

  // Attached to `document` only while the menu is open, and always removed
  // the instant it closes (whichever of the paths below does the closing).
  // renderSettingsView() rebuilds this whole subtree from scratch on every
  // state change (subscribe(render) in app.js), so a listener left
  // dangling on `document` across a render would never get cleaned up —
  // one more piling up on every single unit selection.
  let outsideClickHandler = null;

  const close = () => {
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    dropdown.classList.remove("is-open");
    if (outsideClickHandler) {
      document.removeEventListener("click", outsideClickHandler);
      outsideClickHandler = null;
    }
  };

  const open = () => {
    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    dropdown.classList.add("is-open");
    outsideClickHandler = (e) => {
      if (!dropdown.contains(e.target)) close();
    };
    document.addEventListener("click", outsideClickHandler);
  };

  // stopPropagation keeps this same click from immediately reaching the
  // outsideClickHandler just registered above and closing the menu it was
  // meant to open.
  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    if (menu.hidden) open();
    else close();
  });

  trigger.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  menu.querySelectorAll(".settings-dropdown-option").forEach((opt) => {
    opt.addEventListener("click", () => {
      updateSettings({ defaultUnit: opt.dataset.value });
      close();
    });
  });
}

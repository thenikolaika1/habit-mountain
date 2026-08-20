import { loadState, saveState } from "../state/storage.js";
import { openConfirm } from "../components/modal.js";
import { showToast } from "../components/toast.js";
import { UNITS } from "../logic/units.js";
import { gearIllustration, iconTheme, iconUnit, iconBell, iconDownload, iconTrash, iconInfo } from "../illustrations.js";

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

      <div class="illustration-frame">${gearIllustration()}</div>

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
        <select class="settings-select" id="default-unit-select">
          ${UNITS.map((u) => `<option value="${u}" ${u === settings.defaultUnit ? "selected" : ""}>${u}</option>`).join("")}
        </select>
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
        <p class="modal-message">Habit Mountain ${APP_VERSION} — трекер привычек с горой прогресса, испытаниями и достижениями. Данные хранятся только на этом устройстве (localStorage), приложение работает офлайн и устанавливается как обычное приложение.</p>
      </div>
    </section>
  `;

  wireSettings(container);
}

function wireSettings(container) {
  container.querySelectorAll("#theme-picker button").forEach((btn) => {
    btn.addEventListener("click", () => updateSettings({ theme: btn.dataset.value }));
  });

  container.querySelector("#default-unit-select").addEventListener("change", (e) => {
    updateSettings({ defaultUnit: e.target.value });
  });

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

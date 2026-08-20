import { getHabits, addHabit, updateHabit, archiveHabit, deleteHabitPermanently, PALETTE, EMOJI_CHOICES } from "../state/habits.js";
import { getEntriesForHabit } from "../state/entries.js";
import { computeCurrentStreak } from "../logic/streaks.js";
import { openModal, closeModal, openConfirm } from "../components/modal.js";
import { UNITS } from "../logic/units.js";
import { loadState } from "../state/storage.js";
import { sproutIllustration } from "../illustrations.js";

const POPULAR_HABITS = [
  { name: "Пить воду", type: "boolean", icon: "💧", color: "#3a7bd5" },
  { name: "Читать", type: "boolean", icon: "📚", color: "#7a5cd6" },
  { name: "Медитация", type: "boolean", icon: "🧘", color: "#2aa7a0" },
  { name: "Отжимания", type: "numeric", icon: "💪", color: "#c94f4f", unit: "раз" },
  { name: "Сон 8 часов", type: "boolean", icon: "🛌", color: "#2f9e6e" },
  { name: "Прогулка", type: "numeric", icon: "🏃", color: "#d9822b", unit: "км" },
];

export function renderHabitsView(container) {
  const habits = getHabits();

  container.innerHTML = `
    <section class="view">
      <div class="view-header">
        <h1>Привычки</h1>
      </div>

      <div class="field habit-search-field">
        <input type="search" id="habit-search" placeholder="Найти привычку" />
      </div>

      <div id="habits-list-section">${habits.length === 0 ? emptyStateHtml() : habitsListHtml(habits)}</div>

      <h3 class="section-heading">Популярные привычки</h3>
      <div class="popular-habits-grid">${popularHabitsHtml()}</div>
    </section>
    <button type="button" class="fab" id="add-habit-fab" aria-label="Добавить привычку">+</button>
  `;

  wireHabitsList(container, habits);

  container.querySelector("#habit-search").addEventListener("input", (e) => {
    const query = e.target.value.trim().toLowerCase();
    const filtered = query ? habits.filter((h) => h.name.toLowerCase().includes(query)) : habits;
    const listSection = container.querySelector("#habits-list-section");
    listSection.innerHTML =
      filtered.length === 0
        ? query
          ? `<div class="empty-state card"><p>Ничего не нашлось по запросу «${escapeHtml(e.target.value.trim())}».</p></div>`
          : emptyStateHtml()
        : habitsListHtml(filtered);
    wireHabitsList(container, filtered);
  });

  container.querySelectorAll(".popular-habit-add").forEach((btn) => {
    btn.addEventListener("click", () => {
      const preset = POPULAR_HABITS[Number(btn.dataset.index)];
      addHabit(preset);
    });
  });

  container.querySelector("#add-habit-fab").addEventListener("click", () => openAddHabitModal());
}

function wireHabitsList(container, habits) {
  container.querySelectorAll(".habit-card").forEach((card) => {
    const open = () => {
      location.hash = `#/habits/${card.dataset.habitId}`;
    };
    card.addEventListener("click", (e) => {
      if (e.target.closest("[data-action='edit']")) return;
      open();
    });
    card.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && !e.target.closest("[data-action='edit']")) {
        e.preventDefault();
        open();
      }
    });
    const editBtn = card.querySelector("[data-action='edit']");
    if (editBtn) {
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openEditHabitModal(card.dataset.habitId);
      });
    }
  });
}

function emptyStateHtml() {
  return `
    <div class="empty-state card">
      ${sproutIllustration()}
      <p>Привычек пока нет. Нажмите «+», чтобы добавить первую — простую (галочка) или числовую.</p>
    </div>`;
}

function popularHabitsHtml() {
  return POPULAR_HABITS.map(
    (p, i) => `
      <button type="button" class="popular-habit-add" data-index="${i}">
        <span class="popular-habit-avatar" style="background:${p.color}">${p.icon}</span>
        <span class="popular-habit-name">${escapeHtml(p.name)}</span>
        <span class="popular-habit-plus">+</span>
      </button>`
  ).join("");
}

function habitsListHtml(habits) {
  const items = habits
    .map((habit) => {
      const entries = getEntriesForHabit(habit.id);
      const streak = computeCurrentStreak(habit, entries);
      const meta =
        habit.type === "numeric"
          ? `Числовая${habit.unit ? " · " + escapeHtml(habit.unit) : ""}`
          : "Простая · галочка";
      return `
        <li>
          <div class="habit-card" role="button" tabindex="0" data-habit-id="${habit.id}">
            <span class="habit-avatar" style="background:${habit.color}">${habit.icon || ""}</span>
            <span class="habit-card-body">
              <span class="habit-card-title">${escapeHtml(habit.name)}</span>
              <span class="habit-card-meta">${meta}${streak > 0 ? ` · 🔥 ${streak}` : ""}</span>
            </span>
            <button type="button" class="modal-close" data-action="edit" aria-label="Изменить привычку" style="width:28px;height:28px;font-size:13px;">✏️</button>
            <span class="habit-card-chevron">›</span>
          </div>
        </li>`;
    })
    .join("");
  return `<ul class="habit-list">${items}</ul>`;
}

function habitFormHtml(habit) {
  const type = habit?.type || "boolean";
  const icon = habit?.icon || EMOJI_CHOICES[0];
  const color = habit?.color || PALETTE[0];
  const defaultUnit = loadState().meta.settings.defaultUnit;
  const unit = habit?.unit || defaultUnit;

  return `
    <form id="habit-form">
      <div class="field">
        <label for="habit-name">Название</label>
        <input type="text" id="habit-name" required maxlength="60" value="${habit ? escapeHtml(habit.name) : ""}" placeholder="Например, Отжимания" />
      </div>

      <div class="field">
        <label>Иконка</label>
        <div class="emoji-picker" id="habit-icon-picker">
          ${EMOJI_CHOICES.map((e) => `<button type="button" class="emoji-picker-item ${e === icon ? "is-active" : ""}" data-value="${e}">${e}</button>`).join("")}
        </div>
      </div>

      <div class="field">
        <label>Цвет</label>
        <div class="color-picker" id="habit-color-picker">
          ${PALETTE.map((c) => `<button type="button" class="color-picker-item ${c === color ? "is-active" : ""}" data-value="${c}" style="background:${c}" aria-label="Выбрать цвет"></button>`).join("")}
        </div>
      </div>

      <div class="field">
        <label>Тип привычки</label>
        <div class="segmented" id="habit-type">
          <button type="button" data-value="boolean" class="${type === "boolean" ? "is-active" : ""}">Простая ✓</button>
          <button type="button" data-value="numeric" class="${type === "numeric" ? "is-active" : ""}">Числовая #</button>
        </div>
      </div>
      <div class="field" id="habit-unit-field" style="display:${type === "numeric" ? "block" : "none"}">
        <label for="habit-unit">Единица измерения</label>
        <select id="habit-unit">
          ${UNITS.map((u) => `<option value="${u}" ${u === unit ? "selected" : ""}>${u}</option>`).join("")}
        </select>
      </div>
      <div class="modal-actions">
        <button type="submit" class="btn btn-primary btn-block">${habit ? "Сохранить" : "Добавить привычку"}</button>
      </div>
      ${
        habit
          ? `<div class="modal-actions">
              <button type="button" id="habit-archive" class="btn btn-block">Архивировать</button>
              <button type="button" id="habit-delete" class="btn btn-danger btn-block">Удалить</button>
            </div>`
          : ""
      }
    </form>`;
}

function wireHabitForm(sheet, close, { habit } = {}) {
  let currentType = habit?.type || "boolean";
  let currentIcon = habit?.icon || EMOJI_CHOICES[0];
  let currentColor = habit?.color || PALETTE[0];
  const typeGroup = sheet.querySelector("#habit-type");
  const unitField = sheet.querySelector("#habit-unit-field");
  const iconPicker = sheet.querySelector("#habit-icon-picker");
  const colorPicker = sheet.querySelector("#habit-color-picker");

  typeGroup.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentType = btn.dataset.value;
      typeGroup.querySelectorAll("button").forEach((b) => b.classList.toggle("is-active", b === btn));
      unitField.style.display = currentType === "numeric" ? "block" : "none";
    });
  });

  iconPicker.querySelectorAll(".emoji-picker-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentIcon = btn.dataset.value;
      iconPicker.querySelectorAll(".emoji-picker-item").forEach((b) => b.classList.toggle("is-active", b === btn));
    });
  });

  colorPicker.querySelectorAll(".color-picker-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentColor = btn.dataset.value;
      colorPicker.querySelectorAll(".color-picker-item").forEach((b) => b.classList.toggle("is-active", b === btn));
    });
  });

  sheet.querySelector("#habit-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = sheet.querySelector("#habit-name").value.trim();
    if (!name) return;
    const unitSelect = sheet.querySelector("#habit-unit");
    const unit = unitSelect ? unitSelect.value : "";

    if (habit) {
      updateHabit(habit.id, {
        name,
        type: currentType,
        unit: currentType === "numeric" ? unit : "",
        icon: currentIcon,
        color: currentColor,
      });
    } else {
      addHabit({ name, type: currentType, unit, icon: currentIcon, color: currentColor });
    }
    close();
  });

  if (habit) {
    sheet.querySelector("#habit-archive").addEventListener("click", () => {
      archiveHabit(habit.id);
      close();
    });
    sheet.querySelector("#habit-delete").addEventListener("click", () => {
      openConfirm({
        title: "Удалить привычку?",
        message: `Привычка «${escapeHtml(habit.name)}» и вся её история будут удалены безвозвратно. Это нельзя отменить.`,
        confirmLabel: "Удалить",
        danger: true,
        onConfirm: () => {
          deleteHabitPermanently(habit.id);
        },
      });
    });
  }
}

export function openAddHabitModal() {
  openModal({
    title: "Новая привычка",
    bodyHtml: habitFormHtml(null),
    onMount: (sheet, close) => wireHabitForm(sheet, close, {}),
  });
}

function openEditHabitModal(habitId) {
  const habits = getHabits({ includeArchived: true });
  const habit = habits.find((h) => h.id === habitId);
  if (!habit) return;
  openModal({
    title: "Изменить привычку",
    bodyHtml: habitFormHtml(habit),
    onMount: (sheet, close) => wireHabitForm(sheet, close, { habit }),
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

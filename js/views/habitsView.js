import { getHabits, addHabit, updateHabit, archiveHabit, deleteHabitPermanently } from "../state/habits.js";
import { getEntriesForHabit } from "../state/entries.js";
import { computeCurrentStreak } from "../logic/streaks.js";
import { openModal, closeModal, openConfirm } from "../components/modal.js";
import { UNITS, UNIT_ICONS } from "../logic/units.js";
import { loadState } from "../state/storage.js";
import { sproutIllustration, statusRing, heroIllustrationForHabit, wirePhotoFallback, iconSearch } from "../illustrations.js";
import { isDayComplete } from "../logic/completion.js";
import { todayKey } from "../logic/dateUtils.js";

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
        <div class="habits-title">
          <h1>Привычки</h1>
        </div>
      </div>

      <div class="field habit-search-field">
        ${iconSearch()}
        <input type="search" id="habit-search" placeholder="Найти привычку" />
      </div>

      <div id="habits-list-section">${habits.length === 0 ? emptyStateHtml() : habitsListHtml(habits)}</div>

      <h3 class="section-heading">Популярные привычки</h3>
      <div class="popular-habits-row">${popularHabitsHtml()}</div>
    </section>
    <button type="button" class="fab" id="add-habit-fab" aria-label="Добавить привычку">+</button>
  `;

  wireHabitsList(container, habits);
  wirePhotoFallback(container);

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
    wirePhotoFallback(listSection);
  });

  container.querySelectorAll(".popular-habit-card").forEach((btn) => {
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
      <button type="button" class="popular-habit-card" data-index="${i}">
        ${heroIllustrationForHabit(p)}
        <span class="popular-habit-card-plus" aria-hidden="true">+</span>
        <span class="popular-habit-card-scrim">
          <span class="popular-habit-card-name">${escapeHtml(p.name)}</span>
        </span>
      </button>`
  ).join("");
}

function habitsListHtml(habits) {
  const tKey = todayKey();
  const items = habits
    .map((habit) => {
      const entries = getEntriesForHabit(habit.id);
      const streak = computeCurrentStreak(habit, entries);
      const meta =
        habit.type === "numeric"
          ? `Числовая${habit.unit ? " · " + escapeHtml(habit.unit) : ""}`
          : "Простая · галочка";
      const doneToday = isDayComplete(habit, entries[tKey]);
      return `
        <li>
          <div class="habit-card media-card" role="button" tabindex="0" data-habit-id="${habit.id}">
            ${heroIllustrationForHabit(habit)}
            <button type="button" class="media-card-icon-btn" data-action="edit" aria-label="Изменить привычку">✏️</button>
            <span class="media-card-badge">${statusRing({ state: doneToday ? "done" : "empty", size: 34 })}</span>
            <div class="media-card-scrim">
              <div class="media-card-title">${escapeHtml(habit.name)}</div>
              <div class="media-card-meta">${meta}${streak > 0 ? ` · 🔥 ${streak}` : ""}</div>
            </div>
          </div>
        </li>`;
    })
    .join("");
  return `<ul class="habit-list">${items}</ul>`;
}

function habitFormHtml(habit) {
  const type = habit?.type || "boolean";
  const defaultUnit = loadState().meta.settings.defaultUnit;
  const unit = habit?.unit || defaultUnit;

  return `
    <form id="habit-form">
      <div class="field">
        <label for="habit-name">Название</label>
        <input type="text" id="habit-name" required maxlength="60" value="${habit ? escapeHtml(habit.name) : ""}" placeholder="Например, Отжимания" />
      </div>

      <div class="field">
        <label>Тип привычки</label>
        <div class="segmented" id="habit-type">
          <button type="button" data-value="boolean" class="${type === "boolean" ? "is-active" : ""}">Простая ✓</button>
          <button type="button" data-value="numeric" class="${type === "numeric" ? "is-active" : ""}">Числовая #</button>
        </div>
      </div>
      <div class="field" id="habit-unit-field" style="display:${type === "numeric" ? "block" : "none"}">
        <label>Единица измерения</label>
        <div class="unit-picker" id="habit-unit-picker">
          ${UNITS.map((u) => `<button type="button" class="unit-picker-item ${u === unit ? "is-active" : ""}" data-value="${u}"><span class="unit-picker-item-icon">${UNIT_ICONS[u] || ""}</span>${u}</button>`).join("")}
        </div>
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
  const defaultUnit = loadState().meta.settings.defaultUnit;
  let currentUnit = habit?.unit || defaultUnit;
  const typeGroup = sheet.querySelector("#habit-type");
  const unitField = sheet.querySelector("#habit-unit-field");
  const unitPicker = sheet.querySelector("#habit-unit-picker");

  typeGroup.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentType = btn.dataset.value;
      typeGroup.querySelectorAll("button").forEach((b) => b.classList.toggle("is-active", b === btn));
      unitField.style.display = currentType === "numeric" ? "block" : "none";
    });
  });

  unitPicker.querySelectorAll(".unit-picker-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentUnit = btn.dataset.value;
      unitPicker.querySelectorAll(".unit-picker-item").forEach((b) => b.classList.toggle("is-active", b === btn));
    });
  });

  sheet.querySelector("#habit-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = sheet.querySelector("#habit-name").value.trim();
    if (!name) return;

    if (habit) {
      updateHabit(habit.id, {
        name,
        type: currentType,
        unit: currentType === "numeric" ? currentUnit : "",
      });
    } else {
      addHabit({ name, type: currentType, unit: currentUnit });
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

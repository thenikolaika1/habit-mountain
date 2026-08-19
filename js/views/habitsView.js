import { getHabits, addHabit, updateHabit, archiveHabit, deleteHabitPermanently } from "../state/habits.js";
import { getEntriesForHabit } from "../state/entries.js";
import { computeCurrentStreak } from "../logic/streaks.js";
import { openModal, closeModal } from "../components/modal.js";

export function renderHabitsView(container) {
  const habits = getHabits();

  container.innerHTML = `
    <section class="view">
      <div class="view-header">
        <h1>Привычки</h1>
      </div>
      ${habits.length === 0 ? emptyStateHtml() : habitsListHtml(habits)}
    </section>
    <button type="button" class="fab" id="add-habit-fab" aria-label="Добавить привычку">+</button>
  `;

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

  container.querySelector("#add-habit-fab").addEventListener("click", () => openAddHabitModal());
}

function emptyStateHtml() {
  return `
    <div class="empty-state card">
      <span class="empty-emoji">🌱</span>
      <p>Привычек пока нет. Нажмите «+», чтобы добавить первую — простую (галочка) или числовую.</p>
    </div>`;
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
            <span class="habit-dot" style="background:${habit.color}"></span>
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
        <label for="habit-unit">Единица измерения</label>
        <input type="text" id="habit-unit" maxlength="20" value="${habit?.unit || ""}" placeholder="раз, стр., мин" />
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
  const typeGroup = sheet.querySelector("#habit-type");
  const unitField = sheet.querySelector("#habit-unit-field");

  typeGroup.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentType = btn.dataset.value;
      typeGroup.querySelectorAll("button").forEach((b) => b.classList.toggle("is-active", b === btn));
      unitField.style.display = currentType === "numeric" ? "block" : "none";
    });
  });

  sheet.querySelector("#habit-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = sheet.querySelector("#habit-name").value.trim();
    if (!name) return;
    const unit = sheet.querySelector("#habit-unit").value.trim();

    if (habit) {
      updateHabit(habit.id, { name, type: currentType, unit: currentType === "numeric" ? unit : "" });
    } else {
      addHabit({ name, type: currentType, unit });
    }
    close();
  });

  if (habit) {
    sheet.querySelector("#habit-archive").addEventListener("click", () => {
      archiveHabit(habit.id);
      close();
    });
    sheet.querySelector("#habit-delete").addEventListener("click", () => {
      if (confirm(`Удалить привычку «${habit.name}» вместе со всей историей? Это необратимо.`)) {
        deleteHabitPermanently(habit.id);
        close();
      }
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

import { iconMedal, iconHabits, iconProgress, iconAchievements, iconSettings } from "../illustrations.js";

const TABS = [
  { hash: "#/challenges", icon: iconMedal, label: "Испытания" },
  { hash: "#/habits", icon: iconHabits, label: "Привычки" },
  { hash: "#/progress", icon: iconProgress, label: "Прогресс" },
  { hash: "#/achievements", icon: iconAchievements, label: "Достижения" },
  { hash: "#/settings", icon: iconSettings, label: "Настройки" },
];

export function renderTabBar(activeHash) {
  const isActive = (hash) => activeHash === hash || (hash === "#/habits" && activeHash.startsWith("#/habits/"));

  return `
    <nav class="tabbar">
      <div class="tabbar-inner">
        ${TABS.map(
          (tab) => `
          <a class="tab-item ${isActive(tab.hash) ? "is-active" : ""}" href="${tab.hash}">
            <span class="tab-icon">${tab.icon()}</span>
            <span>${tab.label}</span>
          </a>`
        ).join("")}
      </div>
    </nav>`;
}

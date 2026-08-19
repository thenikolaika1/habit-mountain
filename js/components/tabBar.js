const TABS = [
  { hash: "#/mountain", icon: "🏔️", label: "Гора" },
  { hash: "#/habits", icon: "✅", label: "Привычки" },
  { hash: "#/achievements", icon: "🏆", label: "Ачивки" },
];

export function renderTabBar(activeHash) {
  const isActive = (hash) => activeHash === hash || (hash === "#/habits" && activeHash.startsWith("#/habits/"));

  return `
    <nav class="tabbar">
      <div class="tabbar-inner">
        ${TABS.map(
          (tab) => `
          <a class="tab-item ${isActive(tab.hash) ? "is-active" : ""}" href="${tab.hash}">
            <span class="tab-icon">${tab.icon}</span>
            <span>${tab.label}</span>
          </a>`
        ).join("")}
      </div>
    </nav>`;
}

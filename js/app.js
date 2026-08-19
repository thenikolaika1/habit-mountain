import { subscribe } from "./state/storage.js";
import { renderTabBar } from "./components/tabBar.js";
import { renderMountainView } from "./views/mountainView.js";
import { renderHabitsView } from "./views/habitsView.js";
import { renderCalendarView } from "./views/calendarView.js";
import { renderAchievementsView } from "./views/achievementsView.js";

const viewContainer = document.getElementById("view-container");
const tabbarContainer = document.getElementById("tabbar-container");

function parseRoute(hash) {
  const clean = (hash || "#/mountain").replace(/^#/, "") || "/mountain";
  const parts = clean.split("/").filter(Boolean); // e.g. ['habits', 'hb_123']

  if (parts[0] === "habits" && parts[1]) {
    return { name: "habit-detail", habitId: parts[1] };
  }
  if (parts[0] === "habits") return { name: "habits" };
  if (parts[0] === "achievements") return { name: "achievements" };
  return { name: "mountain" };
}

function render() {
  const hash = location.hash || "#/mountain";
  const route = parseRoute(hash);

  tabbarContainer.innerHTML = renderTabBar(hash.startsWith("#") ? hash : `#${hash}`);

  switch (route.name) {
    case "habits":
      renderHabitsView(viewContainer);
      break;
    case "habit-detail":
      renderCalendarView(viewContainer, { habitId: route.habitId });
      break;
    case "achievements":
      renderAchievementsView(viewContainer);
      break;
    default:
      renderMountainView(viewContainer);
  }
}

window.addEventListener("hashchange", render);
subscribe(render);

if (!location.hash) location.hash = "#/mountain";
render();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((err) => {
      console.warn("Habit Mountain: service worker registration failed.", err);
    });
  });
}

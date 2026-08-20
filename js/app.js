import { subscribe, loadState } from "./state/storage.js";
import { renderTabBar } from "./components/tabBar.js";
import { renderMountainView } from "./views/mountainView.js";
import { renderHabitsView } from "./views/habitsView.js";
import { renderCalendarView } from "./views/calendarView.js";
import { renderAchievementsView } from "./views/achievementsView.js";
import { renderChallengesView } from "./views/challengesView.js";
import { renderSettingsView } from "./views/settingsView.js";
import { maybeShowMonthRecap } from "./components/monthRecap.js";
import { applyTheme } from "./logic/theme.js";

const viewContainer = document.getElementById("view-container");
const tabbarContainer = document.getElementById("tabbar-container");

function parseRoute(hash) {
  const clean = (hash || "#/progress").replace(/^#/, "") || "/progress";
  const parts = clean.split("/").filter(Boolean); // e.g. ['habits', 'hb_123']

  if (parts[0] === "habits" && parts[1]) {
    return { name: "habit-detail", habitId: parts[1] };
  }
  if (parts[0] === "habits") return { name: "habits" };
  if (parts[0] === "challenges") return { name: "challenges" };
  if (parts[0] === "achievements") return { name: "achievements" };
  if (parts[0] === "settings") return { name: "settings" };
  return { name: "progress" };
}

// Tracks which screen was showing last, so the fade-in transition only
// plays on an actual tab/screen switch — not on every data-driven
// re-render of the screen you're already looking at (subscribe(render)
// fires on every state change, most of which don't change the route).
let lastRouteKey = null;
let viewTransitionTimer = null;

function render() {
  applyTheme(loadState());

  const hash = location.hash || "#/progress";
  const route = parseRoute(hash);
  const routeKey = route.name + (route.habitId || "");

  tabbarContainer.innerHTML = renderTabBar(hash.startsWith("#") ? hash : `#${hash}`);

  switch (route.name) {
    case "challenges":
      renderChallengesView(viewContainer);
      break;
    case "habits":
      renderHabitsView(viewContainer);
      break;
    case "habit-detail":
      renderCalendarView(viewContainer, { habitId: route.habitId });
      break;
    case "achievements":
      renderAchievementsView(viewContainer);
      break;
    case "settings":
      renderSettingsView(viewContainer);
      break;
    default:
      renderMountainView(viewContainer);
  }

  if (routeKey !== lastRouteKey) {
    lastRouteKey = routeKey;
    // Restart the CSS keyframe animation (remove -> reflow -> re-add) so it
    // reliably replays even if the class was already present from before.
    viewContainer.classList.remove("view-transition");
    void viewContainer.offsetWidth;
    viewContainer.classList.add("view-transition");
    // Every view's own render function replaces .view wholesale on every
    // re-render, not just on navigation (subscribe(render) fires on any
    // state change). If view-transition stayed on #view-container, each of
    // those unrelated re-renders would create a brand-new .view element
    // while the ancestor class still matches, replaying the fade every
    // time data changes rather than only on an actual screen switch. So
    // the class is only kept around for the duration of the animation
    // itself, then removed — leaving it absent in the (much more common)
    // steady state between navigations. A fixed timeout (not the first
    // "animationend") because the entrance is now a per-child stagger
    // (see view-fade-in in base.css) — many elements animate, each firing
    // its own animationend at a different time, and removing the class on
    // the first one to finish would abruptly cut off the ones still
    // mid-stagger. 500ms comfortably covers the worst case (160ms max
    // delay + 320ms duration = 480ms).
    clearTimeout(viewTransitionTimer);
    viewTransitionTimer = setTimeout(() => viewContainer.classList.remove("view-transition"), 500);
  }
}

window.addEventListener("hashchange", render);
subscribe(render);

if (!location.hash) location.hash = "#/progress";
render();

// Runs once per app boot (not on every re-render) — shows a one-time recap
// of last month's mountain the first time the app is opened in a new
// calendar month, then marks that month as seen so it won't show again.
maybeShowMonthRecap();

// Registered right away rather than gated on window.load: `register()` is
// async and doesn't compete with rendering, and waiting for `load` ties SW
// registration to every subresource on the page finishing — including the
// non-critical Google Fonts stylesheet (see index.html), which would delay
// (or on a broken connection, indefinitely stall) this offline-critical
// step for a purely cosmetic one.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch((err) => {
    console.warn("Habit Mountain: service worker registration failed.", err);
  });
}

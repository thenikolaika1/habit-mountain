// Applies the user's theme preference (Settings) to the document. "system"
// leaves no data-theme attribute at all, so css/variables.css's
// @media (prefers-color-scheme: dark) block alone decides — an explicit
// "light" or "dark" choice stamps the attribute, which the matching
// :root[data-theme="..."] blocks in variables.css then override with.
export function applyTheme(state) {
  const theme = state?.meta?.settings?.theme;
  if (theme === "light" || theme === "dark") {
    document.documentElement.dataset.theme = theme;
  } else {
    delete document.documentElement.dataset.theme;
  }
}

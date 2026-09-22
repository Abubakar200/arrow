export function createNavigation(screens, topBar) {
  function show(name) {
    Object.values(screens).forEach((screen) => screen.classList.remove("active"));
    screens[name].classList.add("active");
    topBar.classList.toggle("hidden", name !== "game");
  }

  return { show };
}

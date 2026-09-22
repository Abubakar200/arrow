const STORAGE_KEY = "arrow_art_v3";

export function loadState() {
  try {
    const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      solved: state.solved || {},
      coins: state.coins || 0,
      hints: state.hints === undefined ? 5 : state.hints,
      sound: state.sound !== false,
      streak: state.streak || 0,
      lastDay: state.lastDay || "",
      week: state.week || [],
      bestCombo: state.bestCombo || 0,
    };
  } catch (error) {
    return {
      solved: {},
      coins: 0,
      hints: 5,
      sound: true,
      streak: 0,
      lastDay: "",
      week: [],
      bestCombo: 0,
    };
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

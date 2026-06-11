import { create } from "zustand";
import i18n from "../i18n/config";

const savedTheme = localStorage.getItem("soundwave_theme") || "dark";
const savedFont = parseFloat(localStorage.getItem("soundwave_font_scale") || "1");
const savedContrast = localStorage.getItem("soundwave_high_contrast") === "true";
const savedLang = localStorage.getItem("soundwave_lang") || "en";

export function applyTheme(theme, highContrast, fontScale) {
  const root = document.documentElement;
  root.dataset.theme = highContrast ? "high-contrast" : theme;
  root.style.fontSize = `${fontScale * 100}%`;
  localStorage.setItem("soundwave_theme", theme);
  localStorage.setItem("soundwave_font_scale", String(fontScale));
  localStorage.setItem("soundwave_high_contrast", String(highContrast));
}

applyTheme(savedTheme, savedContrast, savedFont);
document.documentElement.lang = savedLang;

export const usePreferencesStore = create((set, getState) => ({
  theme: savedTheme,
  highContrast: savedContrast,
  fontScale: savedFont,
  language: savedLang,

  setTheme: (theme) => {
    const { highContrast, fontScale } = getState();
    applyTheme(theme, highContrast, fontScale);
    set({ theme });
  },
  setHighContrast: (highContrast) => {
    const { theme, fontScale } = getState();
    applyTheme(theme, highContrast, fontScale);
    set({ highContrast });
  },
  setFontScale: (fontScale) => {
    const { theme, highContrast } = getState();
    applyTheme(theme, highContrast, fontScale);
    set({ fontScale });
  },
  setLanguage: (language) => {
    localStorage.setItem("soundwave_lang", language);
    document.documentElement.lang = language;
    i18n.changeLanguage(language);
    set({ language });
  },
  syncFromServer: (prefs) => {
    if (!prefs) return;
    const theme = prefs.theme || "dark";
    const highContrast = Boolean(prefs.high_contrast);
    const fontScale = prefs.font_scale || 1;
    applyTheme(theme, highContrast, fontScale);
    if (prefs.language) {
      localStorage.setItem("soundwave_lang", prefs.language);
      document.documentElement.lang = prefs.language;
      i18n.changeLanguage(prefs.language);
    }
    set({
      theme,
      highContrast,
      fontScale,
      language: prefs.language || getState().language,
    });
  },
  saveToServer: async () => {
    const { theme, highContrast, fontScale, language } = getState();
    const { apiPut } = await import("../utils/api");
    return apiPut("/workspace/preferences", {
      theme,
      high_contrast: highContrast,
      font_scale: fontScale,
      language,
    });
  },
}));

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Home, Compass, Library, Disc3, User, LogOut, Sparkles, Sun, Moon, Contrast } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { usePreferencesStore } from "../../store/usePreferencesStore";
import { apiPostNoBody } from "../../utils/api";

import Logo from "../ui/Logo";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "zh", label: "中文" },
  { code: "ar", label: "العربية" },
];

export default function AppLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isOffline = useAuthStore((s) => s.isOffline);
  const { theme, setTheme, highContrast, setHighContrast, language, setLanguage, saveToServer } = usePreferencesStore();

  const links = [
    { to: "/dashboard", label: t("common.dashboard"), icon: Home },
    { to: "/discover", label: t("common.discover"), icon: Compass },
    { to: "/library", label: t("common.library"), icon: Library },
    { to: "/player", label: t("common.player"), icon: Disc3 },
    { to: "/profile", label: t("common.profile"), icon: User },
  ];

  async function handleLogout() {
    try {
      await apiPostNoBody("/auth/logout");
    } catch {
      // Proceed with local logout if server is down.
    }
    logout();
    navigate("/login");
  }

  function cycleTheme() {
    if (highContrast) {
      setHighContrast(false);
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("light");
    } else if (theme === "light") {
      setHighContrast(true);
    } else {
      setTheme("dark");
    }
    if (isAuthenticated) saveToServer().catch(() => {});
  }

  async function handleLanguageChange(code) {
    setLanguage(code);
    if (isAuthenticated) {
      try {
        await saveToServer();
      } catch {
        // Local preference still applied.
      }
    }
  }

  const ThemeIcon = highContrast ? Contrast : theme === "light" ? Sun : Moon;

  return (
    <div className="relative min-h-screen">
      <div className="mesh-bg pointer-events-none" aria-hidden>
        <div className="mesh-orb mesh-orb-1 opacity-30" />
        <div className="mesh-orb mesh-orb-2 opacity-25" />
      </div>

      {/* Visual cue for the hidden sidebar */}
      {!isSidebarOpen && (
        <div className="fixed left-0 top-0 z-20 h-screen w-[2px] bg-gradient-to-b from-purple-500/20 via-pink-500/20 to-blue-500/20 opacity-30 shadow-[0_0_10px_rgba(168,85,247,0.3)] pointer-events-none" />
      )}

      {/* Hidden Hover Trigger Container */}
      <div
        className="fixed left-0 top-0 z-30 h-screen transition-all duration-300"
        style={{ width: isSidebarOpen ? "224px" : "16px" }}
        onMouseEnter={() => setIsSidebarOpen(true)}
        onMouseLeave={() => setIsSidebarOpen(false)}
      >
        <aside
          className={`app-sidebar glass-premium flex h-full w-52 sm:w-56 flex-col border-r border-gold/10 p-4 transition-transform duration-300 ease-out ${
            isSidebarOpen
              ? "translate-x-0 shadow-[0_0_50px_rgba(0,0,0,0.8)]"
              : "-translate-x-full border-r-transparent shadow-none"
          }`}
          role="navigation"
        >
          <Link to="/dashboard" className="flex items-center gap-2 mb-2">
            <Logo className="h-10" />
          </Link>
          <p className="mt-1 text-[10px] text-muted sm:text-xs uppercase tracking-[0.2em]">Neural AI Intelligence</p>

          <nav className="mt-8 flex flex-1 flex-col gap-1.5">
            <Link to="/" className={`nav-item rounded-xl transition-all duration-300 ${location.pathname === "/" ? "nav-item-active gold-border shadow-glow text-gold bg-gold/10" : "hover:bg-gold/5"}`}>
              <Sparkles size={18} className={location.pathname === "/" ? "text-gold" : ""} />
              Experience
            </Link>
            {links.map((item, index) => {
              const Icon = item.icon;
              const active = location.pathname === item.to;
              return (
                <motion.div key={item.to} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }}>
                  <Link to={item.to} className={`nav-item rounded-xl transition-all duration-300 ${active ? "nav-item-active gold-border shadow-glow text-gold bg-gold/10" : "hover:bg-gold/5"}`}>
                    <Icon size={18} className={active ? "text-gold" : ""} />
                    {item.label}
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          {isAuthenticated && (
            <button type="button" onClick={handleLogout} className="nav-item w-full text-left text-muted hover:text-pink">
              <LogOut size={18} />
              {t("common.logout")}
            </button>
          )}
        </aside>
      </div>

      <div className="app-content relative z-10 ml-0 min-h-screen transition-all duration-300">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-end gap-2 border-b border-white/5 bg-[var(--bg-void)]/90 px-4 py-2 backdrop-blur-md">
          {isOffline && (
            <span className="mr-auto rounded-full bg-gold/20 px-3 py-1 text-xs text-gold">Offline — showing cached data</span>
          )}
          <label className="sr-only" htmlFor="lang-select">Language</label>
          <select
            id="lang-select"
            className="theme-select rounded-lg px-2 py-1.5 text-sm"
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
          <button type="button" onClick={cycleTheme} className="theme-select rounded-lg p-2" aria-label="Toggle theme">
            <ThemeIcon size={18} />
          </button>
        </header>
        <main className="app-main min-w-0 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

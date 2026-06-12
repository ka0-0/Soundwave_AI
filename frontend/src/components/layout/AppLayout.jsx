import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Home, Compass, Library, Disc3, User, LogOut, Sparkles, Sun, Moon, Contrast, Menu, X } from "lucide-react";
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
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isOffline = useAuthStore((s) => s.isOffline);
  const { theme, setTheme, highContrast, setHighContrast, language, setLanguage, saveToServer } = usePreferencesStore();

  useEffect(() => {
    if (!isMobileDrawerOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsMobileDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileDrawerOpen]);

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
        <div className="hidden lg:block fixed left-0 top-0 z-20 h-screen w-[2px] bg-gradient-to-b from-purple-500/20 via-pink-500/20 to-blue-500/20 opacity-30 shadow-[0_0_10px_rgba(168,85,247,0.3)] pointer-events-none" />
      )}

      {/* Mobile Drawer Backdrop */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setIsMobileDrawerOpen(false)}
        />
      )}

      {/* Mobile Drawer Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 bg-[#0A0518]/95 border-r border-gold/10 p-4 transition-transform duration-300 ease-out transform lg:hidden flex flex-col ${
          isMobileDrawerOpen ? "translate-x-0 shadow-[0_0_50px_rgba(0,0,0,0.8)]" : "-translate-x-full border-r-transparent shadow-none"
        }`}
        role="navigation"
      >
        <div className="flex items-center justify-between mb-4">
          <Link to="/dashboard" className="flex items-center gap-2" onClick={() => setIsMobileDrawerOpen(false)}>
            <Logo className="h-10" />
          </Link>
          <button
            type="button"
            className="p-2 text-muted hover:text-white transition-colors focus:outline-none"
            style={{ width: 44, height: 44 }}
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-[10px] text-muted uppercase tracking-[0.2em]">Neural AI Intelligence</p>

        <nav className="mt-8 flex flex-1 flex-col gap-1.5">
          <Link to="/" className={`nav-item rounded-xl transition-all duration-300 ${location.pathname === "/" ? "nav-item-active gold-border shadow-glow text-gold bg-gold/10" : "hover:bg-gold/5"}`} onClick={() => setIsMobileDrawerOpen(false)}>
            <Sparkles size={18} className={location.pathname === "/" ? "text-gold" : ""} />
            Experience
          </Link>
          {links.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`nav-item rounded-xl transition-all duration-300 ${active ? "nav-item-active gold-border shadow-glow text-gold bg-gold/10" : "hover:bg-gold/5"}`}
                onClick={() => setIsMobileDrawerOpen(false)}
              >
                <Icon size={18} className={active ? "text-gold" : ""} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {isAuthenticated && (
          <button
            type="button"
            onClick={() => {
              setIsMobileDrawerOpen(false);
              handleLogout();
            }}
            className="nav-item w-full text-left text-muted hover:text-pink transition-colors mt-auto"
            style={{ minHeight: '44px' }}
          >
            <LogOut size={18} />
            {t("common.logout")}
          </button>
        )}
      </aside>

      {/* Hidden Hover Trigger Container (Desktop Only) */}
      <div
        className="hidden lg:block fixed left-0 top-0 z-30 h-screen transition-all duration-300"
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
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-white/5 bg-[var(--bg-void)]/90 px-4 py-2 backdrop-blur-md">
          {/* Mobile hamburger menu trigger */}
          <button
            type="button"
            className="lg:hidden flex items-center justify-center p-2 rounded-xl text-muted hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-gold/50"
            style={{ width: 44, height: 44 }}
            onClick={() => setIsMobileDrawerOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-2 ml-auto">
            {isOffline && (
              <span className="rounded-full bg-gold/20 px-3 py-1 text-xs text-gold">Offline — showing cached data</span>
            )}

            <button
              type="button"
              onClick={cycleTheme}
              className="theme-select rounded-lg p-2 flex items-center justify-center"
              style={{ width: 44, height: 44 }}
              aria-label="Toggle theme"
            >
              <ThemeIcon size={18} />
            </button>
          </div>
        </header>
        <main className="app-main min-w-0 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

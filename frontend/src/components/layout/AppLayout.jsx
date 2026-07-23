import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Home, Compass, Library, Disc3, User, LogOut, Sparkles, Sun, Moon, Contrast, Menu, X } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { usePreferencesStore } from "../../store/usePreferencesStore";
import { apiPostNoBody } from "../../utils/api";

import Logo from "../ui/Logo";
import MusicFooter from "./MusicFooter";

export default function AppLayout({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { theme, setTheme, highContrast, setHighContrast, saveToServer } = usePreferencesStore();

  useEffect(() => {
    // Close mobile menu on route change
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = origOverflow;
    };
  }, [isMobileMenuOpen]);

  const links = [
    { to: "/", label: "Experience", icon: Sparkles },
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

  const ThemeIcon = highContrast ? Contrast : theme === "light" ? Sun : Moon;

  return (
    <div className="relative min-h-screen flex flex-col bg-[#07051A] text-white">
      {/* Background Mesh Gradient */}
      <div className="mesh-bg pointer-events-none" aria-hidden>
        <div className="mesh-orb mesh-orb-1 opacity-50" />
        <div className="mesh-orb mesh-orb-2 opacity-35" />
        <div className="absolute top-0 left-0 w-[650px] h-[650px] bg-gradient-to-br from-purple-700/35 via-indigo-600/20 to-transparent blur-[130px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[550px] h-[550px] bg-gradient-to-tr from-pink-600/25 via-purple-600/15 to-transparent blur-[140px] pointer-events-none" />
      </div>

      {/* Top Navigation Bar */}
      <header className="app-navbar sticky top-0 z-50 w-full border-b border-gold/10 transition-all duration-300">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Brand Logo & Title */}
          <Link to="/dashboard" className="flex items-center gap-3 group focus:outline-none shrink-0">
            <Logo className="h-9 transition-transform duration-300 group-hover:scale-105" />
            <div className="hidden sm:flex flex-col">
              <span className="text-sm font-extrabold tracking-wider bg-gradient-to-r from-white via-purple-200 to-gold bg-clip-text text-transparent">
                SOUNDWAVE AI
              </span>
              <span className="text-[9px] text-muted tracking-[0.22em] font-semibold uppercase">
                Neural AI Intelligence
              </span>
            </div>
          </Link>

          {/* Desktop Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {links.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
                    active
                      ? "text-gold bg-gold/10 border border-gold/40 shadow-[0_0_15px_rgba(234,179,8,0.25)]"
                      : "text-muted hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon size={16} className={active ? "text-gold" : "opacity-70 group-hover:opacity-100"} />
                  <span>{item.label}</span>
                  {active && (
                    <motion.div
                      layoutId="activeTabGlow"
                      className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/20 via-gold/15 to-pink-500/20 pointer-events-none"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Tools & Logout */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={cycleTheme}
              className="p-2 rounded-full text-muted hover:text-white hover:bg-white/10 transition-colors focus:outline-none"
              title="Toggle Theme"
              aria-label="Toggle Theme"
            >
              <ThemeIcon size={17} />
            </button>

            {isAuthenticated && (
              <button
                type="button"
                onClick={handleLogout}
                className="hidden sm:flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full border border-pink-500/30 text-pink-300 hover:text-white hover:bg-pink-500/20 hover:border-pink-500/60 shadow-sm transition-all duration-300 focus:outline-none"
              >
                <LogOut size={15} />
                <span>{t("common.logout")}</span>
              </button>
            )}

            {/* Mobile Hamburger Menu Button */}
            <button
              type="button"
              className="md:hidden flex items-center justify-center p-2.5 rounded-full bg-white/[0.06] border border-white/10 text-white focus:outline-none"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="md:hidden border-t border-white/10 bg-[#0A0518]/95 backdrop-blur-2xl overflow-hidden"
            >
              <div className="p-4 space-y-1.5">
                {links.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        active
                          ? "bg-gold/15 text-gold border border-gold/30 font-semibold"
                          : "text-muted hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Icon size={18} className={active ? "text-gold" : "text-muted"} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}

                {isAuthenticated && (
                  <div className="pt-3 mt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-pink-400 hover:bg-pink-500/10 transition-colors"
                    >
                      <LogOut size={18} />
                      <span>{t("common.logout")}</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sleek Gradient Accent Line under Navbar */}
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-purple-500/40 via-pink-500/40 to-transparent" />
      </header>

      {/* Main Page Content */}
      <div className="app-content relative z-10 flex-1 flex flex-col justify-between">
        <main className="app-main min-w-0 flex-1 w-full">
          {children}
        </main>
        <MusicFooter />
      </div>
    </div>
  );
}

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { checkBackendHealth } from "../../utils/api";

// Pages where the backend being offline is irrelevant — don't poll or report errors
const PUBLIC_PATHS = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/auth/callback"];

export default function BackendHealthChecker() {
  const serverOnline = useAuthStore((s) => s.serverOnline);
  const set = useAuthStore.setState;
  const location = useLocation();

  const isPublicPage = PUBLIC_PATHS.some(
    (p) => location.pathname === p || location.pathname.startsWith(p + "/")
  );

  useEffect(() => {
    // Don't poll health on public pages — avoids spamming error toasts
    // when the backend is legitimately not needed
    if (isPublicPage) return;

    let interval;

    const check = async () => {
      const health = await checkBackendHealth();
      if (health.online !== serverOnline) {
        set({ serverOnline: health.online, isOffline: !health.online });
      }
    };

    check();
    interval = setInterval(check, serverOnline ? 30000 : 5000);

    return () => clearInterval(interval);
  }, [serverOnline, set, isPublicPage]);

  return null;
}

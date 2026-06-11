import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useToastStore } from "../store/useToastStore";

export default function AuthCallback() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const pushToast = useToastStore((s) => s.push);
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    console.info("[OAuth] Callback reached, parsing parameters...");
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (accessToken) {
      console.info("[OAuth] Tokens received, initiating login state update...");
      
      // Use the store's login method to ensure consistency
      login({ 
        token: accessToken, 
        refresh_token: refreshToken || "",
        user: null // Will be fetched by refreshSession or background fetch
      }).then(() => {
        console.info("[OAuth] Login state updated, redirecting to dashboard...");
        navigate("/dashboard", { replace: true });
        pushToast({ type: "success", message: "Welcome back! Signed in with Google." });
      }).catch((err) => {
        console.error("[OAuth] Login state update failed", err);
        navigate("/login?error=state_update_failed", { replace: true });
      });
    } else {
      const error = params.get("error");
      console.error("[OAuth] No tokens found in callback", { error });
      navigate(`/login?error=${error || "google_auth_failed"}`, { replace: true });
      pushToast({ type: "error", message: "Authentication failed. Please try again." });
    }
  }, [navigate, login, pushToast]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-primary">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan border-t-transparent"></div>
      <p className="mt-6 text-lg font-medium tracking-wide">Finalizing secure sign-in...</p>
    </div>
  );
}
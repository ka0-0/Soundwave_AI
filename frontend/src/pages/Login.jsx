import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { apiGet, apiPost, ApiError, storeAuthTokens } from "../utils/api";
import { useAuthStore } from "../store/useAuthStore";
import { useToastStore } from "../store/useToastStore";
import AuthLayout from "../components/auth/AuthLayout";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const loginStore = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isCheckingAuth = useAuthStore((s) => s.isCheckingAuth);
  const pushToast = useToastStore((s) => s.push);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);

  function validate() {
    const next = {};
    const normalizedEmail = email.trim();
    if (!normalizedEmail) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Password is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setErrors({});
    setLoading(true);
    try {
      const tokenData = await apiPost("/auth/login", { email: email.trim().toLowerCase(), password });
      
      // CRITICAL: We must store the token in localStorage BEFORE calling /auth/me
      // so the Authorization header is injected correctly.
      storeAuthTokens(tokenData);
      
      const me = await apiGet("/auth/me");
      await loginStore({ token: tokenData.access_token, refresh_token: tokenData.refresh_token, user: me });
      pushToast({ type: "success", title: "Welcome back", message: "Your listening universe is ready." });
      navigate(location.state?.from || "/dashboard", { replace: true });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : (err?.message || "Check your email and password.");
      setErrors({ form: msg });
      pushToast({ type: "error", title: "Sign in failed", message: msg });
    } finally {
      setLoading(false);
    }
  }

  if (isCheckingAuth) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <AuthLayout mode="login">
      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {errors.form && <p className="rounded-lg border border-pink/30 bg-pink/10 px-3 py-2 text-sm text-pink">{errors.form}</p>}
        <Input label="Email" type="email" placeholder="you@soundwave.ai" value={email} onChange={(e) => setEmail(e.target.value)} required error={errors.email} />
        <Input label="Password" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required error={errors.password} />

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-muted">
            <input type="checkbox" className="rounded border-white/20 bg-white/5" />
            Remember me
          </label>
          <Link to="/forgot-password" size="sm" className="text-gold transition-colors hover:text-primary">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" loading={loading} magnetic={false}>
          Enter your universe
        </Button>



        <p className="text-center text-sm text-muted">
          New here?{" "}
          <Link to="/signup" className="font-medium text-cyan hover:text-primary">
            Create an account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

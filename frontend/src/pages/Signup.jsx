import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { apiGet, apiPost, ApiError, storeAuthTokens } from "../utils/api";
import { useAuthStore } from "../store/useAuthStore";
import { useToastStore } from "../store/useToastStore";
import AuthLayout from "../components/auth/AuthLayout";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

export default function Signup() {
  const navigate = useNavigate();
  const loginStore = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isCheckingAuth = useAuthStore((s) => s.isCheckingAuth);
  const pushToast = useToastStore((s) => s.push);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);

  function validate() {
    const next = {};
    const normalizedEmail = email.trim();
    const trimmedUsername = username.trim();
    if (!trimmedUsername) next.username = "Username is required.";
    else if (trimmedUsername.length < 2) next.username = "Username must be at least 2 characters.";
    if (!normalizedEmail) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Password is required.";
    else if (password.length < 8) next.password = "Password must be at least 8 characters.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setErrors({});
    setLoading(true);
    try {
      const tokenData = await apiPost("/auth/register", {
        email: email.trim().toLowerCase(),
        username: username.trim(),
        password,
      });
      
      // CRITICAL: We must store the token in localStorage BEFORE calling /auth/me
      // so the Authorization header is injected correctly.
      storeAuthTokens(tokenData);
      
      const me = await apiGet("/auth/me");
      await loginStore({ token: tokenData.access_token, refresh_token: tokenData.refresh_token, user: me });
      pushToast({ type: "success", title: "You're in", message: "Your sonic profile is being calibrated." });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : (err?.message || "Registration failed. Please try again.");
      setErrors({ form: msg });
      pushToast({ type: "error", title: "Signup failed", message: msg });
    } finally {
      setLoading(false);
    }
  }

  if (isCheckingAuth) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <AuthLayout mode="signup">
      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {errors.form && <p className="rounded-lg border border-pink/30 bg-pink/10 px-3 py-2 text-sm text-pink">{errors.form}</p>}
        <Input label="Username" placeholder="your_alias" value={username} onChange={(e) => setUsername(e.target.value)} required error={errors.username} />
        <Input label="Email" type="email" placeholder="you@soundwave.ai" value={email} onChange={(e) => setEmail(e.target.value)} required error={errors.email} />
        <Input label="Password" type="password" placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required error={errors.password} />

        <Button type="submit" className="w-full" loading={loading} magnetic={false}>
          Begin your story
        </Button>



        <p className="text-center text-sm text-muted">
          Already listening?{" "}
          <Link to="/login" className="font-medium text-cyan hover:text-primary">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiPost, ApiError } from "../utils/api";
import { useToastStore } from "../store/useToastStore";
import AuthLayout from "../components/auth/AuthLayout";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { motion } from "framer-motion";
import { Lock, CheckCircle2 } from "lucide-react";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const pushToast = useToastStore((s) => s.push);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!token) {
      setError("Invalid or missing reset token.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await apiPost("/auth/reset-password", { token, new_password: password });
      setSuccess(true);
      pushToast({ type: "success", title: "Success", message: "Your password has been reset." });
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to reset password.";
      setError(msg);
      pushToast({ type: "error", title: "Reset Failed", message: msg });
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout mode="login">
        <div className="mt-12 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-pink/10 flex items-center justify-center border border-pink/20">
            <Lock size={32} className="text-pink" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-pink">Invalid Request</h2>
            <p className="mt-2 text-muted text-sm">
              The password reset link is missing or has expired.
            </p>
          </div>
          <div className="pt-4">
            <Link to="/forgot-password">
              <Button variant="outline" className="w-full">Request new link</Button>
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout mode="login">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-12 text-center space-y-6"
        >
          <div className="mx-auto w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center border border-gold/20">
            <CheckCircle2 size={32} className="text-gold" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gold">Password Reset</h2>
            <p className="mt-2 text-muted text-sm">
              Your security credentials have been updated.
            </p>
          </div>
          <p className="text-xs text-muted">Redirecting to sign in...</p>
          <div className="pt-4">
            <Link to="/login">
              <Button className="w-full">Sign in now</Button>
            </Link>
          </div>
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout mode="login">
      <div className="mt-8 space-y-2">
        <h2 className="text-2xl font-bold text-gold">Set new password</h2>
        <p className="text-sm text-muted">Please choose a strong password for your SoundWave identity.</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {error && <p className="rounded-lg border border-pink/30 bg-pink/10 px-3 py-2 text-sm text-pink">{error}</p>}
        
        <Input 
          label="New Password" 
          type="password" 
          placeholder="Min. 8 characters" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          icon={<Lock size={18} />}
        />

        <Input 
          label="Confirm New Password" 
          type="password" 
          placeholder="Repeat password" 
          value={confirmPassword} 
          onChange={(e) => setConfirmPassword(e.target.value)} 
          required 
          icon={<Lock size={18} />}
        />

        <Button type="submit" className="w-full" loading={loading} magnetic={false}>
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
}

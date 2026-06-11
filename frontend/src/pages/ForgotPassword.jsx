import { useState } from "react";
import { Link } from "react-router-dom";
import { apiPost, ApiError } from "../utils/api";
import { useToastStore } from "../store/useToastStore";
import AuthLayout from "../components/auth/AuthLayout";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { motion } from "framer-motion";
import { Mail, CheckCircle2 } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const pushToast = useToastStore((s) => s.push);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await apiPost("/auth/forgot-password", { email: email.trim().toLowerCase() });
      setSubmitted(true);
      pushToast({ type: "success", title: "Email Sent", message: "Check your inbox for reset instructions." });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Could not send reset link.";
      setError(msg);
      pushToast({ type: "error", title: "Request Failed", message: msg });
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
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
            <h2 className="text-2xl font-bold text-gold">Check your email</h2>
            <p className="mt-2 text-muted text-sm">
              We've sent a recovery link to <span className="text-primary font-medium">{email}</span>.
            </p>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Didn't receive the email? Check your spam folder or try again in a few minutes.
          </p>
          <div className="pt-4">
            <Link to="/login">
              <Button variant="outline" className="w-full">Back to sign in</Button>
            </Link>
          </div>
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout mode="login">
      <div className="mt-8 space-y-2">
        <h2 className="text-2xl font-bold text-gold">Recover your identity</h2>
        <p className="text-sm text-muted">Enter your email and we'll send you a link to reset your password.</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {error && <p className="rounded-lg border border-pink/30 bg-pink/10 px-3 py-2 text-sm text-pink">{error}</p>}
        <Input 
          label="Email Address" 
          type="email" 
          placeholder="you@soundwave.ai" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
          icon={<Mail size={18} />}
        />

        <Button type="submit" className="w-full" loading={loading} magnetic={false}>
          Send recovery link
        </Button>

        <p className="text-center text-sm text-muted">
          Remembered your password?{" "}
          <Link to="/login" className="font-medium text-gold hover:text-primary transition-colors">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

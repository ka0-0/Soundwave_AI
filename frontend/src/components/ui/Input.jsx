import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

export default function Input({ label, type = "text", error, className = "", ...props }) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (show ? "text" : "password") : type;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`space-y-1.5 ${className}`}
    >
      {label && <label className="text-xs font-medium uppercase tracking-wider text-muted">{label}</label>}
      <div className="relative group">
        <input 
          type={inputType} 
          className="input-premium pr-10 focus:ring-2 focus:ring-cyan/30 focus:border-cyan/50 transition-all duration-300" 
          {...props} 
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-cyan group-focus-within:text-cyan"
            tabIndex={-1}
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-pink">{error}</p>}
    </motion.div>
  );
}

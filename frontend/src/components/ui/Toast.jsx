import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { useToastStore } from "../../store/useToastStore";

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info
};

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[200] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = icons[t.type] || Info;
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              className="glass pointer-events-auto flex min-w-[280px] max-w-sm items-start gap-3 rounded-2xl p-4"
            >
              <Icon size={18} className={t.type === "error" ? "text-pink" : "text-cyan"} />
              <div className="flex-1">
                {t.title && <p className="text-sm font-semibold">{t.title}</p>}
                <p className="text-sm text-muted">{t.message}</p>
              </div>
              <button type="button" onClick={() => dismiss(t.id)} className="text-muted hover:text-primary">
                <X size={16} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

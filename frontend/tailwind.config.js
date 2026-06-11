/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        void: "var(--bg-void)",
        base: "var(--bg-base)",
        elevated: "var(--bg-elevated)",
        glass: "var(--bg-glass)",
        violet: "var(--accent-violet)",
        blue: "var(--accent-blue)",
        cyan: "var(--accent-cyan)",
        pink: "var(--accent-pink)",
        gold: "var(--accent-gold)",
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        muted: "var(--text-muted)"
      },
      fontFamily: {
        display: ["Syne", "Inter", "sans-serif"],
        body: ["Inter", "DM Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"]
      },
      borderRadius: {
        card: "var(--radius-card)"
      },
      boxShadow: {
        premium: "var(--shadow-premium)",
        glow: "0 0 40px var(--glow-violet)"
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        pulseGlow: "pulse-glow 3s ease-in-out infinite"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" }
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" }
        }
      }
    }
  },
  plugins: []
};

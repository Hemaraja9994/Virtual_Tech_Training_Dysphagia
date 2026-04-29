/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        clinical: {
          bg:        "#FFFFFF",
          surface:   "#F8FAFC",
          surface2:  "#F1F5F9",
          border:    "#E2E8F0",
          ink:       "#0F172A",
          ink2:      "#334155",
          muted:     "#64748B"
        },
        brand: {
          50:  "#EFF6FF",
          100: "#DBEAFE",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8"
        },
        signal: {
          trace:  "#0EA5E9",
          ok:     "#10B981",
          warn:   "#F59E0B",
          danger: "#EF4444"
        }
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"]
      },
      fontSize: {
        "clinical-sm":   ["1rem",      { lineHeight: "1.55rem" }],
        "clinical-base": ["1.125rem",  { lineHeight: "1.7rem"  }],
        "clinical-lg":   ["1.375rem",  { lineHeight: "1.95rem" }]
      },
      borderRadius: {
        clinical: "14px"
      },
      boxShadow: {
        "clinical-sm": "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)",
        "clinical-md": "0 4px 12px rgba(15, 23, 42, 0.06), 0 2px 4px rgba(15, 23, 42, 0.04)",
        "clinical-lg": "0 12px 32px rgba(15, 23, 42, 0.08), 0 4px 12px rgba(15, 23, 42, 0.04)",
        "glow-brand":  "0 0 0 4px rgba(37, 99, 235, 0.12)",
        "glow-ok":     "0 0 0 4px rgba(16, 185, 129, 0.18)"
      },
      backgroundImage: {
        "stage-gradient": "radial-gradient(ellipse at top, #EFF6FF 0%, #F8FAFC 45%, #FFFFFF 100%)",
        "monitor-grid":
          "linear-gradient(to right, rgba(14,165,233,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(14,165,233,0.08) 1px, transparent 1px)"
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "0.85" },
          "50%":      { opacity: "1" }
        },
        "ripple": {
          "0%":   { transform: "scale(0.6)", opacity: "0.6" },
          "100%": { transform: "scale(2.4)", opacity: "0" }
        }
      },
      animation: {
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
        "ripple":     "ripple 900ms ease-out forwards"
      }
    }
  },
  plugins: []
};

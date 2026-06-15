import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "Avenir Next", "Segoe UI", "sans-serif"],
        body: ["var(--font-body)", "Avenir Next", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        warm: "0 2px 8px rgba(15, 23, 42, 0.06)",
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -12px rgba(15, 23, 42, 0.12)",
        elevated: "0 4px 12px rgba(15, 23, 42, 0.06), 0 16px 32px -16px rgba(15, 23, 42, 0.18)",
        glow: "0 0 0 1px rgba(249, 115, 22, 0.12), 0 12px 36px -12px rgba(249, 115, 22, 0.35)",
      },
      colors: {
        brand: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
        },
        ink: {
          50: "#f1f5f9",
          100: "#e2e8f0",
          200: "#cbd5e1",
          300: "#94a3b8",
          400: "#64748b",
          500: "#475569",
          600: "#334155",
          700: "#1e293b",
          800: "#162033",
          900: "#0f172a",
          950: "#0b1120",
        },
      },
    },
  },
  plugins: [],
};

export default config;

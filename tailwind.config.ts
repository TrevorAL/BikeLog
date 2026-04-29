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
        display: ["IBM Plex Sans", "Avenir Next", "Segoe UI", "sans-serif"],
        body: ["IBM Plex Sans", "Avenir Next", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        warm: "0 2px 8px rgba(15, 23, 42, 0.06)",
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
        },
      },
    },
  },
  plugins: [],
};

export default config;

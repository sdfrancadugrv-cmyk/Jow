import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        jow: {
          purple: "#6B21A8",
          "purple-bright": "#7C3AED",
          "purple-glow": "#A855F7",
          blue: "#1D4ED8",
          amber: "#D97706",
          dark: "#0A0A0F",
          "dark-panel": "#0F0F1A",
        },
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulse-fast": "pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 8s linear infinite",
        glow: "glow 2s ease-in-out infinite",
      },
      keyframes: {
        glow: {
          "0%, 100%": { boxShadow: "0 0 20px #7C3AED" },
          "50%": { boxShadow: "0 0 60px #A855F7, 0 0 100px #7C3AED" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

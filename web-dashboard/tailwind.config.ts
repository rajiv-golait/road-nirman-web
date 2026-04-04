import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // SSR Design System — from Stitch exports
        primary: {
          DEFAULT: "#1E3A5F",
          50: "#EEF2F7",
          100: "#D4DFEB",
          200: "#A9BFD7",
          300: "#7E9FC3",
          400: "#537FAF",
          500: "#1E3A5F",
          600: "#182F4D",
          700: "#12243B",
          800: "#0C1929",
          900: "#060E17",
          950: "#030710",
        },
        accent: {
          DEFAULT: "#F97316",
          50: "#FFF7ED",
          100: "#FFEDD5",
          200: "#FED7AA",
          300: "#FDBA74",
          400: "#FB923C",
          500: "#F97316",
          600: "#EA580C",
          700: "#C2410C",
          800: "#9A3412",
          900: "#7C2D12",
        },
        surface: {
          DEFAULT: "#F8FAFC",
          container: "#F1F5F9",
          "container-low": "#F8FAFC",
          "container-high": "#E2E8F0",
          "container-lowest": "#FFFFFF",
        },
        "on-surface": {
          DEFAULT: "#0F172A",
          variant: "#475569",
        },
        outline: {
          DEFAULT: "#74777F",
          variant: "#CBD5E1",
        },
        success: {
          DEFAULT: "#16A34A",
          50: "#F0FDF4",
          100: "#DCFCE7",
        },
        error: {
          DEFAULT: "#DC2626",
          50: "#FEF2F2",
          100: "#FEE2E2",
          container: "#FFDAD6",
          "on-container": "#93000A",
        },
        warning: {
          DEFAULT: "#EAB308",
          50: "#FEFCE8",
          100: "#FEF9C3",
        },
        // War Room (Commissioner) dark theme
        warroom: {
          bg: "#0F172A",
          surface: "#1E293B",
          border: "#334155",
        },
      },
      fontFamily: {
        headline: ["Manrope", "sans-serif"],
        body: ["Public Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.375rem",
        xl: "0.5rem",
        "2xl": "0.75rem",
        "3xl": "1rem",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "ticker": "ticker 30s linear infinite",
      },
      keyframes: {
        ticker: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(-100%)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;

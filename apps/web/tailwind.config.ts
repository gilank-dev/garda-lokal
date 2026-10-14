import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0B0F17",
        surface: {
          DEFAULT: "#111827",
          hover: "#182234",
          elevated: "#1F2937",
        },
        border: {
          DEFAULT: "#1F2937",
          subtle: "#16202E",
          active: "#374151",
          highlight: "#4B5563",
        },
        tactical: {
          red: "#DC2626",
          amber: "#D97706",
          green: "#059669",
          blue: "#2563EB",
          darkblue: "#1D4ED8",
          slate: "#0B0F17",
          zinc: "#111827",
          muted: "#9CA3AF",
          bright: "#F9FAFB",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
      },
      boxShadow: {
        tactical: "0 1px 3px 0 rgba(0, 0, 0, 0.6), 0 1px 2px -1px rgba(0, 0, 0, 0.6)",
        "tactical-lg": "0 10px 25px -5px rgba(0, 0, 0, 0.7), 0 8px 10px -6px rgba(0, 0, 0, 0.7)",
        "alert-red": "0 0 15px rgba(220, 38, 38, 0.4)",
        "alert-amber": "0 0 15px rgba(217, 119, 6, 0.3)",
      },
    },
  },
  plugins: [],
};

export default config;

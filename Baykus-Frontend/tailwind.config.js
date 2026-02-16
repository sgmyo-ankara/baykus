/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: "#4F8CFF",
        success: "#22C55E",
        danger: "#EF4444",
        warning: "#F59E0B",
        border: "#0F2854",
        "bg-main": "#020617",
        "bg-panel": "#1a1d24",
        "bg-surface": "#1F2933",
        "bg-elevated": "#020617",
        "text-main": "#E5E7EB",
        "text-muted": "#9CA3AF",
      },
      fontFamily: {
        sans: ["Poppins", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}
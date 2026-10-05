/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#0F172A",
        "primary-container": "#131b2e",
        "on-primary": "#ffffff",
        "on-primary-fixed": "#dae2fd",
        "secondary": "#006a61",
        "secondary-container": "#86f2e4",
        "secondary-fixed": "#89f5e7",
        "on-secondary-fixed": "#00201d",
        "on-secondary-container": "#006f66",
        "teal-accent": "#14B8A6",
        "teal-dark": "#0D9488",
        "error": "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        "on-error-container": "#93000a",
        "surface": "#f8f9ff",
        "surface-dim": "#cbdbf5",
        "surface-container": "#e5eeff",
        "surface-container-low": "#eff4ff",
        "surface-container-high": "#dce9ff",
        "surface-container-highest": "#d3e4fe",
        "surface-container-lowest": "#ffffff",
        "on-surface": "#0b1c30",
        "on-surface-variant": "#45464d",
        "outline": "#76777d",
        "outline-variant": "#c6c6cd",
        "slate-card": "#1E293B",
        "slate-deep": "#0F172A"
      },
      fontFamily: {
        cairo: ["Cairo", "sans-serif"],
        mono: ["Cairo", "monospace"]
      },
      spacing: {
        "space-xs": "0.25rem",
        "space-sm": "0.5rem",
        "space-md": "0.875rem",
        "space-lg": "1.25rem",
        "space-xl": "1.75rem"
      }
    },
  },
  plugins: [],
}

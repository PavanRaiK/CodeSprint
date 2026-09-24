/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#0e1012",
        charcoal: "#15171b",
        gunmetal: "#1c1f24",
        graphite: "#23262d",
        steel: "#333943",
        pewter: "#444d5a",
        slate: "#566171",
        ash: "#8b96aa",
        fog: "#a0aaba",
        silver: "#bbc2ce",
        signal: {
          DEFAULT: "#007afc",
          hover: "#006cdb",
          deep: "#0062ca",
          soft: "rgba(0, 122, 252, 0.15)",
          halo: "rgba(0, 122, 252, 0.35)",
        },
        mapgreen: "#228a56",
        mapred: "#ff5c5c",
      },
      borderRadius: {
        pill: "100px",
        card: "24px",
        chip: "12px",
        sharp: "6px",
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'DM Sans', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

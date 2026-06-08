/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["'Cormorant Garamond'", "Georgia", "serif"],
        sans: ["Outfit", "system-ui", "sans-serif"],
      },
      colors: {
        ink: "#0A0A0A",
        cream: "#F7F5F0",
        bone: "#EBE8E0",
        gold: "#C4A47C",
        mountain: { bg: "#0F172A", fg: "#E2E8F0", accent: "#94A3B8" },
        beach: { bg: "#083344", fg: "#CCFBF1", accent: "#5EEAD4" },
        heritage: { bg: "#451A03", fg: "#FEF3C7", accent: "#FCD34D" },
      },
      letterSpacing: {
        ultra: "0.3em",
      },
      animation: {
        "grain": "grain 8s steps(10) infinite",
        "scroll-hint": "scrollHint 2s ease-in-out infinite",
      },
      keyframes: {
        grain: {
          "0%,100%": { transform: "translate(0,0)" },
          "10%": { transform: "translate(-5%,-10%)" },
          "30%": { transform: "translate(3%,-15%)" },
          "50%": { transform: "translate(12%,9%)" },
          "70%": { transform: "translate(9%,4%)" },
          "90%": { transform: "translate(-1%,7%)" },
        },
        scrollHint: {
          "0%,100%": { transform: "translateY(0)", opacity: "0.4" },
          "50%": { transform: "translateY(8px)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

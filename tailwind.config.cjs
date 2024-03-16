const defaultTheme = require("tailwindcss/defaultTheme")

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      container: {
        center: true,
      },
      screens: {
        xs: "375px",
        md: "720px",
        // Defaults
        sm: "480px",
        // md: "768px",
        lg: "976px",
        xl: "1440px",
      },
      fontFamily: {
        sans: ["Inter variant", "Inter variant override", "Inter", ...defaultTheme.fontFamily.sans],
      },
      letterSpacing: {
        tighter: "-0.05em",
        tight: "-0.03em",
        normal: "-0.015em",
        wide: "0.025em",
        wider: "0.05em",
        widest: "0.1em",
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ["Space Grotesk", "sans-serif"],
        body: ["Manrope", "sans-serif"]
      },
      colors: {
        brand: {
          50: "#f4fbff",
          100: "#def4ff",
          200: "#b8e7ff",
          300: "#89d7ff",
          400: "#55bff6",
          500: "#2b9fdd",
          600: "#1e7fb8",
          700: "#1d6492",
          800: "#1f5478",
          900: "#204764"
        }
      },
      boxShadow: {
        glass: "0 10px 25px rgba(10, 36, 67, 0.15)",
        soft: "0 6px 18px rgba(14, 30, 62, 0.12)"
      },
      backgroundImage: {
        mesh: "radial-gradient(circle at 10% 20%, rgba(141, 195, 255, 0.45) 0%, rgba(212, 241, 255, 0.2) 40%, rgba(255, 255, 255, 0) 70%), radial-gradient(circle at 90% 15%, rgba(255, 210, 167, 0.35) 0%, rgba(255, 245, 232, 0.2) 42%, rgba(255, 255, 255, 0) 72%), linear-gradient(130deg, #f7fcff 0%, #f4f8ff 55%, #fff8f2 100%)"
      }
    }
  },
  plugins: []
};

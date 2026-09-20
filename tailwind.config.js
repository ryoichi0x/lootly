/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: { ink: "#09090b", panel: "#111114", line: "#24242a", electric: "#c6f36b" },
      fontFamily: { sans: ["var(--font-inter)", "sans-serif"] }
    }
  },
  plugins: []
};

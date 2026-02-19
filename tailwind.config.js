module.exports = {
  content: [
    './public/**/*.{html,js}',
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#2563eb",
        "secondary": "#1e40af",
        "background-light": "#f8fafc",
        "background-dark": "#0f172a",
      },
      fontFamily: {
        "display": ["Manrope", "sans-serif"]
      },
      borderRadius: {
        "DEFAULT": "0.375rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}
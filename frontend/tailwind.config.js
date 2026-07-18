/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'junta-blue': '#1e40af',
        'junta-light': '#3b82f6',
        'pse-blue': '#003da5'
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7ff',
          100: '#d9efff',
          500: '#1d7cf2',
          600: '#0e67d0',
          700: '#0d4da8'
        }
      },
      boxShadow: {
        soft: '0 12px 30px rgba(15, 23, 42, 0.08)'
      }
    }
  },
  plugins: []
}

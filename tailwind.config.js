/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'sau-blue': '#005baa',
        'sau-light-blue': '#0070d4',
        'sau-dark-blue': '#004a8a',
      },
    },
  },
  plugins: [],
};
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fce7ed',
          100: '#f9cfe0',
          200: '#f39fc1',
          300: '#ed6fa2',
          400: '#e73f83',
          500: '#E00034',
          600: '#b3002a',
          700: '#860020',
          800: '#5a0015',
          900: '#2d000b',
        },
        dashboard: {
          DEFAULT: '#E00034',
          light: '#fce7ed',
          dark: '#b3002a',
        },
        medical: {
          red: '#dc2626',
          green: '#16a34a',
          blue: '#2563eb',
          yellow: '#eab308',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}

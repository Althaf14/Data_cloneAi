/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0c',
        primary: '#3b82f6',
        secondary: '#10b981',
        accent: '#8b5cf6',
        danger: '#ef4444',
        card: '#16161a',
        border: 'rgba(255, 255, 255, 0.1)',
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(59, 130, 246, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.9)' },
        }
      }
    },
  },
  plugins: [],
}

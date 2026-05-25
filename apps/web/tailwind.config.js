/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6', // Indigo violet
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
        cyber: {
          neonCyan: '#06b6d4',
          neonPink: '#ec4899',
          neonViolet: '#8b5cf6',
          neonEmerald: '#10b981',
          bgDark: '#09090b', // Zinc 950/Black hybrid
          panelDark: '#121214', // Custom dark card
          borderDark: '#1f1f23',
        }
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'subtle-float': 'subtle-float 4s ease-in-out infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': {
            opacity: '1',
            boxShadow: '0 0 12px rgba(139, 92, 246, 0.6), 0 0 4px rgba(139, 92, 246, 0.3)'
          },
          '50%': {
            opacity: '.6',
            boxShadow: '0 0 4px rgba(139, 92, 246, 0.2), 0 0 2px rgba(139, 92, 246, 0.1)'
          }
        },
        'subtle-float': {
          '0%, 100%': {
            transform: 'translateY(0px)',
          },
          '50%': {
            transform: 'translateY(-4px)',
          }
        }
      }
    },
  },
  plugins: [],
}

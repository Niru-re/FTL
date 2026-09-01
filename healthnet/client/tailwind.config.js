/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // CareBridge brand palette — white + orange
        carebridge: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',  // primary orange
          600: '#ea6c0a',
          700: '#c2550a',
          800: '#9a3412',
          900: '#7c2d12',
        },
        // Semantic aliases used across components
        primary: {
          DEFAULT: '#f97316',
          hover:   '#ea6c0a',
          light:   '#fff7ed',
          border:  '#fed7aa',
        },
        // Keep healthnet for backward-compat (maps to orange now)
        healthnet: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea6c0a',
          700: '#c2550a',
          800: '#9a3412',
          900: '#7c2d12',
        },
        navy: {
          800: '#1f2937',
          850: '#111827',
          900: '#0f172a',
          950: '#030712'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow':  'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      boxShadow: {
        'card':   '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)',
        'card-md':'0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.04)',
      }
    },
  },
  plugins: [],
}

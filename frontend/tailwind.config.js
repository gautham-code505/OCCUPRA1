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
        cyber: {
          950: '#050811',
          900: '#090f1d',
          850: '#0d1527',
          800: '#131e36',
          700: '#1e2d4f',
          600: '#2c3e66',
        },
        brand: {
          cyan: '#00f2fe',
          blue: '#3b82f6',
          indigo: '#6366f1',
          purple: '#8b5cf6',
          teal: '#14b8a6',
        },
        status: {
          quiet: '#10b981',
          moderate: '#f59e0b',
          crowded: '#ef4444',
          offline: '#64748b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glow-cyan': '0 0 20px -3px rgba(0, 242, 254, 0.25)',
        'glow-blue': '0 0 20px -3px rgba(59, 130, 246, 0.25)',
        'glow-green': '0 0 20px -3px rgba(16, 185, 129, 0.25)',
        'glow-red': '0 0 20px -3px rgba(239, 68, 68, 0.25)',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}

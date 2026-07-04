/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      // ── Color System ─────────────────────────────────────────────────────
      colors: {
        void:   '#f8fafc',
        abyss:  '#f1f5f9',
        surface: {
          DEFAULT: 'rgba(255, 255, 255, 0.65)',
          dim:     'rgba(241, 245, 249, 0.65)',
          bright:  'rgba(255, 255, 255, 0.95)',
        },
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.8)',
          strong:  'rgba(203, 213, 225, 0.6)',
          danger:  'rgba(239, 68, 68, 0.35)',
          warn:    'rgba(245, 158, 11, 0.35)',
        },
        cyan: {
          50:  '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
        violet: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        threat: {
          critical: '#ef4444',
          high:     '#f97316',
          medium:   '#f59e0b',
          low:      '#10b981',
          info:     '#64748b',
        },
        ink: {
          50:  '#0f172a',
          100: '#1e293b',
          200: '#334155',
          400: '#475569',
          500: '#64748b',
          muted: '#64748b',
          dim:   '#94a3b8',
          ghost: '#cbd5e1',
        },
      },
      fontFamily: {
        sans:    ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        display: ['"Outfit"', 'system-ui', 'sans-serif'],
        mono:    ['"Space Mono"', '"Fira Code"', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
      },
    },
  },
  plugins: [],
};

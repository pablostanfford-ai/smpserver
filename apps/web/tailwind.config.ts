import type { Config } from 'tailwindcss';

/**
 * Дизайн-система AetherSMP: тёмный графит + неоновые акценты.
 * Все цвета вынесены в CSS-переменные, чтобы тема рас могла их переопределять.
 */
const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        void: {
          950: '#05060a',
          900: '#0a0c12',
          800: '#10131c',
          700: '#171b26',
          600: '#1f2432',
          500: '#2a3042',
        },
        neon: {
          cyan: '#22d3ee',
          violet: '#a855f7',
          lime: '#a3e635',
          rose: '#fb7185',
          amber: '#fbbf24',
        },
        ink: {
          DEFAULT: '#e6e9f2',
          muted: '#9aa3b8',
          dim: '#646d84',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 24px -4px rgba(34, 211, 238, 0.55)',
        'glow-violet': '0 0 24px -4px rgba(168, 85, 247, 0.55)',
        'glow-soft': '0 8px 40px -12px rgba(0, 0, 0, 0.8)',
        inset: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
      },
      backgroundImage: {
        grid: `linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px),
               linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)`,
        'radial-fade': 'radial-gradient(ellipse at top, rgba(34,211,238,0.12), transparent 60%)',
      },
      backgroundSize: {
        grid: '48px 48px',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        'spin-slow': 'spin 12s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

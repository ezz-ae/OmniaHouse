import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Canvas
        canvas: {
          DEFAULT: '#0A0A0B',
          raised: '#111113',
          panel: '#161618',
          inset: '#1C1C1F',
        },
        // Text
        ink: {
          DEFAULT: '#F5F5F4',
          muted: '#A8A8A6',
          dim: '#6E6E6B',
          faint: '#3A3A38',
        },
        // The OmniaHouse brand accent — warm matte gold, not yellow
        gold: {
          DEFAULT: '#D4A574',
          bright: '#E8C091',
          dim: '#9E7B58',
          deep: '#5F4934',
        },
        // Status
        good: '#7CB87C',
        warn: '#D9A75B',
        bad: '#D86C5E',
        info: '#7AA7D9',
        // Borders
        line: {
          DEFAULT: '#26262A',
          soft: '#1E1E22',
          strong: '#37373C',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        serif: ['var(--font-serif)', 'ui-serif', 'Georgia', 'serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      letterSpacing: {
        widest: '0.2em',
      },
      boxShadow: {
        panel: '0 1px 0 rgba(255,255,255,0.02) inset, 0 0 0 1px rgba(255,255,255,0.04)',
        glow: '0 0 0 1px rgba(212,165,116,0.35), 0 0 24px -8px rgba(212,165,116,0.4)',
      },
      animation: {
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
        'fade-in': 'fade-in 200ms ease-out',
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(0.9)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(2px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

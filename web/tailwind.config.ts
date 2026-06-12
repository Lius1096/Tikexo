import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        tikexo: {
          primary: '#1A3C5E',
          accent: '#0EA5E9',
          gold: '#B45309',
          success: '#166534',
          danger: '#991B1B',
          'light-blue': '#DBEAFE',
          'light-gray': '#F1F5F9',
          dark: '#1E293B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;

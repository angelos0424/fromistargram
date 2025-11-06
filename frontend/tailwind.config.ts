import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#feda75',
          100: '#fefaec',
          200: '#fde5a6',
          300: '#fcd070',
          400: '#fbb244',
          500: '#f7921f',
          600: '#e46e18',
          700: '#b54b1a',
          800: '#7a2c17',
          900: '#461612'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui']
      }
    }
  },
  plugins: []
} satisfies Config;

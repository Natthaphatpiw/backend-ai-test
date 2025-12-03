import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#faf8f3',
          100: '#f5f1e8',
          200: '#ebe4d5',
          300: '#ddd1bb',
          400: '#cdb89f',
          500: '#bc9f84',
          600: '#a88570',
          700: '#8d6e5c',
          800: '#72574a',
          900: '#5c453c',
          950: '#3a2b23',
        },
        accent: {
          50: '#fff9f0',
          100: '#ffe8d6',
          200: '#ffd1ad',
          300: '#ffb38f',
          400: '#ff9970',
          500: '#ff8552',
          600: '#f76c3a',
          700: '#e5532b',
          800: '#bc3e20',
          900: '#97301b',
          950: '#54180d',
        },
      },
    },
  },
  plugins: [],
}
export default config

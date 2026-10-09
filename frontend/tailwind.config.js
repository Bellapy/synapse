/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Noite violeta: o fundo nunca é preto puro nem cinza genérico.
        ink: '#0b0620',
        night: '#150d38',
        iris: '#7a5cff',
        orchid: '#c46bf0',
        rose: '#ff6f9f',
        ember: '#ff9d6e',
        honey: '#ffd29a',
        sky: '#4fb3ff',
        // Cores quentes do mascote.
        fawn: '#d99e68',
        cream: '#fbeedc',
        mist: '#b9aedd',
      },
      fontFamily: {
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.045em',
      },
    },
  },
  plugins: [],
};

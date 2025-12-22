/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'deep-space': '#030712',
        // Cores base
        'electric-cyan': '#22d3ee',
        'magenta-glow': '#d946ef',
        // MODIFICATION START: Novas cores para os tipos de nós
        'counter-red': '#f43f5e', // rose-500
        'expand-green': '#34d399', // emerald-400
        // MODIFICATION END
      },
      backgroundImage: {
        'galaxy-gradient': 'radial-gradient(ellipse at 70% 30%, #1e1b4b 0%, #030712 60%)',
      }
    },
  },
  plugins: [],
}
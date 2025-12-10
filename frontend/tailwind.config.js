/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta definida no documento de escopo
        'deep-space': '#030712',
        'electric-cyan': '#22d3ee',
        'magenta-glow': '#d946ef',
      },
      backgroundImage: {
        // Gradiente radial para dar profundidade ao "espaço"
        'space-gradient': 'radial-gradient(circle at center, #111827 0%, #030712 100%)',
      }
    },
  },
  plugins: [],
}
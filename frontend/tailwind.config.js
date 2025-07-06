/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neon-pink': '#ff00ff',
        'neon-green': '#39ff14',
        'electric-blue': '#00ffff',
        'vibrant-purple': '#9400d3',
        'laser-lemon': '#dfff00',
        'dark-bg': '#1a001a',
        'light-text': '#f0f0f0',
        'dark-text': '#333333',
      },
      fontFamily: {
        heading: ['Bungee', 'cursive'],
        body: ['Poppins', 'sans-serif'],
      },
      keyframes: {
        'glow': {
          '0%, 100%': { textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #ff00ff, 0 0 20px #ff00ff, 0 0 25px #ff00ff, 0 0 30px #ff00ff, 0 0 35px #ff00ff' },
          '50%': { textShadow: '0 0 10px #fff, 0 0 20px #fff, 0 0 30px #ff00ff, 0 0 40px #ff00ff, 0 0 50px #ff00ff, 0 0 60px #ff00ff, 0 0 70px #ff00ff' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px var(--glow-color-1), 0 0 10px var(--glow-color-2)' },
          '50%': { boxShadow: '0 0 20px var(--glow-color-1), 0 0 30px var(--glow-color-2)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        }
      },
      animation: {
        'glow': 'glow 1.5s ease-in-out infinite alternate',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite alternate',
        'shake': 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
        'gradient-shift': 'gradient-shift 10s ease infinite',
      },
      textShadow: {
        'default': '2px 2px 4px rgba(0, 0, 0, 0.5)',
        'neon-pink': '0 0 5px #ff00ff, 0 0 10px #ff00ff',
        'neon-green': '0 0 5px #39ff14, 0 0 10px #39ff14',
        'electric-blue': '0 0 5px #00ffff, 0 0 10px #00ffff',
      },
      boxShadow: {
        '3d': '5px 5px 0px 0px rgba(0,0,0,0.75)',
        'inner-glow': 'inset 0 0 10px #fff, inset 0 0 20px #ff00ff',
        'neon-outline-pink': '0 0 0 2px #fff, 0 0 0 4px #ff00ff',
        'neon-outline-green': '0 0 0 2px #fff, 0 0 0 4px #39ff14',
      },
      fontSize: {
        'fluid-sm': 'clamp(0.8rem, 1vw + 0.1rem, 1rem)',
        'fluid-base': 'clamp(1rem, 1.5vw + 0.2rem, 1.25rem)',
        'fluid-lg': 'clamp(1.25rem, 2vw + 0.3rem, 1.75rem)',
        'fluid-xl': 'clamp(1.5rem, 2.5vw + 0.4rem, 2.25rem)',
        'fluid-2xl': 'clamp(2rem, 4vw + 0.5rem, 3rem)',
        'fluid-3xl': 'clamp(2.5rem, 6vw + 0.6rem, 4rem)',
        'fluid-4xl': 'clamp(3rem, 8vw + 0.7rem, 5rem)',
        'fluid-5xl': 'clamp(4rem, 10vw + 0.8rem, 7rem)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    function({ addUtilities, theme }) {
      const newUtilities = {
        '.text-shadow': {
          textShadow: theme('textShadow.default'),
        },
        '.text-shadow-neon-pink': {
          textShadow: theme('textShadow.neon-pink'),
        },
        '.text-shadow-neon-green': {
          textShadow: theme('textShadow.neon-green'),
        },
        '.text-shadow-electric-blue': {
          textShadow: theme('textShadow.electric-blue'),
        },
      }
      addUtilities(newUtilities, ['responsive', 'hover'])
    }
  ],
};
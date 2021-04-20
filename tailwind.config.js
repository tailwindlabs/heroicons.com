const defaultTheme = require('tailwindcss/defaultTheme')
const plugin = require('tailwindcss/plugin')

module.exports = {
  mode: 'jit',
  purge: ['src/**/*.js'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter var', ...defaultTheme.fontFamily.sans],
        display: ['Gilroy', ...defaultTheme.fontFamily.sans],
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '100rem',
        '10xl': '112rem',
      },
    },
  },
  plugins: [],
}

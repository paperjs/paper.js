// Prettier, with the settings of dito.js. Only the tests use it so far, the
// sources follow with the ES modules port.

/**
 * @type {import('prettier').Options}
 */
export default {
  plugins: ['prettier-plugin-penere'],
  printWidth: 80,
  semi: false,
  singleQuote: true,
  quoteProps: 'consistent',
  arrowParens: 'avoid',
  trailingComma: 'none',
  wrap: 'preserve'
}

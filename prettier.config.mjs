// Prettier, with the settings of dito.js, for the sources and the tests.

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

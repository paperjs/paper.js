// ESLint, with the JavaScript rules of dito.js. Only the tests use it so far,
// the sources keep JSHint until the ES modules port.
import globals from 'globals'
import pluginJs from '@eslint/js'
import pluginPrettierRecommended from 'eslint-plugin-prettier/recommended'

export default [
  {
    // The boolean sweep is a script in the style of the sources:
    ignores: ['test/booleans/**']
  },
  pluginJs.configs.recommended,
  pluginPrettierRecommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser }
    },
    rules: {
      'prettier/prettier': 'error',
      'dot-notation': 'error',
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'max-len': [
        'error',
        {
          code: 80,
          comments: 80,
          tabWidth: 2,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true
        }
      ],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-prototype-builtins': 'off',
      'no-return-assign': 'error',
      'no-throw-literal': 'error',
      'no-unused-vars': [
        'error',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          ignoreRestSiblings: true
        }
      ],
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-const': ['error', { destructuring: 'all' }],
      'no-restricted-syntax': [
        'error',
        {
          // Prettier picks double quotes for strings with single quotes in
          // them, template literals keep their backticks:
          selector: `Literal[raw=/^"/]:not(Literal[raw=/'/][raw=/\`/])`,
          message:
            'Avoid double quotes. Use backticks for strings with single quotes.'
        }
      ]
    }
  }
]

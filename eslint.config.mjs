// ESLint, with the JavaScript rules of dito.js.
import globals from 'globals'
import pluginJs from '@eslint/js'
import pluginPrettierRecommended from 'eslint-plugin-prettier/recommended'

export default [
  {
    // The builds, Gulp tasks, examples and the boolean sweep keep the old style
    // until the ES modules port:
    ignores: [
      'dist/**',
      'gulp/**',
      'gulpfile.js',
      'examples/**',
      'packages/**',
      'test/booleans/**'
    ]
  },
  pluginPrettierRecommended,
  {
    // The sources, which prepro joins into one script, so their files use
    // each other's declarations without importing them:
    files: ['src/**/*.js'],
    ...pluginJs.configs.recommended,
    languageOptions: {
      ecmaVersion: 2015,
      sourceType: 'script',
      globals: { ...globals.node, ...globals.browser }
    },
    rules: {
      ...pluginJs.configs.recommended.rules,
      'prettier/prettier': 'error',
      'no-undef': 'off',
      // PaperScript.js hands the bundled Acorn its own exports and module:
      'no-unused-vars': [
        'error',
        {
          vars: 'local',
          args: 'none',
          caughtErrors: 'none',
          varsIgnorePattern: '^(exports|module)$'
        }
      ],
      // prepro joins the files, so later ones read what init.js assigns, and
      // coords[i++] keeps one shape for every pair in Segment:
      'no-useless-assignment': 'off',
      'no-var': 'error',
      'one-var': ['error', 'never'],
      'prefer-const': ['error', { destructuring: 'all' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      // The sources call hasOwnProperty() on their own objects in 22 places:
      'no-prototype-builtins': 'off',
      // The sources declare their own Event, MouseEvent, window and document:
      'no-redeclare': ['error', { builtinGlobals: false }],
      // init.js and self.js set up the environment:
      'no-global-assign': ['error', { exceptions: ['self', 'window'] }],
      // paper.js takes undefined as a parameter, for minification:
      'no-shadow-restricted-names': 'off',
      // The constants of Numerical are written as published:
      'no-loss-of-precision': 'off'
    }
  },
  {
    // load.js runs these declarations twice, once through constants.js, and
    // paper.js and export.js both declare paper there:
    files: [
      'src/paper.js',
      'src/export.js',
      'src/util/Numerical.js',
      'src/item/ChangeFlag.js'
    ],
    rules: {
      'no-var': 'off'
    }
  },
  {
    ...pluginJs.configs.recommended,
    ignores: ['src/**']
  },
  {
    ignores: ['src/**'],
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

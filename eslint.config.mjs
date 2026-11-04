// ESLint, with the JavaScript rules of dito.js.
import globals from 'globals'
import pluginJs from '@eslint/js'
import pluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import tseslint from 'typescript-eslint'

// Bodies of if, else and loops take braces, except for a single return, break
// or throw:
const unbraced =
  '/^(BlockStatement|ReturnStatement|BreakStatement|ThrowStatement)$/'
const loops = 'ForStatement, ForInStatement, ForOfStatement, WhileStatement'
const braces = [
  {
    selector: `IfStatement:not([consequent.type=${unbraced}])`,
    message: 'Use braces, except for a single return, break or throw.'
  },
  {
    selector: `IfStatement[alternate]:not([alternate.type=${
      unbraced
    }], [alternate.type='IfStatement'])`,
    message: 'Use braces, except for a single return, break or throw.'
  },
  {
    selector: `:matches(${loops}, DoWhileStatement):not([body.type=${
      unbraced
    }])`,
    message: 'Use braces, except for a single return, break or throw.'
  }
]

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
    // The sources, as ES modules. Files not ported yet still use each other's
    // declarations without importing them, so no-undef waits for the port:
    files: ['src/**/*.{js,ts}'],
    ...pluginJs.configs.recommended,
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2022,
      sourceType: 'module',
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
      'no-loss-of-precision': 'off',
      'no-restricted-syntax': ['error', ...braces]
    }
  },
  {
    // TypeScript checks redeclarations itself, and allows a class to merge
    // with an interface of the same name. Its own rule for unused variables
    // knows the interfaces that module augmentations declare:
    files: ['src/**/*.ts'],
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      'no-redeclare': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { vars: 'local', args: 'none', caughtErrors: 'none' }
      ]
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
        },
        ...braces
      ]
    }
  }
]

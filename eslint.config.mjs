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

// The basic layer: the constants, the helpers, the foundation of the classes
// (the base class, serialization, events) and the basic types. Its modules
// import each other directly and nothing above them, so that the modules
// built on them work without the rest of the library:
const basic = ['src/constants.ts', 'src/{util,core,basic}/**']
// The curve layer on top of it: the functions on curve values, which only
// import the basic layer and each other:
const curve = ['src/curve/**']

export default [
  {
    // The builds, examples and the boolean sweep keep the old style until the
    // ES modules port, and the docs' runtime is vendored:
    ignores: ['dist/**', 'examples/**', 'test/booleans/**', 'docs/static/**']
  },
  pluginPrettierRecommended,
  {
    // The sources, in TypeScript, which checks undefined names itself:
    files: ['src/**/*.ts'],
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
      // coords[i++] keeps one shape for every pair in Segment:
      'no-useless-assignment': 'off',
      'no-var': 'error',
      'one-var': ['error', 'never'],
      'prefer-destructuring': [
        'error',
        { VariableDeclarator: { object: true, array: false } }
      ],
      'prefer-const': ['error', { destructuring: 'all' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
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
    // The modules import each other through internal.ts, which loads them in
    // order. Type imports load nothing:
    files: ['src/**/*.ts'],
    ignores: [
      'src/internal.ts',
      'src/{node,hosted,paperscript}/**',
      ...basic,
      ...curve
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^\\.\\.?/(?!internal\\.ts$).*\\.ts$',
              allowTypeImports: true,
              message: 'Import the modules of the library from internal.ts.'
            }
          ]
        }
      ]
    }
  },
  {
    // Both take modules of the basic layer and the ones next to them:
    files: [...basic, ...curve],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex:
                '^(?!(\\.\\./(constants|(util|core|basic)/[^/]+)|\\./[^/]+)\\.ts$)\\.\\.?/.*\\.ts$',
              allowTypeImports: true,
              message: 'Import only modules of the layers below here.'
            }
          ]
        }
      ]
    }
  },
  {
    // The optional entries import the library from internal.ts or index.ts,
    // and their own modules directly:
    files: ['src/{node,hosted,paperscript}/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^\\.\\./(?!(internal|index)\\.ts$).*\\.ts$',
              allowTypeImports: true,
              message: 'Import the modules of the library from internal.ts.'
            }
          ]
        }
      ]
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
      'prefer-destructuring': [
        'error',
        { VariableDeclarator: { object: true, array: false } }
      ],
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

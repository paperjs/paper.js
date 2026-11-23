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

// The layers below the scene graph. Their modules import each other
// directly, those next to them and those of the layers below, and nothing
// above, so that each layer works without the rest of the library:
const layers = [
  // The constants, the helpers, the foundation of the classes (the base
  // class, serialization, events), the basic types, and the functions on
  // the values of curves, segments, paths, regions and matrices. These work
  // with the basic types, and Matrix is built on those for its values:
  {
    files: ['src/constants.ts', 'src/{util,core,basic,values}/**'],
    below: 'util|core|basic|values'
  },
  // The planar graph of the boolean operations, on plain paths:
  { files: ['src/boolean/**'], below: 'util|core|basic|values' },
  // The outlines of strokes, on plain paths:
  { files: ['src/offset/**'], below: 'util|core|basic|values|boolean' }
]

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
      ...layers.flatMap(({ files }) => files)
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
  ...layers.map(({ files, below }) => ({
    files,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: `^(?!(\\.\\./(constants|(${
                below
              })/[^/]+)|\\./[^/]+)\\.ts$)\\.\\.?/.*\\.ts$`,
              allowTypeImports: true,
              message: 'Import only modules of the layers below here.'
            }
          ]
        }
      ]
    }
  })),
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

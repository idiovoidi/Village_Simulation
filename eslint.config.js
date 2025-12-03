import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        // Babylon.js globals
        BABYLON: 'readonly',
        HavokPhysics: 'readonly',
        // Test globals
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
      },
    },
    rules: {
      // Code quality
      'no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      'no-console': 'off', // Allow console for debugging
      'no-debugger': 'warn',
      
      // Best practices
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'warn',
      'prefer-arrow-callback': 'warn',
      'no-throw-literal': 'error',
      
      // Style
      'indent': ['error', 4, { SwitchCase: 1 }],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'only-multiline'],
      'no-trailing-spaces': 'error',
      'eol-last': ['error', 'always'],
      
      // Spacing
      'space-before-function-paren': ['error', {
        anonymous: 'always',
        named: 'never',
        asyncArrow: 'always'
      }],
      'keyword-spacing': 'error',
      'space-infix-ops': 'error',
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      
      // Complexity
      'max-depth': ['warn', 4],
      'max-lines-per-function': ['warn', { max: 150, skipBlankLines: true, skipComments: true }],
      'complexity': ['warn', 15],
    },
  },
  {
    // Ignore patterns
    ignores: [
      'node_modules/**',
      'coverage/**',
      'dist/**',
      'build/**',
      '*.min.js',
      'assets/**',
      'task_reports/**',
    ],
  },
  {
    // Specific rules for test files
    files: ['**/*.test.js', '**/*-test.js', 'test-*.js', 'run-*-tests.js'],
    rules: {
      'max-lines-per-function': 'off',
      'no-unused-expressions': 'off',
    },
  },
  {
    // Specific rules for config files
    files: ['*.config.js', 'server.js'],
    languageOptions: {
      sourceType: 'commonjs',
    },
  },
];

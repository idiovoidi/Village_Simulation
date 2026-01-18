/**
 * ESLint Configuration for 3D Village Simulation
 * 
 * This configuration enforces strict code quality standards for the JavaScript/TypeScript
 * codebase, targeting syntax errors, potential bugs, and style violations.
 * 
 * Requirements Coverage:
 * - 1.2: Configure rules for syntax errors, bugs, and style violations
 * - 1.3: Set up rules for variable declarations, functions, and imports  
 * - 6.1: Enforce consistent indentation, semicolon usage, and quote styles
 * - 6.2: Flag functions with excessive cyclomatic complexity
 * - 6.3: Enforce consistent import ordering and unused import detection
 * 
 * Dependencies Required:
 * - @eslint/js: ESLint recommended configuration
 * - globals: Global variable definitions for different environments
 * 
 * Install with: npm install @eslint/js globals --save-dev
 */

import tsParser from '@typescript-eslint/parser';

// Simple ESLint configuration without external dependencies
export default [
  {
    files: ["MyHavokSimCode/**/*.js", "MyHavokSimCode/**/*.ts", "assets/AssetManager.js", "server.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        // Node.js globals
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        // ES2021 globals
        globalThis: 'readonly',
        // Performance API
        performance: 'readonly',
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
      // Error Prevention - Syntax Errors and Bugs (Requirements 1.2, 1.3)
      'no-undef': 'error',
      'no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      'no-console': 'warn', // Allow console but warn for production
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-unreachable': 'error',
      'no-unreachable-loop': 'error',
      'no-unsafe-finally': 'error',
      'no-unsafe-negation': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
      
      // Variable Declaration Rules (Requirements 1.3, 6.1)
      'no-var': 'error',
      'prefer-const': 'error',
      'no-redeclare': 'error',
      'no-shadow': ['error', { builtinGlobals: false, hoist: 'functions' }],
      'no-shadow-restricted-names': 'error',
      'no-undef-init': 'error',
      'init-declarations': ['error', 'always'],
      
      // Function Definition Rules (Requirements 1.3, 6.2)
      'func-style': ['error', 'declaration', { allowArrowFunctions: true }],
      'no-empty-function': ['error', { allow: ['constructors'] }],
      'no-extra-bind': 'error',
      'no-invalid-this': 'error',
      'no-loop-func': 'error',
      'no-return-assign': 'error',
      'no-return-await': 'error',
      'prefer-arrow-callback': ['error', { allowNamedFunctions: true }],
      'arrow-body-style': ['error', 'as-needed'],
      
      // Import/Export Statement Rules (Requirements 1.3, 6.3)
      'no-duplicate-imports': 'error',
      'sort-imports': ['error', {
        ignoreCase: false,
        ignoreDeclarationSort: true,
        ignoreMemberSort: false,
        memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
        allowSeparatedGroups: true
      }],
      
      // Best Practices - Bug Prevention
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'no-throw-literal': 'error',
      'no-implicit-globals': 'error',
      'no-implicit-coercion': 'error',
      'no-magic-numbers': ['warn', { 
        ignore: [-1, 0, 1, 2, 3, 4, 5, 10, 100, 1000],
        ignoreArrayIndexes: true,
        ignoreDefaultValues: true
      }],
      'no-multi-assign': 'error',
      'no-nested-ternary': 'error',
      'no-param-reassign': ['error', { props: false }],
      'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
      'no-unneeded-ternary': 'error',
      'no-useless-call': 'error',
      'no-useless-concat': 'error',
      'no-useless-return': 'error',
      'prefer-template': 'error',
      'radix': 'error',
      'yoda': 'error',
      
      // Style Consistency (Requirements 6.1, 6.3)
      'indent': ['error', 4, { 
        SwitchCase: 1,
        VariableDeclarator: 1,
        outerIIFEBody: 1,
        MemberExpression: 1,
        FunctionDeclaration: { parameters: 1, body: 1 },
        FunctionExpression: { parameters: 1, body: 1 },
        CallExpression: { arguments: 1 },
        ArrayExpression: 1,
        ObjectExpression: 1,
        ImportDeclaration: 1,
        flatTernaryExpressions: false,
        offsetTernaryExpressions: false,
        ignoreComments: false
      }],
      'quotes': ['error', 'single', { 
        avoidEscape: true,
        allowTemplateLiterals: true 
      }],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'only-multiline'],
      'no-trailing-spaces': 'error',
      'eol-last': ['error', 'always'],
      'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1, maxBOF: 0 }],
      'padded-blocks': ['error', 'never'],
      'brace-style': ['error', '1tbs', { allowSingleLine: true }],
      'comma-spacing': ['error', { before: false, after: true }],
      'comma-style': ['error', 'last'],
      'computed-property-spacing': ['error', 'never'],
      'func-call-spacing': ['error', 'never'],
      'key-spacing': ['error', { beforeColon: false, afterColon: true }],
      'new-cap': ['error', { newIsCap: true, capIsNew: false }],
      'new-parens': 'error',
      'no-array-constructor': 'error',
      'no-mixed-spaces-and-tabs': 'error',
      'no-new-object': 'error',
      'no-tabs': 'error',
      'no-whitespace-before-property': 'error',
      'object-curly-newline': ['error', { consistent: true }],
      'one-var': ['error', 'never'],
      'operator-linebreak': ['error', 'before'],
      'semi-spacing': ['error', { before: false, after: true }],
      'semi-style': ['error', 'last'],
      'space-in-parens': ['error', 'never'],
      'space-unary-ops': ['error', { words: true, nonwords: false }],
      'spaced-comment': ['error', 'always', { exceptions: ['-', '+'] }],
      'switch-colon-spacing': ['error', { after: true, before: false }],
      
      // Spacing Rules
      'space-before-function-paren': ['error', {
        anonymous: 'always',
        named: 'never',
        asyncArrow: 'always'
      }],
      'keyword-spacing': ['error', { before: true, after: true }],
      'space-infix-ops': 'error',
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'block-spacing': ['error', 'always'],
      'space-before-blocks': 'error',
      
      // Complexity and Maintainability (Requirements 6.2)
      'max-depth': ['error', 4],
      'max-lines-per-function': ['error', { 
        max: 50, 
        skipBlankLines: true, 
        skipComments: true,
        IIFEs: true 
      }],
      'max-lines': ['error', { 
        max: 300, 
        skipBlankLines: true, 
        skipComments: true 
      }],
      'max-nested-callbacks': ['error', 3],
      'max-params': ['error', 4],
      'max-statements': ['error', 20],
      'max-statements-per-line': ['error', { max: 1 }],
      'complexity': ['error', 10],
      
      // ES6+ Features
      'arrow-parens': ['error', 'as-needed'],
      'arrow-spacing': ['error', { before: true, after: true }],
      'constructor-super': 'error',
      'generator-star-spacing': ['error', { before: false, after: true }],
      'no-class-assign': 'error',
      'no-const-assign': 'error',
      'no-dupe-class-members': 'error',
      'no-duplicate-imports': 'error',
      'no-new-symbol': 'error',
      'no-this-before-super': 'error',
      'no-useless-computed-key': 'error',
      'no-useless-constructor': 'error',
      'no-useless-rename': 'error',
      'no-var': 'error',
      'object-shorthand': ['error', 'always'],
      'prefer-const': ['error', { destructuring: 'any' }],
      'prefer-destructuring': ['error', {
        VariableDeclarator: { array: false, object: true },
        AssignmentExpression: { array: true, object: false }
      }],
      'prefer-numeric-literals': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'rest-spread-spacing': ['error', 'never'],
      'symbol-description': 'error',
      'template-curly-spacing': ['error', 'never'],
      'yield-star-spacing': ['error', 'after'],
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
      '.kiro/**',
      'docs/**',
      'memory-bank/**',
    ],
  },
  {
    // Specific rules for test files
    files: ['**/*.test.js', '**/*-test.js', 'test-*.js', 'run-*-tests.js'],
    rules: {
      'max-lines-per-function': 'off',
      'max-lines': 'off',
      'max-statements': 'off',
      'no-unused-expressions': 'off',
      'no-magic-numbers': 'off',
      'prefer-arrow-callback': 'off',
      'func-style': 'off',
    },
  },
  {
    // Specific rules for config files
    files: ['*.config.js', 'server.js'],
    languageOptions: {
      sourceType: 'commonjs',
    },
    rules: {
      'no-magic-numbers': 'off',
      'prefer-destructuring': 'off',
    },
  },
  {
    // TypeScript-specific rules (for future .ts files)
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      // These will be enhanced when TypeScript parser is added
      'no-undef': 'off', // TypeScript handles this
      'init-declarations': 'off', // TypeScript handles initialization
    },
  },
];

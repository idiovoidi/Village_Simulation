# ESLint Configuration Setup

## Overview

This document describes the strict ESLint configuration implemented for the 3D Village Simulation project. The configuration enforces comprehensive code quality standards across JavaScript and TypeScript files.

## Configuration Features

### Error Prevention (Requirements 1.2, 1.3)
- **Syntax Errors**: Detects undefined variables, unreachable code, invalid typeof usage
- **Bug Prevention**: Prevents eval usage, unsafe negation, implied eval, script URLs
- **Runtime Safety**: Enforces proper use of `isNaN`, valid typeof checks, safe finally blocks

### Variable Declaration Rules (Requirements 1.3, 6.1)
- **Modern JavaScript**: Enforces `const`/`let` over `var`
- **Initialization**: Requires variable initialization at declaration
- **Shadowing Prevention**: Prevents variable shadowing and redeclaration
- **Scope Safety**: Prevents undefined initialization and restricted name usage

### Function Definition Rules (Requirements 1.3, 6.2)
- **Function Style**: Enforces function declarations with arrow function exceptions
- **Empty Functions**: Prevents empty functions (except constructors)
- **Return Safety**: Prevents return assignment and unnecessary return await
- **Arrow Functions**: Enforces consistent arrow function usage and body style

### Import/Export Management (Requirements 1.3, 6.3)
- **Duplicate Prevention**: Prevents duplicate imports
- **Import Sorting**: Enforces consistent import ordering
- **Member Sorting**: Sorts import members alphabetically
- **Separated Groups**: Allows logical grouping of imports

### Style Consistency (Requirements 6.1, 6.3)
- **Indentation**: 4-space indentation with consistent rules for all constructs
- **Quotes**: Single quotes with escape allowance and template literal support
- **Semicolons**: Required semicolons with proper spacing
- **Spacing**: Comprehensive spacing rules for operators, blocks, and functions
- **Line Management**: Controls empty lines, trailing spaces, and end-of-file newlines

### Complexity Control (Requirements 6.2)
- **Function Length**: Maximum 50 lines per function (excluding comments/blanks)
- **File Length**: Maximum 300 lines per file
- **Nesting Depth**: Maximum 4 levels of nesting
- **Cyclomatic Complexity**: Maximum complexity of 10
- **Parameter Count**: Maximum 4 parameters per function
- **Statement Count**: Maximum 20 statements per function

## File Coverage

The configuration applies to:
- `MyHavokSimCode/**/*.js` - Main simulation codebase
- `MyHavokSimCode/**/*.ts` - TypeScript files (future migration)
- `assets/AssetManager.js` - Asset management system
- `server.js` - Development server

## Ignored Patterns

The following directories are excluded from linting:
- `node_modules/` - Dependencies
- `coverage/` - Test coverage reports
- `dist/` and `build/` - Build outputs
- `*.min.js` - Minified files
- `assets/` - Static assets (except AssetManager.js)
- `task_reports/` - Generated reports
- `.kiro/` - Kiro configuration
- `docs/` and `memory-bank/` - Documentation

## Special Rule Sets

### Test Files
Files matching `**/*.test.js`, `**/*-test.js`, `test-*.js`, `run-*-tests.js`:
- Relaxed function length limits
- Disabled magic number warnings
- Allowed unused expressions
- Flexible function style rules

### Configuration Files
Files matching `*.config.js`, `server.js`:
- CommonJS module support
- Relaxed magic number rules
- Flexible destructuring requirements

### TypeScript Files
Files matching `**/*.ts`, `**/*.tsx`:
- Disabled `no-undef` (TypeScript handles this)
- Disabled `init-declarations` (TypeScript handles initialization)

## Installation Requirements

To use this configuration, install the required dependencies:

```bash
npm install --save-dev @eslint/js globals eslint
```

Or with pnpm:
```bash
pnpm add -D @eslint/js globals eslint
```

## Usage Commands

The following npm scripts are available:

```bash
# Lint MyHavokSimCode directory
npm run lint

# Lint and auto-fix issues
npm run lint:fix

# Lint entire project
npm run lint:all

# Lint and auto-fix entire project
npm run lint:all:fix

# Lint TypeScript files specifically
npm run lint:ts

# Lint and auto-fix TypeScript files
npm run lint:ts:fix
```

## Global Variables

The configuration recognizes these global variables:
- **Browser**: Standard browser APIs and DOM
- **Node.js**: Node.js runtime globals
- **ES2021**: Modern JavaScript features
- **Babylon.js**: `BABYLON` namespace
- **Havok Physics**: `HavokPhysics` namespace
- **Testing**: `describe`, `it`, `expect`, `beforeEach`, `afterEach`

## Integration with Build System

ESLint is integrated into the build process:
- Development server provides real-time linting feedback
- Build process fails on linting errors (Requirement 1.5)
- Hot reload maintains linting validation

## Babylon.js and 3D Engine Support

The configuration is specifically tailored for 3D development:
- Recognizes Babylon.js global namespace
- Supports Havok Physics integration
- Handles WebGL/WebGPU rendering contexts
- Accommodates 3D math and vector operations

## Migration Readiness

The configuration is prepared for TypeScript migration:
- Supports mixed .js and .ts files
- TypeScript-specific rule overrides
- Future integration with @typescript-eslint parser
- Maintains ES6 module compatibility

## Validation

To validate the configuration works correctly:

1. Check configuration syntax:
   ```bash
   node -e "import('./eslint.config.js').then(() => console.log('Valid'))"
   ```

2. Test on a single file:
   ```bash
   npx eslint MyHavokSimCode/core/ErrorHandling.js
   ```

3. Run full project lint:
   ```bash
   npm run lint
   ```

## Troubleshooting

### Common Issues

1. **Missing Dependencies**: Install `@eslint/js` and `globals`
2. **Import Errors**: Ensure Node.js supports ES modules
3. **Configuration Conflicts**: Remove deprecated `.eslintignore` file
4. **Performance**: Use `--cache` flag for large codebases

### Performance Optimization

For better performance:
- ESLint caching is enabled by default
- Ignore patterns exclude unnecessary files
- Incremental linting processes only changed files
- Parallel execution with build tools when possible

## Requirements Traceability

This configuration satisfies the following requirements:
- **1.2**: Rules for syntax errors, bugs, and style violations
- **1.3**: Variable declarations, functions, and imports rules
- **1.4**: Actionable feedback with file locations and rule violations
- **1.5**: Build system integration with failure on errors
- **6.1**: Consistent indentation, semicolons, and quotes
- **6.2**: Cyclomatic complexity and function size limits
- **6.3**: Import ordering and unused import detection
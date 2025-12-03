# ESLint Setup

ESLint is configured for this project to maintain code quality and consistency across the codebase.

## Installation

Install the required dependencies:

```bash
npm install
```

## Usage

### Lint all files
```bash
npm run lint
```

### Auto-fix issues
```bash
npm run lint:fix
```

### Editor Integration

The project includes VS Code settings for automatic linting and fixing on save. Make sure you have the ESLint extension installed:
- Extension ID: `dbaeumer.vscode-eslint`

## Configuration

The project uses ESLint's flat config format (`eslint.config.js`) with the following setup:

### Rules Overview

- **Code Quality**: Enforces `const` over `let`, no `var`, strict equality checks
- **Style**: 4-space indentation, single quotes, semicolons required
- **Complexity**: Warns on deep nesting (>4 levels) and long functions (>150 lines)
- **Best Practices**: Arrow functions preferred, no throwing literals

### Globals

Pre-configured globals include:
- `BABYLON` - Babylon.js namespace
- `HavokPhysics` - Havok physics engine
- Standard browser and Node.js globals
- Test framework globals (describe, it, expect, etc.)

### Ignored Files

The following are excluded from linting:
- `node_modules/`
- `coverage/`
- `assets/`
- `task_reports/`
- Minified files (`*.min.js`)

## Customization

To modify rules, edit `eslint.config.js`. Common adjustments:

```javascript
rules: {
  'no-console': 'off',  // Allow console statements
  'indent': ['error', 2],  // Change to 2-space indentation
  'quotes': ['error', 'double'],  // Use double quotes
}
```

## CI/CD Integration

Add to your CI pipeline:

```bash
npm run lint
```

This will fail the build if linting errors are found.

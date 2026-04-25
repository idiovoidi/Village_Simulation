# Coverage Tools Setup
**Date:** February 3, 2026

## Why
Enable identification and removal of unused code through automated coverage analysis.

## What Was Added

### Tools
- **c8** - Code coverage tracking
- **Puppeteer** - Browser-side coverage collection
- **Custom analyzer** (`analyze-coverage.js`) - Identifies unused code with recommendations

### NPM Scripts
```bash
npm run test:coverage       # Run tests with coverage
npm run coverage:analyze    # Analyze results
npm run coverage:full       # Tests + analysis (recommended)
npm run coverage:open       # Open HTML report
npm run coverage:browser    # Browser coverage (requires server)
```

### Configuration
- `.c8rc.json` - Thresholds: 60% lines/functions, 50% branches
- Excludes: test files, node_modules, coverage directory

## Quick Start
```bash
npm run coverage:full       # Get baseline
npm run coverage:open       # View detailed report
```

## Output
- `coverage/index.html` - Interactive line-by-line report
- `coverage/lcov.info` - For CI/CD integration
- `coverage/coverage-final.json` - Raw data
- `coverage/analysis-report.json` - Categorized results (unused, low-usage, moderate, well-covered)

## Categories
- **Unused** (0%) - Safe to remove
- **Low usage** (<30%) - May contain dead code
- **Moderate** (30-60%) - Room for improvement
- **Well covered** (>60%) - Good shape

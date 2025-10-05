# Code Coverage & Optimization Guide

This guide explains how to use the code coverage tools to identify and optimize unused code in the codebase.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Coverage Analysis
```bash
# Run all tests with coverage
npm run test:coverage

# Analyze coverage and get recommendations
npm run coverage:analyze

# Run both in one command
npm run coverage:full
```

### 3. View Results
```bash
# Open HTML coverage report
npm run coverage:open
```

## 📊 Available Commands

| Command | Description |
|---------|-------------|
| `npm run test:coverage` | Run all tests with coverage tracking |
| `npm run test:coverage:server` | Run server tests with coverage |
| `npm run coverage:browser` | Collect browser-side coverage (requires server running) |
| `npm run coverage:analyze` | Analyze coverage data and show optimization recommendations |
| `npm run coverage:full` | Run tests + analysis in one command |
| `npm run coverage:report` | Generate coverage reports |
| `npm run coverage:open` | Open HTML coverage report in browser |

## 🔍 Understanding Coverage Reports

### Terminal Output
After running `npm run coverage:analyze`, you'll see:

- **Overall Summary**: Total files, coverage percentage, lines covered
- **Completely Unused Files**: Files with 0% coverage (candidates for removal)
- **Low Usage Files**: Files with <30% coverage (may contain dead code)
- **Moderate Usage Files**: Files with 30-60% coverage (room for improvement)
- **Well Covered Files**: Files with >60% coverage

### HTML Report
The HTML report (`coverage/index.html`) provides:
- Line-by-line coverage visualization
- Red lines = not executed
- Green lines = executed
- Yellow lines = partially covered branches

### Browser Coverage
For client-side JavaScript:
```bash
# Start the server first
npm start

# In another terminal, collect browser coverage
npm run coverage:browser
```

This captures which parts of your client-side code are actually used during runtime.

## 💡 Optimization Workflow

### Step 1: Identify Unused Code
```bash
npm run coverage:full
```

Look for:
- Files with 0% coverage
- Functions that are never called
- Branches that are never taken

### Step 2: Verify Before Removing
Before deleting code, verify it's truly unused:
1. Search for references across the codebase
2. Check if it's called dynamically
3. Consider if it's part of a public API
4. Review git history for context

### Step 3: Remove or Refactor
Options for unused code:
- **Delete**: If truly unused and not needed
- **Archive**: Move to a separate branch if might be needed later
- **Document**: Add comments explaining why it exists
- **Test**: Add tests if it should be used but isn't

### Step 4: Track Progress
Run coverage regularly to track improvements:
```bash
# Add to your CI/CD pipeline
npm run test:coverage
```

## 🎯 Coverage Thresholds

Current thresholds (configured in `.c8rc.json`):
- Lines: 60%
- Functions: 60%
- Branches: 50%
- Statements: 60%

Adjust these based on your project needs.

## 📁 Coverage Files

- `.c8rc.json` - Coverage configuration
- `coverage/` - Generated coverage reports
- `coverage/index.html` - Interactive HTML report
- `coverage/lcov.info` - LCOV format (for CI tools)
- `coverage/coverage-final.json` - Raw coverage data
- `coverage/analysis-report.json` - Detailed analysis results

## 🔧 Configuration

### Exclude Files from Coverage
Edit `.c8rc.json`:
```json
{
  "exclude": [
    "test-*.js",
    "**/*.test.js",
    "path/to/exclude/**"
  ]
}
```

### Adjust Thresholds
Edit `.c8rc.json`:
```json
{
  "lines": 70,
  "functions": 70,
  "branches": 60,
  "statements": 70
}
```

## 🌐 Browser Coverage (Advanced)

For detailed browser-side coverage:

### Method 1: Automated (Puppeteer)
```bash
npm start
npm run coverage:browser
```

### Method 2: Manual (Chrome DevTools)
1. Open your app in Chrome
2. Open DevTools (F12)
3. Press Ctrl+Shift+P
4. Type "coverage" and select "Show Coverage"
5. Click the record button
6. Interact with your app
7. Stop recording to see results

## 📈 Best Practices

1. **Run coverage regularly** - Make it part of your development workflow
2. **Don't chase 100%** - Focus on critical paths, not every line
3. **Review before deleting** - Unused doesn't always mean unnecessary
4. **Document decisions** - Note why code exists even if uncovered
5. **Use in CI/CD** - Fail builds if coverage drops below threshold
6. **Combine with profiling** - Use performance profiling alongside coverage

## 🚨 Common Issues

### "Coverage file not found"
Run tests first: `npm run test:coverage`

### "Server not running" (browser coverage)
Start the server: `npm start`

### Low coverage on new files
Add tests or exclude from coverage if not testable

### Coverage too slow
Reduce the number of files being analyzed in `.c8rc.json`

## 🔗 Integration with CI/CD

### GitHub Actions Example
```yaml
- name: Run tests with coverage
  run: npm run test:coverage

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

## 📚 Additional Resources

- [c8 Documentation](https://github.com/bcoe/c8)
- [Istanbul Coverage](https://istanbul.js.org/)
- [Chrome DevTools Coverage](https://developer.chrome.com/docs/devtools/coverage/)

## 🎯 Next Steps

1. Run `npm run coverage:full` to get your baseline
2. Review the recommendations in the terminal output
3. Open `coverage/index.html` for detailed analysis
4. Create a plan to address unused code
5. Set up coverage in your CI/CD pipeline

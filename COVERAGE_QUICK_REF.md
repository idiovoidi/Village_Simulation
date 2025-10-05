# 📊 Coverage Quick Reference

## 🚀 Most Common Commands

```bash
# Get started - see what's available
npm run coverage:demo

# Run full analysis (recommended)
npm run coverage:full

# Open visual report
npm run coverage:open

# Browser coverage (server must be running)
npm start                    # Terminal 1
npm run coverage:browser     # Terminal 2
```

## 📋 All Commands

| Command | What It Does |
|---------|-------------|
| `npm run test:coverage` | Run tests with coverage |
| `npm run coverage:analyze` | Analyze results |
| `npm run coverage:full` | Tests + analysis |
| `npm run coverage:open` | Open HTML report |
| `npm run coverage:browser` | Browser coverage |
| `npm run coverage:demo` | Show help |

## 🎯 What You'll Find

- ❌ **Unused files** (0% coverage) - Safe to remove
- ⚠️ **Low usage** (<30%) - May contain dead code
- 📊 **Moderate** (30-60%) - Room for improvement
- ✅ **Well covered** (>60%) - Good shape

## 💡 Quick Workflow

1. `npm run coverage:full` - Get baseline
2. Review terminal output
3. `npm run coverage:open` - See details
4. Remove/refactor unused code
5. Re-run to verify

## 📁 Files Created

- `.c8rc.json` - Configuration
- `analyze-coverage.js` - Analysis tool
- `test-browser-coverage.js` - Browser coverage
- `demo-coverage.js` - Demo/help
- `COVERAGE_GUIDE.md` - Full documentation
- `COVERAGE_SETUP.md` - Setup details

## 🔧 Configuration

Edit `.c8rc.json` to:
- Exclude files from coverage
- Adjust coverage thresholds
- Change report formats

## 📖 More Help

- Full guide: `COVERAGE_GUIDE.md`
- Setup details: `COVERAGE_SETUP.md`
- Demo: `npm run coverage:demo`

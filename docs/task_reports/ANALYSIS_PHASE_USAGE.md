# Coverage Analysis Phase - Usage Guide

## Quick Start

### Step 1: Generate Coverage Data

First, run your tests with coverage enabled:

```bash
npm run test:coverage
```

This will:
- Run all tests with c8 coverage tracking
- Generate `coverage/coverage-final.json`
- Create HTML reports in `coverage/` directory

### Step 2: Run Coverage Analysis

Analyze the coverage data:

```bash
npm run coverage:analyze
```

This will:
- Parse the coverage data
- Categorize files by usage
- Generate `coverage/analysis-report.json`

### Step 3: Run Analysis Phase

Now run the cleanup orchestrator's analysis phase:

```bash
node cleanup-orchestrator.js --phase analysis
```

Or with verbose output:

```bash
node cleanup-orchestrator.js --phase analysis --verbose
```

## What the Analysis Phase Does

The analysis phase performs three main operations:

### 1. Coverage Collection (CoverageRunner)

- ✅ Runs `npm run test:coverage` to collect server-side coverage
- ✅ Checks if server is running on port 3000
- ✅ Runs `npm run coverage:browser` if server is available (optional)
- ✅ Runs `npm run coverage:analyze` to generate analysis report

### 2. Data Parsing (CodeAnalyzer)

- ✅ Reads `coverage/coverage-final.json` for raw coverage data
- ✅ Reads `coverage/analysis-report.json` for categorized results
- ✅ Creates unified data structure with priority scores
- ✅ Calculates impact metrics (file size, unused functions)

### 3. Report Generation (AnalysisReportGenerator)

- ✅ Displays summary statistics in terminal
- ✅ Lists completely unused files (0% coverage)
- ✅ Lists low-usage files (<30% coverage)
- ✅ Shows unused function names
- ✅ Saves results to `cleanup-analysis.json`

## Example Output

```
============================================================
COVERAGE ANALYSIS REPORT
============================================================

📊 SUMMARY STATISTICS:
   Total Files: 45
   Overall Coverage: 67.3%
   Unused Files (0% coverage): 3
   Low Usage Files (<30% coverage): 8
   Total Functions: 234
   Unused Functions: 42

🚨 COMPLETELY UNUSED FILES (3 files):

   1. MyHavokSimCode/OldSystem.js
      Lines: 150 | Functions: 8 | Size: ~7.3 KB
   2. MyHavokSimCode/DeprecatedUtil.js
      Lines: 89 | Functions: 5 | Size: ~4.3 KB
   3. test-old-api.js
      Lines: 45 | Functions: 3 | Size: ~2.2 KB

⚠️  LOW USAGE FILES (8 files with <30% coverage):

   1. MyHavokSimCode/RarelyUsed.js - 12.5% coverage
      Uncovered: 105/120 lines
      Unused functions: helperA, helperB, helperC (+2 more)
   2. MyHavokSimCode/PartialSystem.js - 28.3% coverage
      Uncovered: 43/60 lines
      Unused functions: initialize, cleanup

   ... and 6 more files

============================================================
✓ Analysis results saved to: cleanup-analysis.json
============================================================
```

## Output Files

### cleanup-analysis.json

Complete structured data for next phases:

```json
{
  "items": [
    {
      "type": "file",
      "path": "MyHavokSimCode/OldSystem.js",
      "coverage": 0,
      "metrics": {
        "totalLines": 150,
        "coveredLines": 0,
        "uncoveredLines": 150,
        "totalFunctions": 8,
        "coveredFunctions": 0,
        "unusedFunctions": 8,
        "unusedFunctionNames": ["funcA", "funcB", "..."],
        "totalBranches": 12,
        "coveredBranches": 0,
        "branchCoverage": 0
      },
      "category": "unused",
      "priority": 115.0,
      "estimatedBytes": 7500
    }
  ],
  "summary": {
    "totalFiles": 45,
    "unusedFiles": 3,
    "lowUsageFiles": 8,
    "totalLines": 5432,
    "coveredLines": 3654,
    "unusedFunctions": 42,
    "totalFunctions": 234
  },
  "thresholds": {
    "unused": 0,
    "lowUsage": 30,
    "moderate": 60
  },
  "timestamp": "2025-10-05T12:34:56.789Z"
}
```

## Command-Line Options

```bash
# Run analysis phase only
node cleanup-orchestrator.js --phase analysis

# With verbose logging (shows npm script output)
node cleanup-orchestrator.js --phase analysis --verbose

# Silent mode (errors only)
node cleanup-orchestrator.js --phase analysis --silent

# Custom configuration
node cleanup-orchestrator.js --phase analysis --config my-config.json

# Help
node cleanup-orchestrator.js --help
```

## Optional: Browser Coverage

To include browser-side coverage:

1. Start the development server in a separate terminal:
   ```bash
   npm start
   ```

2. Run the analysis phase:
   ```bash
   node cleanup-orchestrator.js --phase analysis
   ```

The analysis phase will automatically detect the running server and include browser coverage.

If the server is not running, browser coverage will be skipped with a warning.

## Troubleshooting

### Error: "coverage/coverage-final.json not found"

**Solution:** Run coverage tests first:
```bash
npm run test:coverage
```

### Error: "coverage/analysis-report.json not found"

**Solution:** Run coverage analysis:
```bash
npm run coverage:analyze
```

### Warning: "Server is not running on port 3000"

**Solution:** This is optional. To include browser coverage:
```bash
npm start  # In separate terminal
```

### Error: "npm run test:coverage failed"

**Solution:** Check if tests are passing:
```bash
npm test
```

## Next Steps

After running the analysis phase:

1. **Review the output** - Check which files are unused or low-usage
2. **Examine cleanup-analysis.json** - Review the structured data
3. **Run verification phase** - Verify code is safe to remove
4. **Run cleanup phase** - Remove verified unused code
5. **Generate report** - See before/after metrics

## Integration with Full Workflow

The analysis phase is the first step in the complete cleanup workflow:

```bash
# Run all phases (dry-run)
node cleanup-orchestrator.js --dry-run

# Run specific phases in sequence
node cleanup-orchestrator.js --phase analysis
node cleanup-orchestrator.js --phase verification
node cleanup-orchestrator.js --phase cleanup
node cleanup-orchestrator.js --phase report
```

## Configuration

Customize thresholds in `cleanup-config.json`:

```json
{
  "thresholds": {
    "unused": 0,
    "lowUsage": 30,
    "moderate": 60
  }
}
```

Then run with custom config:

```bash
node cleanup-orchestrator.js --phase analysis --config cleanup-config.json
```

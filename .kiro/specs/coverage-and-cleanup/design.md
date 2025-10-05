# Design Document: Coverage Analysis and Codebase Cleanup

## Overview

This design outlines a systematic approach to running code coverage analysis and cleaning up unused code in the 3D Village Simulation codebase. The project already has comprehensive coverage tooling (c8, Puppeteer, custom analyzers), so this design focuses on orchestrating those tools and implementing a safe, methodical cleanup process.

The cleanup will be performed in phases: analysis, verification, removal, and validation. Each phase has clear inputs, outputs, and safety checks to prevent breaking changes.

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Phase 1: Analysis                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ Run Server   │───▶│ Run Browser  │───▶│   Analyze    │  │
│  │  Coverage    │    │  Coverage    │    │   Results    │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Phase 2: Verification                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Search     │───▶│    Check     │───▶│  Categorize  │  │
│  │ References   │    │  Git History │    │    Items     │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Phase 3: Cleanup                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Remove     │───▶│    Update    │───▶│     Run      │  │
│  │    Files     │    │   Imports    │    │    Tests     │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Phase 4: Reporting                        │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Calculate  │───▶│   Generate   │───▶│    Commit    │  │
│  │   Metrics    │    │    Report    │    │   Changes    │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

1. **Coverage Orchestrator** - Coordinates the execution of coverage tools
2. **Code Analyzer** - Processes coverage data and identifies unused code
3. **Safety Verifier** - Checks if code is safe to remove
4. **Code Remover** - Performs actual file/function deletions
5. **Report Generator** - Tracks metrics and generates cleanup reports

## Components and Interfaces

### 1. Coverage Orchestrator

**Purpose:** Execute all coverage collection tools in the correct sequence

**Interface:**

```javascript
class CoverageOrchestrator {
  async runFullCoverage() {
    // Returns: { serverCoverage, browserCoverage, analysis }
  }

  async runServerCoverage() {
    // Executes: npm run test:coverage
  }

  async runBrowserCoverage() {
    // Executes: npm run coverage:browser
  }

  async runAnalysis() {
    // Executes: npm run coverage:analyze
  }
}
```

**Inputs:**

- None (uses existing npm scripts)

**Outputs:**

- `coverage/coverage-final.json` - Raw coverage data
- `coverage/analysis-report.json` - Analyzed results
- `coverage/browser/coverage-report.json` - Browser coverage

**Dependencies:**

- Existing npm scripts
- Server must be running for browser coverage

### 2. Code Analyzer

**Purpose:** Parse coverage data and categorize unused code

**Interface:**

```javascript
class CodeAnalyzer {
  analyzeCoverage(coverageData) {
    // Returns: { unused, lowUsage, moderate, wellCovered }
  }

  identifyUnusedFunctions(fileData) {
    // Returns: Array of unused function names and locations
  }

  calculateImpact(item) {
    // Returns: { linesOfCode, estimatedBundleSize, complexity }
  }

  prioritizeItems(items) {
    // Returns: Sorted array by priority (impact × safety)
  }
}
```

**Data Structures:**

```javascript
{
  unused: [
    {
      path: "MyHavokSimCode/SomeFile.js",
      coverage: 0,
      totalLines: 150,
      totalFunctions: 8,
      unusedFunctionNames: ["funcA", "funcB"],
      priority: "high",
      estimatedImpact: { lines: 150, bytes: 4500 }
    }
  ],
  lowUsage: [...],
  moderate: [...],
  wellCovered: [...]
}
```

### 3. Safety Verifier

**Purpose:** Verify code is safe to remove before deletion

**Interface:**

```javascript
class SafetyVerifier {
  async verifyFile(filePath) {
    // Returns: { safe: boolean, reason: string, references: [] }
  }

  async searchReferences(filePath) {
    // Returns: Array of files that reference this file
  }

  async checkDynamicUsage(filePath) {
    // Returns: Boolean indicating dynamic usage patterns
  }

  async checkGitHistory(filePath) {
    // Returns: { lastModified, commits, purpose }
  }

  async isPublicAPI(filePath) {
    // Returns: Boolean indicating if exported/public
  }
}
```

**Verification Rules:**

1. **Safe to Remove:**

   - 0% coverage
   - No references in other files
   - Not dynamically loaded
   - Not part of public API
   - No recent commits (>3 months)

2. **Needs Review:**

   - Has references but low usage
   - Dynamically loaded
   - Part of public API
   - Recent commits

3. **Keep:**
   - Has active references
   - Critical path code
   - Public API with external consumers

### 4. Code Remover

**Purpose:** Safely remove verified unused code

**Interface:**

```javascript
class CodeRemover {
  async removeFile(filePath) {
    // Deletes file and associated test files
  }

  async removeFunction(filePath, functionName) {
    // Removes specific function from file
  }

  async updateImports(removedFile) {
    // Finds and removes import statements
  }

  async validateRemoval() {
    // Runs tests to ensure nothing broke
  }
}
```

**Safety Mechanisms:**

- Create git branch before any deletions
- Remove one item at a time
- Run tests after each removal
- Rollback if tests fail
- Log all actions for audit trail

### 5. Report Generator

**Purpose:** Track metrics and generate comprehensive reports

**Interface:**

```javascript
class ReportGenerator {
  recordBaseline() {
    // Captures: files, LOC, coverage %, bundle size
  }

  recordAction(action, item, result) {
    // Logs: what was done, why, outcome
  }

  calculateImprovements() {
    // Returns: delta metrics (before/after)
  }

  generateMarkdownReport() {
    // Creates: cleanup-report-{timestamp}.md
  }
}
```

**Report Structure:**

```markdown
# Cleanup Report - {timestamp}

## Summary

- Files Removed: X
- Functions Removed: Y
- Lines of Code Reduced: Z
- Coverage Improvement: A% → B%
- Estimated Bundle Size Reduction: C KB

## Actions Taken

### Removed Files

- path/to/file.js - Reason: 0% coverage, no references

### Removed Functions

- path/to/file.js::functionName - Reason: Never called

### Kept (Needs Review)

- path/to/file.js - Reason: Low usage but part of public API

## Metrics

[Before/After comparison table]

## Next Steps

[Recommendations for further cleanup]
```

## Data Models

### Coverage Item

```javascript
{
  type: "file" | "function",
  path: string,
  name: string, // For functions
  coverage: number, // 0-100
  metrics: {
    totalLines: number,
    coveredLines: number,
    totalFunctions: number,
    unusedFunctions: number,
    estimatedBytes: number
  },
  verification: {
    safe: boolean,
    reason: string,
    references: string[],
    isDynamic: boolean,
    isPublicAPI: boolean,
    lastModified: Date
  },
  priority: "high" | "medium" | "low",
  action: "remove" | "review" | "keep" | "pending"
}
```

### Cleanup Action

```javascript
{
  timestamp: Date,
  type: "remove_file" | "remove_function" | "skip",
  item: CoverageItem,
  result: "success" | "failed" | "skipped",
  reason: string,
  testsPass: boolean
}
```

### Cleanup Report

```javascript
{
  timestamp: Date,
  baseline: {
    totalFiles: number,
    totalLines: number,
    coverage: number,
    bundleSize: number
  },
  final: {
    totalFiles: number,
    totalLines: number,
    coverage: number,
    bundleSize: number
  },
  actions: CleanupAction[],
  improvements: {
    filesRemoved: number,
    functionsRemoved: number,
    linesReduced: number,
    coverageImprovement: number,
    bundleSizeReduction: number
  }
}
```

## Error Handling

### Coverage Collection Errors

- **Server not running:** Display clear message to start server
- **Tests fail:** Report which tests failed, don't proceed with cleanup
- **Coverage file missing:** Run tests first before analysis

### Verification Errors

- **Git not available:** Skip git history check, proceed with other verifications
- **File not found:** Log warning, skip item
- **Search timeout:** Mark as "needs manual review"

### Removal Errors

- **File locked:** Skip and log, continue with other items
- **Tests fail after removal:** Rollback deletion, mark as "unsafe"
- **Import update fails:** Manual intervention required, log details

### Rollback Strategy

```javascript
// Before any removals
git checkout -b cleanup-{timestamp}

// After each removal
npm test
if (testsFail) {
  git checkout -- {removedFile}
  logFailure()
}

// If multiple failures
git checkout main
git branch -D cleanup-{timestamp}
```

## Testing Strategy

### Unit Tests

- **CoverageOrchestrator:** Mock npm script execution
- **CodeAnalyzer:** Test with sample coverage data
- **SafetyVerifier:** Test reference detection logic
- **CodeRemover:** Test on dummy files
- **ReportGenerator:** Verify report format

### Integration Tests

- **Full workflow:** Run on a test project with known unused code
- **Rollback:** Verify rollback works when tests fail
- **Report accuracy:** Verify metrics match actual changes

### Manual Testing

- **Run on actual codebase:** Start with dry-run mode
- **Verify no breakage:** Run full test suite after cleanup
- **Review report:** Ensure recommendations make sense

## Implementation Phases

### Phase 1: Analysis (Read-Only)

1. Run server coverage
2. Run browser coverage
3. Analyze results
4. Generate prioritized list
5. No code changes

### Phase 2: Verification (Read-Only)

1. For each unused item, verify safety
2. Categorize: safe/review/keep
3. Generate verification report
4. No code changes

### Phase 3: Cleanup (Destructive)

1. Create git branch
2. Remove safe items one by one
3. Run tests after each removal
4. Rollback if tests fail
5. Commit successful removals

### Phase 4: Reporting

1. Calculate final metrics
2. Generate markdown report
3. Display summary
4. Provide next steps

## Configuration

### Cleanup Configuration File

```javascript
// cleanup-config.json
{
  "thresholds": {
    "unused": 0,
    "lowUsage": 30,
    "moderate": 60
  },
  "safety": {
    "requireZeroReferences": true,
    "checkDynamicUsage": true,
    "checkPublicAPI": true,
    "minDaysSinceModified": 90
  },
  "execution": {
    "dryRun": false,
    "stopOnTestFailure": true,
    "maxItemsPerRun": 50,
    "createBackupBranch": true
  },
  "exclusions": {
    "paths": [
      "MyHavokSimCode/core/**",
      "server.js"
    ],
    "patterns": [
      "**/index.js",
      "**/*Config.js"
    ]
  }
}
```

## Performance Considerations

- **Coverage collection:** ~30-60 seconds for full suite
- **Analysis:** <5 seconds for typical codebase
- **Verification:** ~1 second per file (parallelizable)
- **Removal:** ~5 seconds per file (includes test run)

**Optimization:**

- Run verifications in parallel (10 at a time)
- Cache reference search results
- Skip test runs for obviously safe removals (no imports)

## Security Considerations

- **Backup before deletion:** Always create git branch
- **Audit trail:** Log all actions with timestamps
- **Rollback capability:** Easy revert if issues found
- **No automatic commits:** Require manual review before push
- **Dry-run mode:** Preview changes without executing

## Dependencies

**Existing Tools:**

- c8 (coverage collection)
- Puppeteer (browser coverage)
- analyze-coverage.js (custom analyzer)

**New Dependencies:**

- None (use Node.js built-ins)

**System Requirements:**

- Git (for branching and history)
- Node.js 18+ (for fs, path, child_process)
- Running server (for browser coverage)

## Success Criteria

1. **Coverage analysis completes** without errors
2. **All unused code identified** and categorized
3. **Safety verification** prevents false positives
4. **Code removal** doesn't break tests
5. **Report generated** with accurate metrics
6. **Coverage improves** or stays same (never decreases)
7. **Bundle size reduces** by removing unused code
8. **No regressions** in functionality

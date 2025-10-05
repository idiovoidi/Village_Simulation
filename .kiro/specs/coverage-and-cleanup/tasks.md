# Implementation Plan

- [x] 1. Create cleanup orchestration script





  - Create `cleanup-orchestrator.js` that coordinates the entire cleanup workflow
  - Implement command-line interface with options for dry-run, phases, and configuration
  - Add logging system to track all operations with timestamps
  - _Requirements: 1.1, 1.5, 5.2_

- [ ] 2. Implement coverage analysis phase
  - [ ] 2.1 Create coverage runner that executes existing npm scripts
    - Write function to run `npm run test:coverage` and capture output
    - Write function to check if server is running before browser coverage
    - Write function to run `npm run coverage:browser` if server is available
    - Write function to run `npm run coverage:analyze` and parse results
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [ ] 2.2 Parse and structure coverage data
    - Read `coverage/coverage-final.json` and extract file-level metrics
    - Read `coverage/analysis-report.json` for categorized results
    - Create unified data structure combining server and browser coverage
    - Calculate priority scores based on coverage percentage and file size
    - _Requirements: 1.5, 2.1, 2.5_
  
  - [ ] 2.3 Generate initial analysis report
    - Display summary statistics (total files, coverage %, unused files count)
    - List completely unused files (0% coverage) with file sizes
    - List low-usage files (<30% coverage) with unused function names
    - Save analysis results to `cleanup-analysis.json` for next phases
    - _Requirements: 1.5, 1.6, 2.6_

- [ ] 3. Implement safety verification phase
  - [ ] 3.1 Create reference search functionality
    - Write function to search for import/require statements referencing each file
    - Write function to search for dynamic imports (import(), require with variables)
    - Write function to search for string-based references (file paths in strings)
    - Use grep/ripgrep for fast codebase-wide searches
    - _Requirements: 3.1, 3.2_
  
  - [ ] 3.2 Implement git history checker
    - Write function to get last modification date using `git log`
    - Write function to count commits in last 90 days for each file
    - Write function to extract commit messages for context
    - Handle cases where git is not available gracefully
    - _Requirements: 3.4_
  
  - [ ] 3.3 Create public API detector
    - Check if file has `export` statements (ES modules)
    - Check if file has `module.exports` (CommonJS)
    - Check if file is referenced in package.json (main, exports fields)
    - Check if file is in a public-facing directory (e.g., not in internal/)
    - _Requirements: 3.5_
  
  - [ ] 3.4 Build verification decision engine
    - Implement rules to categorize files as: safe/review/keep
    - Mark as "safe" if: 0% coverage, no references, not public API, no recent commits
    - Mark as "review" if: low coverage but has some references or is public API
    - Mark as "keep" if: has active references or critical path
    - Generate verification report with reasoning for each decision
    - _Requirements: 3.5, 3.6, 2.6_

- [ ] 4. Implement code removal phase
  - [ ] 4.1 Create git branch manager
    - Write function to create cleanup branch with timestamp
    - Write function to check current git status before starting
    - Write function to commit changes with descriptive messages
    - Write function to rollback changes if tests fail
    - _Requirements: 4.6_
  
  - [ ] 4.2 Implement file removal functionality
    - Write function to delete a file from filesystem
    - Write function to find and delete associated test files
    - Write function to stage deletions in git
    - Add confirmation prompt for each deletion (unless --yes flag)
    - _Requirements: 4.1, 4.2_
  
  - [ ] 4.3 Implement import statement updater
    - Search for all files that import the removed file
    - Remove or comment out import statements
    - Remove unused variable declarations from removed imports
    - Handle both ES6 imports and CommonJS requires
    - _Requirements: 4.3_
  
  - [ ] 4.4 Implement function-level removal
    - Parse JavaScript files to identify function boundaries
    - Remove specific unused functions while keeping used ones
    - Update exports if removed function was exported
    - Preserve file structure and formatting
    - _Requirements: 4.4_
  
  - [ ] 4.5 Create test validation runner
    - Run `npm test` after each removal or batch of removals
    - Capture test output and parse for failures
    - If tests fail, rollback the last change and log the failure
    - Continue with next item if one fails (unless --stop-on-failure flag)
    - _Requirements: 4.5_

- [ ] 5. Implement reporting and metrics phase
  - [ ] 5.1 Create baseline metrics collector
    - Count total files in codebase before cleanup
    - Count total lines of code using simple line counter
    - Record current coverage percentage from coverage reports
    - Estimate bundle size by summing file sizes
    - _Requirements: 5.1_
  
  - [ ] 5.2 Implement action logger
    - Log each action with timestamp, type, item, and result
    - Log reasoning for each decision (removed/kept/skipped)
    - Track test results after each removal
    - Save action log to JSON file for audit trail
    - _Requirements: 5.2_
  
  - [ ] 5.3 Calculate improvement metrics
    - Count files removed and functions removed
    - Calculate lines of code reduction
    - Calculate coverage improvement (run coverage again)
    - Calculate bundle size reduction
    - _Requirements: 5.3, 5.4_
  
  - [ ] 5.4 Generate markdown cleanup report
    - Create report with summary section (key metrics)
    - Add "Actions Taken" section with removed files and functions
    - Add "Kept for Review" section with items needing manual review
    - Add before/after metrics comparison table
    - Add "Next Steps" recommendations
    - Save report as `cleanup-report-{timestamp}.md`
    - _Requirements: 5.4, 5.5_
  
  - [ ] 5.5 Display terminal summary
    - Print colorized summary of cleanup results
    - Show key metrics: files removed, LOC reduced, coverage improvement
    - Display path to detailed report
    - Show next steps and recommendations
    - _Requirements: 5.6_

- [ ] 6. Create configuration and CLI
  - [ ] 6.1 Create cleanup configuration file
    - Create `cleanup-config.json` with thresholds, safety rules, and exclusions
    - Add documentation comments explaining each configuration option
    - Provide sensible defaults that prioritize safety
    - _Requirements: 2.1, 3.5_
  
  - [ ] 6.2 Implement CLI argument parsing
    - Add `--dry-run` flag to preview changes without executing
    - Add `--phase` flag to run specific phases (analysis, verify, cleanup, report)
    - Add `--yes` flag to skip confirmation prompts
    - Add `--config` flag to specify custom configuration file
    - Add `--help` flag to display usage information
    - _Requirements: 1.1, 4.1_
  
  - [ ] 6.3 Add npm script for cleanup
    - Add `npm run cleanup` script to package.json
    - Add `npm run cleanup:dry-run` for safe preview
    - Add `npm run cleanup:analyze` for analysis only
    - Update documentation with new scripts
    - _Requirements: 1.1_

- [ ] 7. Integration and end-to-end testing
  - [ ] 7.1 Test full workflow on sample project
    - Create a test directory with sample files (some unused)
    - Run full cleanup workflow and verify correct files are removed
    - Verify tests still pass after cleanup
    - Verify report is generated correctly
    - _Requirements: 4.5, 5.4_
  
  - [ ] 7.2 Test rollback functionality
    - Simulate test failure after removal
    - Verify file is restored correctly
    - Verify git state is clean after rollback
    - _Requirements: 4.5_
  
  - [ ] 7.3 Test edge cases
    - Test with files that have circular dependencies
    - Test with dynamically imported files
    - Test with files that are part of public API
    - Test with files modified recently
    - Verify all edge cases are handled gracefully
    - _Requirements: 3.2, 3.3, 3.5_

- [ ] 8. Documentation and final polish
  - [ ] 8.1 Create cleanup guide documentation
    - Write `CLEANUP_GUIDE.md` with usage instructions
    - Document all CLI flags and configuration options
    - Provide examples of common cleanup scenarios
    - Add troubleshooting section for common issues
    - _Requirements: 5.6_
  
  - [ ] 8.2 Update existing documentation
    - Update README with cleanup workflow information
    - Add cleanup to the coverage guide
    - Document the cleanup report format
    - _Requirements: 5.6_
  
  - [ ] 8.3 Add safety warnings and best practices
    - Add prominent warnings about backup and testing
    - Document recommended workflow (dry-run first)
    - Add checklist for manual review items
    - Document how to revert if issues are found
    - _Requirements: 4.5, 5.6_

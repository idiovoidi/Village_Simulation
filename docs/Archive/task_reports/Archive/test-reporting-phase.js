#!/usr/bin/env node

/**
 * Test script for reporting phase implementation
 * Tests the new reporting components in isolation
 */

const {
  Logger,
  BaselineMetricsCollector,
  ActionLogger,
  ImprovementMetricsCalculator,
  CleanupReportGenerator,
  TerminalSummaryDisplay
} = require('../cleanup-orchestrator.js');

async function testBaselineMetricsCollector() {
  console.log('\n=== Testing BaselineMetricsCollector ===\n');
  
  const logger = new Logger({ verbose: false });
  const collector = new BaselineMetricsCollector(logger);
  
  // Test collecting baseline metrics
  const baseline = collector.collectBaseline();
  
  console.log('Baseline metrics collected:');
  console.log(`  Total Files: ${baseline.totalFiles}`);
  console.log(`  Total Lines: ${baseline.totalLines.toLocaleString()}`);
  console.log(`  Coverage: ${baseline.coverage !== null ? baseline.coverage.toFixed(2) + '%' : 'N/A'}`);
  console.log(`  Bundle Size: ${(baseline.bundleSize / 1024).toFixed(2)} KB`);
  
  return baseline;
}

async function testActionLogger() {
  console.log('\n=== Testing ActionLogger ===\n');
  
  const logger = new Logger({ verbose: false });
  const actionLogger = new ActionLogger(logger);
  
  // Test logging different types of actions
  actionLogger.logFileRemoval('test/file1.js', 'success', 'File has 0% coverage');
  actionLogger.logFileRemoval('test/file2.js', 'failed', 'Tests failed after removal');
  actionLogger.logFunctionRemoval('test/file3.js', 'unusedFunction', 'success', 'Function never called');
  actionLogger.logFileKept('test/file4.js', 'Part of public API');
  actionLogger.logFileReview('test/file5.js', 'Has dynamic imports');
  
  // Get summary
  const summary = actionLogger.getSummary();
  console.log('Action summary:');
  console.log(`  Total actions: ${summary.total}`);
  console.log(`  By type:`, summary.byType);
  console.log(`  By result:`, summary.byResult);
  
  // Test saving to file
  actionLogger.saveToFile('test-cleanup-actions.json');
  
  return actionLogger;
}

async function testImprovementMetricsCalculator() {
  console.log('\n=== Testing ImprovementMetricsCalculator ===\n');
  
  const logger = new Logger({ verbose: false });
  const baselineCollector = new BaselineMetricsCollector(logger);
  const actionLogger = new ActionLogger(logger);
  
  // Add some test actions
  actionLogger.logFileRemoval('test/file1.js', 'success', 'Unused file');
  actionLogger.logFileRemoval('test/file2.js', 'success', 'Unused file');
  actionLogger.logFunctionRemoval('test/file3.js', 'func1', 'success', 'Unused function');
  
  const calculator = new ImprovementMetricsCalculator(logger, baselineCollector, actionLogger);
  
  // Create mock baseline and current metrics
  const baseline = {
    timestamp: new Date().toISOString(),
    totalFiles: 100,
    totalLines: 10000,
    coverage: 75.5,
    bundleSize: 500000
  };
  
  const current = {
    timestamp: new Date().toISOString(),
    totalFiles: 98,
    totalLines: 9500,
    coverage: 76.2,
    bundleSize: 480000
  };
  
  // Calculate improvements
  const filesRemoved = calculator.countFilesRemoved();
  const functionsRemoved = calculator.countFunctionsRemoved();
  const linesReduced = calculator.calculateLinesReduced(baseline, current);
  const coverageImprovement = calculator.calculateCoverageImprovement(baseline, current);
  const bundleSizeReduction = calculator.calculateBundleSizeReduction(baseline, current);
  
  console.log('Improvement metrics:');
  console.log(`  Files Removed: ${filesRemoved}`);
  console.log(`  Functions Removed: ${functionsRemoved}`);
  console.log(`  Lines Reduced: ${linesReduced.toLocaleString()}`);
  console.log(`  Coverage Improvement: ${coverageImprovement >= 0 ? '+' : ''}${coverageImprovement.toFixed(2)}%`);
  console.log(`  Bundle Size Reduced: ${(bundleSizeReduction / 1024).toFixed(2)} KB`);
  
  return {
    filesRemoved,
    functionsRemoved,
    linesReduced,
    coverageImprovement,
    bundleSizeReduction,
    baseline,
    current
  };
}

async function testCleanupReportGenerator() {
  console.log('\n=== Testing CleanupReportGenerator ===\n');
  
  const logger = new Logger({ verbose: false });
  const actionLogger = new ActionLogger(logger);
  
  // Add some test actions
  actionLogger.logFileRemoval('MyHavokSimCode/UnusedFile1.js', 'success', 'File has 0% coverage, no references');
  actionLogger.logFileRemoval('MyHavokSimCode/UnusedFile2.js', 'success', 'File has 0% coverage, no references');
  actionLogger.logFunctionRemoval('MyHavokSimCode/PartialFile.js', 'unusedFunction', 'success', 'Function never called');
  actionLogger.logFileReview('MyHavokSimCode/LowUsage.js', 'Low coverage but has references');
  
  const reportGenerator = new CleanupReportGenerator(logger, actionLogger);
  
  // Create mock improvements
  const improvements = {
    filesRemoved: 2,
    functionsRemoved: 1,
    linesReduced: 500,
    coverageImprovement: 0.7,
    bundleSizeReduction: 20000,
    baseline: {
      totalFiles: 100,
      totalLines: 10000,
      coverage: 75.5,
      bundleSize: 500000
    },
    current: {
      totalFiles: 98,
      totalLines: 9500,
      coverage: 76.2,
      bundleSize: 480000
    }
  };
  
  // Create mock verification results
  const verificationResults = {
    safe: [],
    review: [
      {
        path: 'MyHavokSimCode/LowUsage.js',
        coverage: 25,
        verification: {
          reason: 'Low coverage but has references',
          details: {
            references: 3,
            isPublicAPI: false
          }
        }
      }
    ],
    keep: []
  };
  
  // Generate report
  const reportContent = reportGenerator.generateMarkdownReport(improvements, verificationResults);
  
  console.log('Generated report preview (first 500 chars):');
  console.log(reportContent.substring(0, 500) + '...\n');
  
  // Save report
  const reportPath = reportGenerator.saveReport(reportContent, 'test-cleanup-report.md');
  console.log(`Full report saved to: ${reportPath}`);
  
  return reportContent;
}

async function testTerminalSummaryDisplay() {
  console.log('\n=== Testing TerminalSummaryDisplay ===\n');
  
  const logger = new Logger({ verbose: false });
  const display = new TerminalSummaryDisplay(logger);
  
  // Create mock improvements
  const improvements = {
    filesRemoved: 2,
    functionsRemoved: 1,
    linesReduced: 500,
    coverageImprovement: 0.7,
    bundleSizeReduction: 20000,
    baseline: {
      totalFiles: 100,
      totalLines: 10000,
      coverage: 75.5,
      bundleSize: 500000
    },
    current: {
      totalFiles: 98,
      totalLines: 9500,
      coverage: 76.2,
      bundleSize: 480000
    }
  };
  
  // Create mock verification results
  const verificationResults = {
    review: [
      {
        path: 'MyHavokSimCode/LowUsage.js',
        coverage: 25
      }
    ]
  };
  
  // Display summary
  display.displaySummary(improvements, 'test-cleanup-report.md', verificationResults);
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         Testing Reporting Phase Implementation            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  try {
    await testBaselineMetricsCollector();
    await testActionLogger();
    await testImprovementMetricsCalculator();
    await testCleanupReportGenerator();
    await testTerminalSummaryDisplay();
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              All Tests Completed Successfully!            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log('Generated test files:');
    console.log('  - test-cleanup-actions.json');
    console.log('  - test-cleanup-report.md');
    console.log('\nYou can review these files to see the output format.\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runAllTests();

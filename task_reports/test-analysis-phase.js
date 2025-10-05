#!/usr/bin/env node

/**
 * Test script for the coverage analysis phase
 * This demonstrates the analysis phase functionality
 */

const { CleanupOrchestrator } = require('../cleanup-orchestrator.js');

async function testAnalysisPhase() {
  console.log('Testing Coverage Analysis Phase');
  console.log('================================\n');

  // Create orchestrator with analysis phase only
  const orchestrator = new CleanupOrchestrator({
    phase: 'analysis',
    verbose: true,
    dryRun: true
  });

  try {
    console.log('Running analysis phase...\n');
    const result = await orchestrator.run();

    if (result.success) {
      console.log('\n✅ Analysis phase completed successfully!');
      console.log('\nResults:');
      console.log('- Coverage data collected');
      console.log('- Data parsed and structured');
      console.log('- Analysis report generated');
      console.log('- Results saved to cleanup-analysis.json');
    } else {
      console.log('\n❌ Analysis phase failed');
      console.log('Error:', result.error);
    }
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nNote: This test requires:');
    console.error('1. Run "npm run test:coverage" first to generate coverage data');
    console.error('2. Run "npm run coverage:analyze" to generate analysis report');
    console.error('3. Then run this test script');
  }
}

// Run test
testAnalysisPhase();

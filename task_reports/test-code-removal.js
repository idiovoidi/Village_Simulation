#!/usr/bin/env node

/**
 * Test script for code removal phase components
 * Tests GitBranchManager, FileRemover, ImportUpdater, FunctionRemover, and TestValidator
 */

const {
  GitBranchManager,
  FileRemover,
  ImportUpdater,
  FunctionRemover,
  TestValidator,
  Logger
} = require('../cleanup-orchestrator.js');

async function testGitBranchManager() {
  console.log('\n=== Testing GitBranchManager ===\n');
  
  const logger = new Logger({ verbose: true });
  const gitManager = new GitBranchManager(logger);

  try {
    // Test git status check
    console.log('1. Checking git status...');
    const status = await gitManager.checkGitStatus();
    console.log(`   Current branch: ${status.branch}`);
    console.log(`   Clean: ${status.clean}`);
    console.log(`   Uncommitted files: ${status.uncommitted.length}`);

    // Test getting current commit
    console.log('\n2. Getting current commit...');
    const commit = await gitManager.getCurrentCommit();
    console.log(`   Current commit: ${commit}`);

    console.log('\n✅ GitBranchManager tests passed');
    return true;
  } catch (error) {
    console.error('❌ GitBranchManager test failed:', error.message);
    return false;
  }
}

async function testFileRemover() {
  console.log('\n=== Testing FileRemover ===\n');
  
  const logger = new Logger({ verbose: false });
  const gitManager = new GitBranchManager(logger);
  const fileRemover = new FileRemover(logger, gitManager, { skipConfirmation: true });

  try {
    // Test finding test files
    console.log('1. Testing test file detection...');
    const testFiles = fileRemover.findTestFiles('cleanup-orchestrator.js');
    console.log(`   Found ${testFiles.length} test file(s)`);
    
    if (testFiles.length > 0) {
      console.log('   Test files:');
      testFiles.forEach(f => console.log(`     - ${f}`));
    }

    console.log('\n✅ FileRemover tests passed');
    return true;
  } catch (error) {
    console.error('❌ FileRemover test failed:', error.message);
    return false;
  }
}

async function testImportUpdater() {
  console.log('\n=== Testing ImportUpdater ===\n');
  
  const logger = new Logger({ verbose: false });
  const { SafetyVerifier, ConfigManager } = require('../cleanup-orchestrator.js');
  const config = new ConfigManager(null, logger);
  const safetyVerifier = new SafetyVerifier(logger, config);
  const importUpdater = new ImportUpdater(logger, safetyVerifier);

  try {
    console.log('1. Testing import search...');
    // This will search for files that import cleanup-orchestrator
    const importingFiles = await importUpdater.findImportingFiles('cleanup-orchestrator.js');
    console.log(`   Found ${importingFiles.length} file(s) that import cleanup-orchestrator.js`);

    console.log('\n✅ ImportUpdater tests passed');
    return true;
  } catch (error) {
    console.error('❌ ImportUpdater test failed:', error.message);
    return false;
  }
}

async function testFunctionRemover() {
  console.log('\n=== Testing FunctionRemover ===\n');
  
  const logger = new Logger({ verbose: false });
  const functionRemover = new FunctionRemover(logger);

  try {
    console.log('1. Testing function parsing...');
    
    const sampleCode = `
function testFunction1() {
  console.log('test');
}

const testFunction2 = function() {
  return 42;
};

const testFunction3 = () => {
  return 'arrow';
};

class TestClass {
  testMethod() {
    return true;
  }
}
`;

    const functions = functionRemover.parseFunctions(sampleCode);
    console.log(`   Found ${functions.length} function(s)`);
    
    functions.forEach(func => {
      console.log(`     - ${func.name} (${func.type}) at lines ${func.start + 1}-${func.end + 1}`);
    });

    console.log('\n✅ FunctionRemover tests passed');
    return true;
  } catch (error) {
    console.error('❌ FunctionRemover test failed:', error.message);
    return false;
  }
}

async function testTestValidator() {
  console.log('\n=== Testing TestValidator ===\n');
  
  const logger = new Logger({ verbose: false });
  const gitManager = new GitBranchManager(logger);
  const testValidator = new TestValidator(logger, gitManager, { stopOnFailure: false });

  try {
    console.log('1. Testing test failure parsing...');
    
    const sampleOutput = `
FAIL  test/sample.test.js
  ✕ should pass test (5 ms)
  
  Error: Expected true to be false
`;

    const failures = testValidator._parseTestFailures(sampleOutput, '');
    console.log(`   Parsed ${failures.length} failure(s)`);

    console.log('\n✅ TestValidator tests passed');
    return true;
  } catch (error) {
    console.error('❌ TestValidator test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('Testing Code Removal Phase Components');
  console.log('======================================');

  const results = {
    gitBranchManager: await testGitBranchManager(),
    fileRemover: await testFileRemover(),
    importUpdater: await testImportUpdater(),
    functionRemover: await testFunctionRemover(),
    testValidator: await testTestValidator()
  };

  console.log('\n\n=== Test Summary ===\n');
  
  let passed = 0;
  let failed = 0;

  for (const [component, result] of Object.entries(results)) {
    const status = result ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${component}`);
    
    if (result) passed++;
    else failed++;
  }

  console.log(`\nTotal: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { main };

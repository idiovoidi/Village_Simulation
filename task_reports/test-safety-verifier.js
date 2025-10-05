#!/usr/bin/env node

/**
 * Test script for SafetyVerifier functionality
 */

const { SafetyVerifier, Logger, ConfigManager } = require('../cleanup-orchestrator.js');

async function testSafetyVerifier() {
  console.log('Testing SafetyVerifier functionality...\n');

  const logger = new Logger({ verbose: true });
  const config = new ConfigManager(null, logger);
  const verifier = new SafetyVerifier(logger, config);

  // Test 1: Search for references to a known file
  console.log('='.repeat(60));
  console.log('Test 1: Search for import references');
  console.log('='.repeat(60));
  
  const testFile = 'MyHavokSimCode/NewVillageEngine.js';
  console.log(`Searching for references to: ${testFile}\n`);
  
  try {
    const references = await verifier.searchAllReferences(testFile);
    console.log(`Found ${references.total} total references:`);
    console.log(`  - Import/require statements: ${references.imports.length}`);
    console.log(`  - Dynamic imports: ${references.dynamic.length}`);
    console.log(`  - String references: ${references.strings.length}`);
    
    if (references.imports.length > 0) {
      console.log('\nSample import references:');
      references.imports.slice(0, 3).forEach(ref => {
        console.log(`  ${ref.file}:${ref.line} - ${ref.content.substring(0, 80)}`);
      });
    }
  } catch (error) {
    console.error('Error searching references:', error.message);
  }

  // Test 2: Check git history
  console.log('\n' + '='.repeat(60));
  console.log('Test 2: Check git history');
  console.log('='.repeat(60));
  console.log(`Checking git history for: ${testFile}\n`);
  
  try {
    const gitHistory = await verifier.getGitHistory(testFile);
    console.log(`Is in git: ${gitHistory.isInGit}`);
    console.log(`Last modified: ${gitHistory.lastModified || 'N/A'}`);
    console.log(`Recent commits (90 days): ${gitHistory.recentCommits}`);
    
    if (gitHistory.commits.length > 0) {
      console.log('\nRecent commit messages:');
      gitHistory.commits.slice(0, 3).forEach(commit => {
        console.log(`  ${commit.date.split('T')[0]} - ${commit.message.substring(0, 60)}`);
      });
    }
  } catch (error) {
    console.error('Error checking git history:', error.message);
  }

  // Test 3: Check if file is public API
  console.log('\n' + '='.repeat(60));
  console.log('Test 3: Check public API status');
  console.log('='.repeat(60));
  console.log(`Checking if ${testFile} is public API\n`);
  
  try {
    const publicAPI = await verifier.isPublicAPI(testFile);
    console.log(`Is public API: ${publicAPI.isPublicAPI}`);
    if (publicAPI.reasons.length > 0) {
      console.log('Reasons:');
      publicAPI.reasons.forEach(reason => {
        console.log(`  - ${reason}`);
      });
    }
  } catch (error) {
    console.error('Error checking public API:', error.message);
  }

  // Test 4: Full verification
  console.log('\n' + '='.repeat(60));
  console.log('Test 4: Full file verification');
  console.log('='.repeat(60));
  console.log(`Running full verification for: ${testFile}\n`);
  
  try {
    const verification = await verifier.verifyFile(testFile, { coverage: 85 });
    console.log(`Category: ${verification.category}`);
    console.log(`Safe to remove: ${verification.safe}`);
    console.log(`Reason: ${verification.reason}`);
    console.log('\nDetails:');
    console.log(`  Coverage: ${verification.details.coverage}%`);
    console.log(`  References: ${verification.details.references}`);
    console.log(`  Recent commits: ${verification.details.recentCommits}`);
    console.log(`  Is public API: ${verification.details.isPublicAPI}`);
  } catch (error) {
    console.error('Error during verification:', error.message);
  }

  // Test 5: Test with a potentially unused file
  console.log('\n' + '='.repeat(60));
  console.log('Test 5: Verify potentially unused file');
  console.log('='.repeat(60));
  
  const unusedFile = 'test-analysis-phase.js';
  console.log(`Running verification for: ${unusedFile}\n`);
  
  try {
    const verification = await verifier.verifyFile(unusedFile, { coverage: 0 });
    console.log(`Category: ${verification.category}`);
    console.log(`Safe to remove: ${verification.safe}`);
    console.log(`Reason: ${verification.reason}`);
    console.log('\nDetails:');
    console.log(`  Coverage: ${verification.details.coverage}%`);
    console.log(`  References: ${verification.details.references}`);
    console.log(`  Recent commits: ${verification.details.recentCommits}`);
  } catch (error) {
    console.error('Error during verification:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('SafetyVerifier tests completed!');
  console.log('='.repeat(60));
}

// Run tests
testSafetyVerifier().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});

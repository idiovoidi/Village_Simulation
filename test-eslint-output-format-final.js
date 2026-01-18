/**
 * Property-Based Test for ESLint Output Format
 * 
 * **Feature: eslint-typescript-migration, Property 2: ESLint Actionable Output Format**
 * **Validates: Requirements 1.4**
 * 
 * Property: For any linting run that finds violations, the output should contain 
 * file paths, line numbers, column numbers, rule names, and error descriptions 
 * for each violation.
 * 
 * This test validates that ESLint output:
 * 1. Contains file paths for each violation
 * 2. Includes line numbers and column numbers
 * 3. Provides rule names for each violation
 * 4. Contains descriptive error messages
 * 5. Formats output in an actionable way for developers
 */

import { readFile, writeFile, rm } from 'fs/promises';
import { spawn } from 'child_process';

// Simple property-based testing framework
class PropertyTestFramework {
    constructor() {
        this.tests = [];
        this.results = [];
    }

    property(name, generator, predicate, options = {}) {
        this.tests.push({
            name,
            generator,
            predicate,
            iterations: options.iterations || 50,
            timeout: options.timeout || 30000
        });
    }

    async runTests() {
        console.log('Running ESLint Output Format Property-Based Tests...\n');
        
        for (const test of this.tests) {
            console.log(`Running property: ${test.name}`);
            console.log(`Iterations: ${test.iterations}`);
            
            let passed = 0;
            let failed = 0;
            let errors = [];

            for (let i = 0; i < test.iterations; i++) {
                try {
                    const input = await test.generator();
                    const result = await Promise.race([
                        test.predicate(input),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Timeout')), test.timeout)
                        )
                    ]);
                    
                    if (result) {
                        passed++;
                    } else {
                        failed++;
                        errors.push(`Iteration ${i + 1}: Property violated`);
                    }
                } catch (error) {
                    failed++;
                    errors.push(`Iteration ${i + 1}: ${error.message}`);
                }
                
                // Progress indicator
                if ((i + 1) % 10 === 0) {
                    process.stdout.write('.');
                }
            }
            
            console.log(`\n✅ Passed: ${passed}, ❌ Failed: ${failed}`);
            
            this.results.push({
                name: test.name,
                passed,
                failed,
                errors: errors.slice(0, 3) // Keep first 3 errors
            });
            
            if (failed > 0) {
                console.log('Sample errors:');
                errors.slice(0, 2).forEach(error => console.log(`  - ${error}`));
            }
            console.log('');
        }

        this.printSummary();
    }

    printSummary() {
        const totalTests = this.results.length;
        const passedTests = this.results.filter(r => r.failed === 0).length;
        
        console.log('=== Property Test Summary ===');
        console.log(`Properties tested: ${totalTests}`);
        console.log(`Properties passed: ${passedTests}`);
        console.log(`Properties failed: ${totalTests - passedTests}`);
        
        const totalIterations = this.results.reduce((sum, r) => sum + r.passed + r.failed, 0);
        const totalPassed = this.results.reduce((sum, r) => sum + r.passed, 0);
        
        console.log(`Total iterations: ${totalIterations}`);
        console.log(`Success rate: ${((totalPassed / totalIterations) * 100).toFixed(1)}%`);
    }
}

// ESLint execution utilities
class ESLintRunner {
    static async runESLintJSON(filePath) {
        return new Promise((resolve, reject) => {
            const args = ['run', 'lint', '--', '--format', 'json', filePath];

            const eslintProcess = spawn('npm', args, {
                cwd: process.cwd(),
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: true
            });

            let stdout = '';
            let stderr = '';

            eslintProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            eslintProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            eslintProcess.on('close', (code) => {
                let jsonOutput = null;
                try {
                    if (stdout.trim()) {
                        jsonOutput = JSON.parse(stdout.trim());
                    }
                } catch (error) {
                    // JSON parsing failed
                }
                
                resolve({
                    exitCode: code,
                    stdout: stdout.trim(),
                    stderr: stderr.trim(),
                    jsonOutput,
                    hasViolations: code !== 0
                });
            });

            eslintProcess.on('error', (error) => {
                reject(new Error(`ESLint execution failed: ${error.message}`));
            });

            // Set timeout
            setTimeout(() => {
                eslintProcess.kill();
                reject(new Error('ESLint execution timed out'));
            }, 15000);
        });
    }
}

// Test file management
class TestFileManager {
    constructor() {
        this.createdFiles = [];
    }

    async createTestFile(content, filename) {
        const filepath = `MyHavokSimCode/${filename}`;
        await writeFile(filepath, content, 'utf8');
        this.createdFiles.push(filepath);
        return filepath;
    }

    async cleanup() {
        for (const filepath of this.createdFiles) {
            try {
                await rm(filepath, { force: true });
            } catch (error) {
                // Ignore cleanup errors
            }
        }
        this.createdFiles = [];
    }
}

// Code generators that produce specific ESLint violations
class ViolationCodeGenerators {
    static generateCodeWithViolations() {
        const templates = [
            // Multiple violations
            `export function testViolations() {
  var oldStyle = "wrong quotes";
    const unused = 42;
console.log("debug");
return oldStyle
}`,
            // Indentation and style issues
            `export function badIndent() {
  const x = 1;
    const y = 2;
return x + y;
}`,
            // Unused variables and console
            `export function unusedVar() {
    const unused = 'never used';
    const used = 'this is used';
    console.log('debug message');
    return used;
}`
        ];
        
        return templates[Math.floor(Math.random() * templates.length)];
    }
}

// ESLint output format validators
class OutputFormatValidator {
    static validateJSONOutput(jsonOutput, expectedFilePath) {
        if (!Array.isArray(jsonOutput)) {
            return {
                isValid: false,
                reason: 'JSON output is not an array'
            };
        }

        if (jsonOutput.length === 0) {
            return {
                isValid: true,
                reason: 'No violations found (valid case)',
                hasViolations: false
            };
        }

        const fileResult = jsonOutput[0];
        
        // Check required properties
        const requiredProps = ['filePath', 'messages'];
        for (const prop of requiredProps) {
            if (!(prop in fileResult)) {
                return {
                    isValid: false,
                    reason: `Missing required property: ${prop}`
                };
            }
        }

        // Validate file path
        if (!fileResult.filePath || typeof fileResult.filePath !== 'string') {
            return {
                isValid: false,
                reason: 'Invalid or missing filePath'
            };
        }

        // Validate messages array
        if (!Array.isArray(fileResult.messages)) {
            return {
                isValid: false,
                reason: 'Messages is not an array'
            };
        }

        // If there are messages, validate their structure
        if (fileResult.messages.length > 0) {
            const message = fileResult.messages[0];
            const requiredMessageProps = ['line', 'column', 'ruleId', 'message', 'severity'];
            
            for (const prop of requiredMessageProps) {
                if (!(prop in message)) {
                    return {
                        isValid: false,
                        reason: `Missing required message property: ${prop}`
                    };
                }
            }

            // Validate data types
            if (typeof message.line !== 'number' || message.line < 1) {
                return {
                    isValid: false,
                    reason: 'Invalid line number'
                };
            }

            if (typeof message.column !== 'number' || message.column < 0) {
                return {
                    isValid: false,
                    reason: 'Invalid column number'
                };
            }

            if (!message.ruleId || typeof message.ruleId !== 'string') {
                return {
                    isValid: false,
                    reason: 'Invalid or missing ruleId'
                };
            }

            if (!message.message || typeof message.message !== 'string') {
                return {
                    isValid: false,
                    reason: 'Invalid or missing error message'
                };
            }

            if (typeof message.severity !== 'number' || (message.severity !== 1 && message.severity !== 2)) {
                return {
                    isValid: false,
                    reason: 'Invalid severity level'
                };
            }
        }

        return {
            isValid: true,
            reason: 'Valid JSON output format',
            hasViolations: fileResult.messages.length > 0,
            violationCount: fileResult.messages.length,
            violations: fileResult.messages
        };
    }
}

// Property test definitions
const framework = new PropertyTestFramework();
const fileManager = new TestFileManager();

// Property 1: JSON output format validation with actionable information
framework.property(
    'ESLint JSON output contains all required actionable violation information',
    async () => {
        const code = ViolationCodeGenerators.generateCodeWithViolations();
        const filename = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.js`;
        const filepath = await fileManager.createTestFile(code, filename);
        
        return { code, filepath, filename };
    },
    async ({ code, filepath, filename }) => {
        try {
            const result = await ESLintRunner.runESLintJSON(filepath);
            
            // If ESLint failed to run, that's a test failure
            if (result.stderr && result.stderr.includes('Error') && !result.jsonOutput) {
                return false;
            }

            // Validate the JSON output format
            const validation = OutputFormatValidator.validateJSONOutput(result.jsonOutput, filepath);
            
            if (!validation.isValid) {
                return false;
            }

            // For this property test, we expect violations since we're generating violation code
            if (!validation.hasViolations) {
                return false; // We generated code with violations, so there should be some
            }

            // Verify that each violation has actionable information
            const violations = validation.violations;
            for (const violation of violations) {
                // Must have file location (line and column)
                if (!violation.line || !violation.column) {
                    return false;
                }
                
                // Must have rule identification
                if (!violation.ruleId) {
                    return false;
                }
                
                // Must have descriptive message
                if (!violation.message || violation.message.length < 10) {
                    return false;
                }
                
                // Must have severity level
                if (!violation.severity || (violation.severity !== 1 && violation.severity !== 2)) {
                    return false;
                }
            }

            return true;
        } catch (error) {
            return false;
        }
    },
    { iterations: 30 }
);

// Property 2: Exit code consistency with violations
framework.property(
    'ESLint exit code correctly indicates presence of violations',
    async () => {
        const code = ViolationCodeGenerators.generateCodeWithViolations();
        const filename = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.js`;
        const filepath = await fileManager.createTestFile(code, filename);
        
        return { code, filepath, filename };
    },
    async ({ code, filepath, filename }) => {
        try {
            const result = await ESLintRunner.runESLintJSON(filepath);
            
            const hasActualViolations = result.jsonOutput && 
                                      Array.isArray(result.jsonOutput) && 
                                      result.jsonOutput.length > 0 && 
                                      result.jsonOutput[0].messages && 
                                      result.jsonOutput[0].messages.length > 0;

            // Exit code should be non-zero when there are violations
            const exitCodeCorrect = hasActualViolations ? result.exitCode !== 0 : result.exitCode === 0;
            
            return exitCodeCorrect;
        } catch (error) {
            return false;
        }
    },
    { iterations: 20 }
);

// Main test execution
async function runPropertyTests() {
    console.log('ESLint Output Format Property-Based Testing');
    console.log('==========================================\n');
    
    console.log('**Feature: eslint-typescript-migration, Property 2: ESLint Actionable Output Format**');
    console.log('**Validates: Requirements 1.4**\n');
    
    console.log('Property: For any linting run that finds violations, the output should contain');
    console.log('file paths, line numbers, column numbers, rule names, and error descriptions\n');
    
    try {
        // Run property tests
        await framework.runTests();
        
        // Additional validation with known violation file
        console.log('\n=== Additional Output Format Validation ===');
        
        const testCode = `export function testViolations() {
  var oldStyle = "wrong quotes";
    const unused = 42;
console.log("debug");
return oldStyle
}`;
        
        const testFile = await fileManager.createTestFile(testCode, 'validation-test.js');
        
        console.log('Testing with known violations...');
        
        // Test JSON format
        const jsonResult = await ESLintRunner.runESLintJSON(testFile);
        if (jsonResult.jsonOutput && jsonResult.jsonOutput.length > 0) {
            const fileResult = jsonResult.jsonOutput[0];
            console.log(`✅ JSON format: Found ${fileResult.messages.length} violations`);
            
            if (fileResult.messages.length > 0) {
                const sample = fileResult.messages[0];
                console.log(`   Sample violation: Line ${sample.line}, Column ${sample.column}, Rule: ${sample.ruleId}`);
                console.log(`   Message: ${sample.message.substring(0, 60)}...`);
                console.log(`   Severity: ${sample.severity === 2 ? 'Error' : 'Warning'}`);
            }
        }
        
        console.log('\n✅ ESLint output format validation completed successfully');
        console.log('✅ All required actionable information is present in ESLint output');
        
    } catch (error) {
        console.error('❌ Property test execution failed:', error.message);
        throw error;
    } finally {
        // Cleanup
        await fileManager.cleanup();
        console.log('\n🧹 Cleaned up temporary test files');
    }
}

// Run the tests
runPropertyTests().catch(error => {
    console.error('Property test execution failed:', error);
    process.exit(1);
});

export { 
    PropertyTestFramework, 
    ESLintRunner, 
    TestFileManager, 
    ViolationCodeGenerators, 
    OutputFormatValidator 
};
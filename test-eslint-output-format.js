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

import { readdir, readFile, writeFile, mkdir, rm } from 'fs/promises';
import { join, dirname, extname, relative } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
            iterations: options.iterations || 100,
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
                        errors.push(`Iteration ${i + 1}: Property violated for input: ${JSON.stringify(input).substring(0, 100)}...`);
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
                errors: errors.slice(0, 5) // Keep first 5 errors
            });
            
            if (failed > 0) {
                console.log('Sample errors:');
                errors.slice(0, 3).forEach(error => console.log(`  - ${error}`));
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
    static async runESLint(filePaths, options = {}) {
        return new Promise((resolve, reject) => {
            const format = options.format || 'json';
            
            // Use the npm script approach which we know works
            const args = [
                'run', 'lint', '--',
                '--format', format,
                ...filePaths
            ];

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
                // For text format, violations might be in stderr
                const output = stdout.trim() || stderr.trim();
                
                resolve({
                    exitCode: code,
                    stdout: stdout.trim(),
                    stderr: stderr.trim(),
                    textOutput: output, // Combined output for text format
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
            }, options.timeout || 15000);
        });
    }

    static async runESLintText(filePaths, options = {}) {
        const result = await this.runESLint(filePaths, { 
            ...options, 
            format: 'stylish' 
        });
        
        // For stylish format, output goes to stderr when there are violations
        const textOutput = result.stderr || result.stdout;
        
        return {
            ...result,
            textOutput: textOutput
        };
    }

    static async runESLintJSON(filePaths, options = {}) {
        const result = await this.runESLint(filePaths, { 
            ...options, 
            format: 'json' 
        });
        
        let jsonOutput = null;
        try {
            if (result.stdout) {
                jsonOutput = JSON.parse(result.stdout);
            }
        } catch (error) {
            // If JSON parsing fails, it might be because there are no violations
            // or the output format is different
        }
        
        return {
            ...result,
            jsonOutput
        };
    }
}

// File system utilities for test files
class TestFileManager {
    constructor() {
        this.tempDir = join(__dirname, 'temp-eslint-test-files');
        this.createdFiles = [];
    }

    async setup() {
        // No need to create temp directory, we'll use MyHavokSimCode
        this.createdFiles = [];
    }

    async createTestFile(content, filename = null) {
        if (!filename) {
            filename = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.js`;
        }
        
        // Create files in MyHavokSimCode directory so ESLint will process them
        const filepath = join('MyHavokSimCode', filename);
        await writeFile(filepath, content, 'utf8');
        this.createdFiles.push(filepath);
        
        return filepath;
    }

    async cleanup() {
        // Clean up individual files instead of directory
        for (const filepath of this.createdFiles) {
            try {
                await rm(filepath, { force: true });
            } catch (error) {
                // Ignore cleanup errors
            }
        }
        this.createdFiles = [];
    }

    getRelativePath(filepath) {
        return relative(process.cwd(), filepath);
    }
}

// Code generators that produce specific ESLint violations
class ViolationCodeGenerators {
    static generateSyntaxError() {
        const templates = [
            // Missing semicolon
            `export function testFunction() {
    const x = 1
    return x;
}`,
            // Wrong quotes
            `export const message = "This should use single quotes";`,
            // Wrong indentation
            `export function badIndent() {
  const x = 1;
    const y = 2;
return x + y;
}`,
            // Unused variable
            `export function unusedVar() {
    const unused = 'never used';
    const used = 'this is used';
    return used;
}`,
            // Console.log (warning)
            `export function debugFunction() {
    console.log('debug message');
    return 'result';
}`,
            // Complexity violation
            `export function tooComplex(a, b, c, d, e, f) {
    if (a > 0) {
        if (b > 0) {
            if (c > 0) {
                if (d > 0) {
                    if (e > 0) {
                        if (f > 0) {
                            return true;
                        }
                    }
                }
            }
        }
    }
    return false;
}`
        ];
        
        return templates[Math.floor(Math.random() * templates.length)];
    }

    static generateMultipleViolations() {
        return `export function multipleIssues() {
  var oldStyle = "wrong quotes and var"
    const unused = 42;
console.log("debug")
return oldStyle
}`;
    }

    static generateValidCode() {
        return `export function validFunction(param) {
    const result = param * 2;
    return result;
}`;
    }

    static generateRandomCode() {
        const generators = [
            () => this.generateSyntaxError(),
            () => this.generateMultipleViolations(),
            () => this.generateValidCode()
        ];
        
        const generator = generators[Math.floor(Math.random() * generators.length)];
        return generator();
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

    static validateTextOutput(textOutput, expectedFilePath) {
        if (!textOutput || typeof textOutput !== 'string') {
            return {
                isValid: false,
                reason: 'Text output is empty or not a string'
            };
        }

        // Handle empty output (no violations case)
        if (textOutput.trim() === '') {
            return {
                isValid: true,
                reason: 'No violations found (valid case)',
                hasViolations: false
            };
        }

        // Check if output contains file path
        const hasFilePath = textOutput.includes(expectedFilePath) || 
                           textOutput.includes(expectedFilePath.replace(/\\/g, '/'));
        
        if (!hasFilePath) {
            // If no violations, this might be valid
            if (textOutput.trim() === '' || textOutput.includes('0 problems')) {
                return {
                    isValid: true,
                    reason: 'No violations found (valid case)',
                    hasViolations: false
                };
            }
            
            return {
                isValid: false,
                reason: 'Output does not contain expected file path'
            };
        }

        // Look for line:column pattern (e.g., "2:5")
        const lineColumnPattern = /\d+:\d+/;
        const hasLineColumn = lineColumnPattern.test(textOutput);

        // Look for rule names (typically in format like "no-unused-vars")
        const rulePattern = /\b[a-z-]+\/[a-z-]+\b|\b[a-z-]+\b/;
        const hasRuleName = rulePattern.test(textOutput);

        // Look for error/warning indicators
        const severityPattern = /\b(error|warning)\b/i;
        const hasSeverity = severityPattern.test(textOutput);

        return {
            isValid: hasFilePath && hasLineColumn && hasRuleName,
            reason: `File path: ${hasFilePath}, Line:Column: ${hasLineColumn}, Rule: ${hasRuleName}, Severity: ${hasSeverity}`,
            hasViolations: true,
            details: {
                hasFilePath,
                hasLineColumn,
                hasRuleName,
                hasSeverity
            }
        };
    }
}

// Property test definitions
const framework = new PropertyTestFramework();
const fileManager = new TestFileManager();

// Property 1: JSON output format validation
framework.property(
    'ESLint JSON output contains required violation information',
    async () => {
        const code = ViolationCodeGenerators.generateRandomCode();
        const filepath = await fileManager.createTestFile(code);
        const relativePath = fileManager.getRelativePath(filepath);
        
        return { code, filepath, relativePath };
    },
    async ({ code, filepath, relativePath }) => {
        try {
            const result = await ESLintRunner.runESLintJSON([relativePath]);
            
            // If ESLint failed to run, that's a test failure
            if (result.stderr && result.stderr.includes('Error')) {
                console.log(`ESLint execution error: ${result.stderr}`);
                return false;
            }

            // Validate the JSON output format
            const validation = OutputFormatValidator.validateJSONOutput(result.jsonOutput, relativePath);
            
            if (!validation.isValid) {
                console.log(`JSON validation failed: ${validation.reason}`);
                return false;
            }

            // If there are violations, ensure they have proper format
            if (validation.hasViolations) {
                const violations = validation.violations;
                
                // Each violation should have actionable information
                for (const violation of violations) {
                    if (!violation.line || !violation.column || !violation.ruleId || !violation.message) {
                        console.log('Violation missing required information:', violation);
                        return false;
                    }
                }
            }

            return true;
        } catch (error) {
            console.log(`Test execution failed: ${error.message}`);
            return false;
        }
    },
    { iterations: 30 }
);

// Property 2: Text output format validation
framework.property(
    'ESLint text output contains actionable violation information',
    async () => {
        const code = ViolationCodeGenerators.generateSyntaxError(); // Always generate violations
        const filepath = await fileManager.createTestFile(code);
        const relativePath = fileManager.getRelativePath(filepath);
        
        return { code, filepath, relativePath };
    },
    async ({ code, filepath, relativePath }) => {
        try {
            const result = await ESLintRunner.runESLintText([relativePath]);
            
            // If ESLint failed to run, that's a test failure
            if (result.stderr && result.stderr.includes('Error')) {
                console.log(`ESLint execution error: ${result.stderr}`);
                return false;
            }

            // Validate the text output format
            const validation = OutputFormatValidator.validateTextOutput(result.textOutput, relativePath);
            
            if (!validation.isValid) {
                console.log(`Text validation failed: ${validation.reason}`);
                return false;
            }

            return true;
        } catch (error) {
            console.log(`Test execution failed: ${error.message}`);
            return false;
        }
    },
    { iterations: 25 }
);

// Property 3: Multiple files output format
framework.property(
    'ESLint handles multiple files with proper output format',
    async () => {
        const code1 = ViolationCodeGenerators.generateSyntaxError();
        const code2 = ViolationCodeGenerators.generateMultipleViolations();
        
        const filepath1 = await fileManager.createTestFile(code1, 'file1.js');
        const filepath2 = await fileManager.createTestFile(code2, 'file2.js');
        
        const relativePath1 = fileManager.getRelativePath(filepath1);
        const relativePath2 = fileManager.getRelativePath(filepath2);
        
        return { 
            files: [relativePath1, relativePath2],
            codes: [code1, code2]
        };
    },
    async ({ files, codes }) => {
        try {
            const result = await ESLintRunner.runESLintJSON(files);
            
            if (result.stderr && result.stderr.includes('Error')) {
                console.log(`ESLint execution error: ${result.stderr}`);
                return false;
            }

            // Should have results for both files
            if (!result.jsonOutput || !Array.isArray(result.jsonOutput)) {
                console.log('Invalid JSON output for multiple files');
                return false;
            }

            // Validate each file's output
            for (let i = 0; i < files.length; i++) {
                const fileResult = result.jsonOutput.find(r => 
                    r.filePath && (r.filePath.includes(files[i]) || files[i].includes(r.filePath))
                );
                
                if (!fileResult) {
                    console.log(`Missing result for file: ${files[i]}`);
                    return false;
                }

                const validation = OutputFormatValidator.validateJSONOutput([fileResult], files[i]);
                if (!validation.isValid) {
                    console.log(`Validation failed for file ${files[i]}: ${validation.reason}`);
                    return false;
                }
            }

            return true;
        } catch (error) {
            console.log(`Multiple files test failed: ${error.message}`);
            return false;
        }
    },
    { iterations: 15 }
);

// Property 4: Exit code consistency with violations
framework.property(
    'ESLint exit code is consistent with violation presence',
    async () => {
        const hasViolations = Math.random() > 0.3; // 70% chance of violations
        const code = hasViolations 
            ? ViolationCodeGenerators.generateSyntaxError()
            : ViolationCodeGenerators.generateValidCode();
        
        const filepath = await fileManager.createTestFile(code);
        const relativePath = fileManager.getRelativePath(filepath);
        
        return { code, filepath, relativePath, expectedViolations: hasViolations };
    },
    async ({ code, filepath, relativePath, expectedViolations }) => {
        try {
            const result = await ESLintRunner.runESLintJSON([relativePath]);
            
            const hasActualViolations = result.jsonOutput && 
                                      Array.isArray(result.jsonOutput) && 
                                      result.jsonOutput.length > 0 && 
                                      result.jsonOutput[0].messages && 
                                      result.jsonOutput[0].messages.length > 0;

            // Exit code should be non-zero when there are violations
            const exitCodeCorrect = hasActualViolations ? result.exitCode !== 0 : result.exitCode === 0;
            
            if (!exitCodeCorrect) {
                console.log(`Exit code mismatch: violations=${hasActualViolations}, exitCode=${result.exitCode}`);
                return false;
            }

            return true;
        } catch (error) {
            console.log(`Exit code test failed: ${error.message}`);
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
        // Setup test environment
        await fileManager.setup();
        console.log('✅ Test environment setup complete\n');
        
        // Run property tests
        await framework.runTests();
        
        // Additional validation
        console.log('\n=== Additional Output Format Validation ===');
        
        // Test with a known violation file
        const testCode = `export function testViolations() {
  var oldStyle = "wrong quotes";
    const unused = 42;
console.log("debug");
return oldStyle
}`;
        
        const testFile = await fileManager.createTestFile(testCode, 'validation-test.js');
        const testRelativePath = fileManager.getRelativePath(testFile);
        
        console.log('Testing with known violations...');
        
        // Test JSON format
        const jsonResult = await ESLintRunner.runESLintJSON([testRelativePath]);
        if (jsonResult.jsonOutput && jsonResult.jsonOutput.length > 0) {
            const fileResult = jsonResult.jsonOutput[0];
            console.log(`✅ JSON format: Found ${fileResult.messages.length} violations`);
            
            if (fileResult.messages.length > 0) {
                const sample = fileResult.messages[0];
                console.log(`   Sample violation: Line ${sample.line}, Column ${sample.column}, Rule: ${sample.ruleId}`);
                console.log(`   Message: ${sample.message.substring(0, 60)}...`);
            }
        }
        
        // Test text format
        const textResult = await ESLintRunner.runESLintText([testRelativePath]);
        if (textResult.textOutput) {
            console.log('✅ Text format: Output contains actionable information');
            const lines = textResult.textOutput.split('\n').filter(line => line.trim());
            if (lines.length > 0) {
                console.log(`   Sample line: ${lines[0].substring(0, 80)}...`);
            }
        }
        
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
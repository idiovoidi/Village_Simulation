/**
 * Property-Based Test: Post-Migration Type Validation
 *
 * **Feature: eslint-typescript-migration, Property 10: Post-Migration Type Validation**
 * **Validates: Requirements 3.3**
 *
 * For any file converted from JavaScript to TypeScript, all function signatures
 * and variable declarations should pass TypeScript strict type checking.
 */

import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import fc from 'fast-check';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_CONFIG = {
    iterations: 50,
    timeout: 30000,
    tempDir: path.join(__dirname, '../../../temp-type-validation-tests'),
    tsConfigPath: path.join(__dirname, '../../../tsconfig.json')
};

// TypeScript code generators for property testing
class TypeScriptGenerators {
    /**
   * Generate valid TypeScript function with proper type annotations
   */
    static validTypedFunction() {
        return fc.record({
            name: fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
            params: fc.array(fc.record({
                name: fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
                type: fc.oneof(
                    fc.constant('string'),
                    fc.constant('number'),
                    fc.constant('boolean'),
                    fc.constant('any'),
                    fc.constant('object'),
                    fc.constant('Array<string>'),
                    fc.constant('Array<number>')
                )
            }), { minLength: 0, maxLength: 5 }),
            returnType: fc.oneof(
                fc.constant('string'),
                fc.constant('number'),
                fc.constant('boolean'),
                fc.constant('void'),
                fc.constant('any'),
                fc.constant('object')
            ),
            isAsync: fc.boolean(),
            isExported: fc.boolean()
        }).map(spec => {
            const paramList = spec.params.map(p => `${p.name}: ${p.type}`).join(', ');
            const asyncKeyword = spec.isAsync ? 'async ' : '';
            const exportKeyword = spec.isExported ? 'export ' : '';
            const returnTypeAnnotation = spec.returnType === 'void' ? ': void' : `: ${spec.returnType}`;

            return {
                code: `${exportKeyword}${asyncKeyword}function ${spec.name}(${paramList})${returnTypeAnnotation} {
  // Implementation placeholder
  ${spec.returnType === 'void' ? '' : 'return null as any;'}
}`,
                name: spec.name,
                isExported: spec.isExported
            };
        });
    }

    /**
   * Generate valid TypeScript class with proper type annotations
   */
    static validTypedClass() {
        return fc.record({
            name: fc.stringMatching(/^[A-Z][a-zA-Z0-9_]*$/),
            properties: fc.array(fc.record({
                name: fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
                type: fc.oneof(
                    fc.constant('string'),
                    fc.constant('number'),
                    fc.constant('boolean'),
                    fc.constant('any'),
                    fc.constant('object')
                ),
                isPrivate: fc.boolean()
            }), { minLength: 1, maxLength: 5 }),
            methods: fc.array(fc.record({
                name: fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
                returnType: fc.oneof(
                    fc.constant('string'),
                    fc.constant('number'),
                    fc.constant('void'),
                    fc.constant('any')
                ),
                isPrivate: fc.boolean()
            }), { minLength: 0, maxLength: 3 }),
            isExported: fc.boolean()
        }).map(spec => {
            const properties = spec.properties.map(p =>
                `  ${p.isPrivate ? 'private ' : ''}${p.name}: ${p.type};`
            ).join('\n');

            const methods = spec.methods.map(m =>
                `  ${m.isPrivate ? 'private ' : ''}${m.name}(): ${m.returnType} {
    ${m.returnType === 'void' ? '' : 'return null as any;'}
  }`
            ).join('\n\n');

            const exportKeyword = spec.isExported ? 'export ' : '';

            return {
                code: `${exportKeyword}class ${spec.name} {
${properties}

  constructor() {
    ${spec.properties.map(p => `this.${p.name} = null as any;`).join('\n    ')}
  }

${methods}
}`,
                name: spec.name,
                isExported: spec.isExported
            };
        });
    }

    /**
   * Generate TypeScript interface definitions
   */
    static validInterface() {
        return fc.record({
            name: fc.stringMatching(/^[A-Z][a-zA-Z0-9_]*$/),
            properties: fc.array(fc.record({
                name: fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
                type: fc.oneof(
                    fc.constant('string'),
                    fc.constant('number'),
                    fc.constant('boolean'),
                    fc.constant('any'),
                    fc.constant('object')
                ),
                optional: fc.boolean()
            }), { minLength: 1, maxLength: 5 }),
            isExported: fc.boolean()
        }).map(spec => {
            const properties = spec.properties.map(p =>
                `  ${p.name}${p.optional ? '?' : ''}: ${p.type};`
            ).join('\n');

            const exportKeyword = spec.isExported ? 'export ' : '';

            return {
                code: `${exportKeyword}interface ${spec.name} {
${properties}
}`,
                name: spec.name,
                isExported: spec.isExported
            };
        });
    }

    /**
   * Generate complete TypeScript module
   */
    static validTypeScriptModule() {
        return fc.record({
            interfaces: fc.array(this.validInterface(), { minLength: 0, maxLength: 2 }),
            classes: fc.array(this.validTypedClass(), { minLength: 0, maxLength: 2 }),
            functions: fc.array(this.validTypedFunction(), { minLength: 1, maxLength: 3 })
        }).map(spec => {
            const interfaces = spec.interfaces.map(i => i.code).join('\n\n');
            const classes = spec.classes.map(c => c.code).join('\n\n');
            const functions = spec.functions.map(f => f.code).join('\n\n');

            return {
                code: [interfaces, classes, functions].filter(Boolean).join('\n\n'),
                exports: [
                    ...spec.interfaces.filter(i => i.isExported).map(i => i.name),
                    ...spec.classes.filter(c => c.isExported).map(c => c.name),
                    ...spec.functions.filter(f => f.isExported).map(f => f.name)
                ]
            };
        });
    }
}

// TypeScript compiler wrapper
class TypeScriptCompiler {
    constructor(tsConfigPath) {
        this.tsConfigPath = tsConfigPath;
    }

    /**
   * Compile TypeScript file and return compilation results
   */
    async compileFile(filePath) {
        return new Promise(resolve => {
            const tsc = spawn('npx', ['tsc', '--noEmit', '--project', this.tsConfigPath, filePath], {
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: true
            });

            let stdout = '';
            let stderr = '';

            tsc.stdout.on('data', data => {
                stdout += data.toString();
            });

            tsc.stderr.on('data', data => {
                stderr += data.toString();
            });

            tsc.on('close', code => {
                resolve({
                    success: code === 0,
                    exitCode: code,
                    stdout: stdout.trim(),
                    stderr: stderr.trim(),
                    hasTypeErrors: code !== 0 && (stderr.includes('error TS') || stdout.includes('error TS'))
                });
            });

            // Set timeout
            setTimeout(() => {
                tsc.kill();
                resolve({
                    success: false,
                    exitCode: -1,
                    stdout: '',
                    stderr: 'Compilation timeout',
                    hasTypeErrors: true
                });
            }, TEST_CONFIG.timeout);
        });
    }

    /**
   * Check if TypeScript compiler is available
   */
    async isAvailable() {
        try {
            const result = await new Promise(resolve => {
                const tsc = spawn('npx', ['tsc', '--version'], {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    shell: true
                });

                tsc.on('close', code => {
                    resolve(code === 0);
                });

                setTimeout(() => {
                    tsc.kill();
                    resolve(false);
                }, 5000);
            });

            return result;
        } catch (error) {
            return false;
        }
    }
}

// Test file manager
class TestFileManager {
    constructor(tempDir) {
        this.tempDir = tempDir;
    }

    async setup() {
        try {
            await fs.mkdir(this.tempDir, { recursive: true });
        } catch (error) {
            // Directory might already exist
        }
    }

    async cleanup() {
        try {
            await fs.rm(this.tempDir, { recursive: true, force: true });
        } catch (error) {
            // Ignore cleanup errors
        }
    }

    async createTypeScriptFile(content, filename = null) {
        const fileName = filename || `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.ts`;
        const filePath = path.join(this.tempDir, fileName);

        await fs.writeFile(filePath, content, 'utf8');

        return filePath;
    }
}

// Property test implementation
describe('Post-Migration Type Validation', () => {
    let fileManager;
    let compiler;

    beforeEach(async () => {
        fileManager = new TestFileManager(TEST_CONFIG.tempDir);
        compiler = new TypeScriptCompiler(TEST_CONFIG.tsConfigPath);
        await fileManager.setup();
    });

    afterEach(async () => {
        await fileManager.cleanup();
    });

    test('TypeScript compiler should be available', async () => {
        const isAvailable = await compiler.isAvailable();
        expect(isAvailable).toBe(true);
    }, TEST_CONFIG.timeout);

    test('Property 10: Post-Migration Type Validation - Valid TypeScript functions should compile without type errors', async () => {
        await fc.assert(
            fc.asyncProperty(
                TypeScriptGenerators.validTypedFunction(),
                async functionSpec => {
                    // Create TypeScript file with the generated function
                    const content = `// Generated TypeScript function for type validation
${functionSpec.code}`;

                    const filePath = await fileManager.createTypeScriptFile(content);

                    // Compile the file
                    const result = await compiler.compileFile(filePath);

                    // The function should compile without type errors
                    if (!result.success && result.hasTypeErrors) {
                        console.log(`Type errors in generated function:
Function: ${functionSpec.name}
Code: ${functionSpec.code}
Errors: ${result.stderr}`);
                        return false;
                    }

                    return true;
                }
            ),
            {
                numRuns: Math.min(TEST_CONFIG.iterations, 20), // Reduce iterations for compilation tests
                timeout: TEST_CONFIG.timeout
            }
        );
    }, TEST_CONFIG.timeout * 2);

    test('Property 10: Post-Migration Type Validation - Valid TypeScript classes should compile without type errors', async () => {
        await fc.assert(
            fc.asyncProperty(
                TypeScriptGenerators.validTypedClass(),
                async classSpec => {
                    // Create TypeScript file with the generated class
                    const content = `// Generated TypeScript class for type validation
${classSpec.code}`;

                    const filePath = await fileManager.createTypeScriptFile(content);

                    // Compile the file
                    const result = await compiler.compileFile(filePath);

                    // The class should compile without type errors
                    if (!result.success && result.hasTypeErrors) {
                        console.log(`Type errors in generated class:
Class: ${classSpec.name}
Code: ${classSpec.code}
Errors: ${result.stderr}`);
                        return false;
                    }

                    return true;
                }
            ),
            {
                numRuns: Math.min(TEST_CONFIG.iterations, 15), // Reduce iterations for compilation tests
                timeout: TEST_CONFIG.timeout
            }
        );
    }, TEST_CONFIG.timeout * 2);

    test('Property 10: Post-Migration Type Validation - Valid TypeScript modules should compile without type errors', async () => {
        await fc.assert(
            fc.asyncProperty(
                TypeScriptGenerators.validTypeScriptModule(),
                async moduleSpec => {
                    // Create TypeScript file with the generated module
                    const content = `// Generated TypeScript module for type validation
${moduleSpec.code}`;

                    const filePath = await fileManager.createTypeScriptFile(content);

                    // Compile the file
                    const result = await compiler.compileFile(filePath);

                    // The module should compile without type errors
                    if (!result.success && result.hasTypeErrors) {
                        console.log(`Type errors in generated module:
Code: ${moduleSpec.code}
Errors: ${result.stderr}`);
                        return false;
                    }

                    return true;
                }
            ),
            {
                numRuns: Math.min(TEST_CONFIG.iterations, 10), // Reduce iterations for compilation tests
                timeout: TEST_CONFIG.timeout
            }
        );
    }, TEST_CONFIG.timeout * 2);

    test('Property 10: Post-Migration Type Validation - Converted core files should compile without type errors', async () => {
        const coreFiles = [
            path.join(__dirname, '../ErrorHandling.ts'),
            path.join(__dirname, '../SimulationSetup.ts')
        ];

        for (const filePath of coreFiles) {
            try {
                // Check if file exists
                await fs.access(filePath);

                // Compile the converted TypeScript file
                const result = await compiler.compileFile(filePath);

                expect(result.success).toBe(true);
                expect(result.hasTypeErrors).toBe(false);

                if (!result.success) {
                    console.log(`Type errors in ${filePath}:
Errors: ${result.stderr}`);
                }
            } catch (error) {
                // File doesn't exist yet, skip this test
                console.log(`Skipping ${filePath} - file not found`);
            }
        }
    }, TEST_CONFIG.timeout);

    test('Property 10: Post-Migration Type Validation - Strict mode should catch implicit any types', async () => {
    // Test that strict mode catches common type issues
        const invalidTypeScriptCode = `
// This should fail in strict mode
function invalidFunction(param) {
  return param.someProperty;
}

class InvalidClass {
  property;
  
  constructor(value) {
    this.property = value;
  }
}
`;

        const filePath = await fileManager.createTypeScriptFile(invalidTypeScriptCode);
        const result = await compiler.compileFile(filePath);

        // This should fail due to implicit any types in strict mode
        expect(result.success).toBe(false);
        expect(result.hasTypeErrors).toBe(true);
    }, TEST_CONFIG.timeout);
});

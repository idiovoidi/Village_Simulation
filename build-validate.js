#!/usr/bin/env node

/**
 * Build Validation Script
 * 
 * This script integrates ESLint with the build system to ensure builds fail
 * on linting errors, providing strict code quality enforcement.
 * 
 * Requirements Coverage:
 * - 1.5: Build system integration for failing on linting errors
 * - 6.4: Strict code quality standards enforcement
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class BuildValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
    }

    /**
     * Run ESLint with strict error checking
     */
    async runLintCheck() {
        console.log('🔍 Running ESLint validation...');
        
        try {
            const { stdout, stderr } = await execAsync('npx eslint MyHavokSimCode/ --max-warnings 0 --format json');
            
            // Parse JSON output
            const results = JSON.parse(stdout);
            let totalErrors = 0;
            let totalWarnings = 0;
            
            results.forEach(result => {
                totalErrors += result.errorCount;
                totalWarnings += result.warningCount;
                
                if (result.messages.length > 0) {
                    this.errors.push({
                        file: result.filePath,
                        messages: result.messages.filter(msg => msg.severity === 2)
                    });
                    this.warnings.push({
                        file: result.filePath,
                        messages: result.messages.filter(msg => msg.severity === 1)
                    });
                }
            });
            
            if (totalErrors > 0) {
                console.error(`❌ ESLint found ${totalErrors} errors`);
                this.printErrors();
                return false;
            }
            
            if (totalWarnings > 0) {
                console.error(`❌ ESLint found ${totalWarnings} warnings (max-warnings is 0)`);
                this.printWarnings();
                return false;
            }
            
            console.log('✅ ESLint validation passed');
            return true;
            
        } catch (error) {
            // ESLint found issues or failed to run
            if (error.stdout) {
                try {
                    const results = JSON.parse(error.stdout);
                    let totalErrors = 0;
                    let totalWarnings = 0;
                    
                    results.forEach(result => {
                        totalErrors += result.errorCount;
                        totalWarnings += result.warningCount;
                    });
                    
                    console.error(`❌ ESLint found ${totalErrors} errors and ${totalWarnings} warnings`);
                } catch {
                    console.error('❌ ESLint validation failed');
                    console.error(error.stdout);
                }
            } else {
                console.error('❌ ESLint execution failed:', error.message);
            }
            return false;
        }
    }

    /**
     * Run TypeScript type checking
     */
    async runTypeCheck() {
        console.log('🔍 Running TypeScript type checking...');
        
        try {
            await execAsync('npx tsc --noEmit');
            console.log('✅ TypeScript validation passed');
            return true;
        } catch (error) {
            // Check if TypeScript is available
            if (error.message && error.message.includes('not the tsc command you are looking for')) {
                console.log('⚠️  TypeScript not installed - skipping type checking');
                console.log('💡 Run "npm install typescript --save-dev" to enable type checking');
                return true; // Don't fail build if TypeScript isn't installed yet
            }
            
            console.error('❌ TypeScript type checking failed');
            console.error(error.stdout || error.message);
            return false;
        }
    }

    /**
     * Print detailed error information
     */
    printErrors() {
        this.errors.forEach(fileError => {
            if (fileError.messages.length > 0) {
                console.error(`\n📁 ${fileError.file}`);
                fileError.messages.forEach(msg => {
                    console.error(`  ${msg.line}:${msg.column} - ${msg.message} (${msg.ruleId})`);
                });
            }
        });
    }

    /**
     * Print detailed warning information
     */
    printWarnings() {
        this.warnings.forEach(fileWarning => {
            if (fileWarning.messages.length > 0) {
                console.warn(`\n📁 ${fileWarning.file}`);
                fileWarning.messages.forEach(msg => {
                    console.warn(`  ${msg.line}:${msg.column} - ${msg.message} (${msg.ruleId})`);
                });
            }
        });
    }

    /**
     * Run complete build validation
     */
    async validate() {
        console.log('🏗️  Starting build validation...\n');
        
        const lintPassed = await this.runLintCheck();
        const typePassed = await this.runTypeCheck();
        
        if (lintPassed && typePassed) {
            console.log('\n✅ All validation checks passed! Build can proceed.');
            return true;
        } else {
            console.log('\n❌ Validation failed! Build cannot proceed.');
            console.log('\n💡 To fix issues:');
            console.log('  npm run lint:fix  - Auto-fix ESLint issues');
            console.log('  npm run lint      - Check remaining issues');
            console.log('  npm run type-check - Check TypeScript types');
            return false;
        }
    }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('build-validate.js')) {
    const validator = new BuildValidator();
    
    validator.validate().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Build validation crashed:', error);
        process.exit(1);
    });
}

export default BuildValidator;
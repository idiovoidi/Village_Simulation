/**
 * TestRunner - Orchestrates compatibility testing and provides CLI interface
 * Runs compatibility tests and generates reports
 */

import { CompatibilityTestFramework } from './CompatibilityTestFramework.js';

export class TestRunner {
    constructor() {
        this.framework = new CompatibilityTestFramework();
        this.reportPath = './test-reports';
    }

    /**
     * Run compatibility tests with options
     * @param {Object} options - Test configuration options
     * @returns {Promise<Object>} Test results
     */
    async runTests(options = {}) {
        const config = {
            saveResults: true,
            generateReport: true,
            compareWithBaseline: true,
            verbose: false,
            ...options
        };

        console.log('🚀 Starting Compatibility Test Runner...');

        if (config.verbose) {
            console.log('Test Configuration:', config);
        }

        try {
            // Run the test suite
            const results = await this.framework.runAllTests();

            // Save results if requested
            if (config.saveResults) {
                this.framework.saveResults(results);
            }

            // Compare with baseline if requested
            if (config.compareWithBaseline) {
                const previousResults = this.framework.loadPreviousResults();
                if (previousResults.length > 1) {
                    const baseline = previousResults[1].data; // Second most recent as baseline
                    const comparison = this.framework.compareWithBaseline(results, baseline.performanceBaseline);
                    results.comparison = comparison;
                }
            }

            // Generate report if requested
            if (config.generateReport) {
                await this.generateReport(results);
            }

            this.printSummary(results);

            return results;
        } catch (error) {
            console.error('❌ Test runner failed:', error);
            throw error;
        }
    }

    /**
     * Generate detailed test report
     * @param {Object} results - Test results to report
     */
    async generateReport(results) {
        const report = this.createReportContent(results);

        try {
            // In browser environment, save to localStorage or download
            if (typeof window !== 'undefined') {
                this.saveReportToBrowser(report, results.timestamp);
            } else {
                // In Node.js environment, save to file
                await this.saveReportToFile(report, results.timestamp);
            }

            console.log('📊 Test report generated successfully');
        } catch (error) {
            console.warn('⚠️ Failed to generate report:', error.message);
        }
    }

    /**
     * Create formatted report content
     * @param {Object} results - Test results
     * @returns {string} Formatted report
     */
    createReportContent(results) {
        const timestamp = new Date(results.timestamp).toLocaleString();

        let report = `# Compatibility Test Report
Generated: ${timestamp}

## Summary
- **Total Tests**: ${results.total}
- **Passed**: ${results.passed} ✅
- **Failed**: ${results.failed} ❌
- **Success Rate**: ${((results.passed / results.total) * 100).toFixed(1)}%

`;

        // Add performance baseline if available
        if (results.performanceBaseline) {
            const perf = results.performanceBaseline;
            report += `## Performance Baseline
- **Frame Rate**: ${perf.frameRate.toFixed(1)} FPS
- **Render Time**: ${perf.renderTime.toFixed(2)} ms
- **Memory Usage**: ${(perf.memoryUsage / (1024 * 1024)).toFixed(1)} MB
- **Mesh Count**: ${perf.meshCount}
- **Draw Calls**: ${perf.drawCalls || 'N/A'}

`;
        }

        // Add comparison if available
        if (results.comparison && results.comparison.overall !== 'unknown') {
            report += `## Performance Comparison
- **Frame Rate Change**: ${results.comparison.frameRateChange.toFixed(1)}%
- **Render Time Change**: ${results.comparison.renderTimeChange.toFixed(1)}%
- **Memory Change**: ${results.comparison.memoryChange.toFixed(1)}%
- **Overall**: ${results.comparison.overall.toUpperCase()}

`;
        }

        // Add detailed test results
        report += `## Detailed Results

`;

        results.details.forEach((test, index) => {
            const status = test.status === 'PASSED' ? '✅' : '❌';
            report += `### ${index + 1}. ${test.name} ${status}
`;

            if (test.status === 'PASSED') {
                report += `- Duration: ${test.duration}ms
`;
                if (test.result && typeof test.result === 'object') {
                    Object.entries(test.result).forEach(([key, value]) => {
                        if (typeof value === 'boolean') {
                            report += `- ${key}: ${value ? '✅' : '❌'}
`;
                        } else if (typeof value === 'number') {
                            report += `- ${key}: ${value}
`;
                        }
                    });
                }
            } else {
                report += `- Error: ${test.error}
`;
                if (test.stack) {
                    report += `- Stack Trace: 
\`\`\`
${test.stack}
\`\`\`
`;
                }
            }
            report += `
`;
        });

        // Add recommendations
        report += this.generateRecommendations(results);

        return report;
    }

    /**
     * Generate recommendations based on test results
     * @param {Object} results - Test results
     * @returns {string} Recommendations section
     */
    generateRecommendations(results) {
        let recommendations = `## Recommendations

`;

        const failedTests = results.details.filter(t => t.status === 'FAILED');

        if (failedTests.length === 0) {
            recommendations += `✅ All tests passed! The system appears to be compatible with the dependency updates.

`;
        } else {
            recommendations += `⚠️ ${failedTests.length} test(s) failed. Consider the following actions:

`;

            failedTests.forEach(test => {
                recommendations += `- **${test.name}**: ${this.getRecommendationForTest(test)}
`;
            });
        }

        // Performance recommendations
        if (results.comparison) {
            if (results.comparison.overall === 'degraded') {
                recommendations += `
⚠️ **Performance Degradation Detected**:
- Consider profiling the application to identify bottlenecks
- Review recent changes that might impact performance
- Monitor memory usage for potential leaks

`;
            } else if (results.comparison.overall === 'improved') {
                recommendations += `
✅ **Performance Improvement Detected**:
- The dependency updates appear to have improved performance
- Consider documenting the improvements for future reference

`;
            }
        }

        return recommendations;
    }

    /**
     * Get specific recommendation for a failed test
     * @param {Object} test - Failed test details
     * @returns {string} Recommendation text
     */
    getRecommendationForTest(test) {
        const testName = test.name.toLowerCase();

        if (testName.includes('scene loading')) {
            return 'Check Babylon.js engine initialization and canvas setup';
        } else if (testName.includes('basic functionality')) {
            return 'Verify core Babylon.js features and API compatibility';
        } else if (testName.includes('agent behaviors')) {
            return 'Review agent system integration and mesh creation';
        } else if (testName.includes('performance')) {
            return 'Investigate performance bottlenecks and optimization opportunities';
        } else if (testName.includes('memory')) {
            return 'Check for memory leaks and proper resource disposal';
        } else if (testName.includes('rendering')) {
            return 'Verify rendering pipeline and shader compatibility';
        } else {
            return 'Review the specific error message and stack trace for debugging';
        }
    }

    /**
     * Save report to browser (localStorage + download)
     * @param {string} report - Report content
     * @param {string} timestamp - Report timestamp
     */
    saveReportToBrowser(report, timestamp) {
        // Save to localStorage
        const reportKey = `test-report-${timestamp}`;
        localStorage.setItem(reportKey, report);

        // Trigger download
        const blob = new Blob([report], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `compatibility-test-report-${timestamp}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Save report to file (Node.js environment)
     * @param {string} report - Report content
     * @param {string} timestamp - Report timestamp
     */
    async saveReportToFile(report, timestamp) {
        const fs = await import('fs').then(m => m.promises);
        const path = await import('path');

        // Create reports directory if it doesn't exist
        await fs.mkdir(this.reportPath, { recursive: true });

        const filename = `compatibility-test-report-${timestamp}.md`;
        const filepath = path.join(this.reportPath, filename);

        await fs.writeFile(filepath, report, 'utf8');
        console.log(`📄 Report saved to: ${filepath}`);
    }

    /**
     * Print test summary to console
     * @param {Object} results - Test results
     */
    printSummary(results) {
        console.log(`\n${'='.repeat(50)}`);
        console.log('🧪 COMPATIBILITY TEST SUMMARY');
        console.log('='.repeat(50));

        const successRate = ((results.passed / results.total) * 100).toFixed(1);
        const status = results.failed === 0 ? '✅ PASSED' : '❌ FAILED';

        console.log(`Status: ${status}`);
        console.log(`Tests: ${results.passed}/${results.total} passed (${successRate}%)`);

        if (results.performanceBaseline) {
            console.log(`Performance: ${results.performanceBaseline.frameRate.toFixed(1)} FPS`);
        }

        if (results.comparison && results.comparison.overall !== 'unknown') {
            const perfStatus = results.comparison.overall === 'improved' ? '📈'
                : results.comparison.overall === 'degraded' ? '📉' : '➡️';
            console.log(`Performance Change: ${perfStatus} ${results.comparison.overall.toUpperCase()}`);
        }

        console.log('='.repeat(50));

        if (results.failed > 0) {
            console.log('\n❌ Failed Tests:');
            results.details
                .filter(t => t.status === 'FAILED')
                .forEach(test => {
                    console.log(`  - ${test.name}: ${test.error}`);
                });
        }
    }

    /**
     * Run tests from command line (Node.js environment)
     */
    static async runFromCLI() {
        const args = process.argv.slice(2);
        const options = {
            verbose: args.includes('--verbose') || args.includes('-v'),
            saveResults: !args.includes('--no-save'),
            generateReport: !args.includes('--no-report'),
            compareWithBaseline: !args.includes('--no-compare')
        };

        const runner = new TestRunner();

        try {
            const results = await runner.runTests(options);
            process.exit(results.failed === 0 ? 0 : 1);
        } catch (error) {
            console.error('Test runner failed:', error);
            process.exit(1);
        }
    }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TestRunner };
}

if (typeof window !== 'undefined') {
    window.TestRunner = TestRunner;
}

// CLI support for Node.js
if (typeof process !== 'undefined' && process.argv && require.main === module) {
    TestRunner.runFromCLI();
}

/**
 * Development Server with ESLint Integration
 * 
 * This wrapper provides real-time ESLint feedback during development
 * by running linting checks before starting the server and on file changes.
 * 
 * Requirements Coverage:
 * - 1.5: Build system integration for real-time feedback
 * - 5.3: Development workflow preservation
 */

import { spawn, exec } from 'child_process';
import fs from 'fs';
import BuildValidator from './build-validate.js';

class DevServer {
    constructor() {
        this.serverProcess = null;
        this.isRunning = false;
        this.validator = new BuildValidator();
        this.debounceTimer = null;
    }

    /**
     * Run ESLint and return results
     */
    async runLint() {
        return new Promise(resolve => {
            exec('npm run lint', (error, stdout, stderr) => {
                if (error) {
                    // ESLint found errors - this is expected behavior
                    console.log('\n🔍 ESLint Results:');
                    console.log(stdout);
                    if (stderr) {
                        console.error('ESLint stderr:', stderr);
                    }
                    
                    // Parse lint results to count errors/warnings
                    const errorCount = (stdout.match(/error/g) || []).length;
                    const warningCount = (stdout.match(/warning/g) || []).length;
                    
                    resolve({
                        success: false,
                        errors: errorCount,
                        warnings: warningCount,
                        output: stdout
                    });
                } else {
                    console.log('✅ ESLint: No errors found');
                    resolve({
                        success: true,
                        errors: 0,
                        warnings: 0,
                        output: stdout
                    });
                }
            });
        });
    }

    /**
     * Run quick validation check
     */
    async runQuickValidation() {
        console.log('🔍 Running quick validation...');
        
        try {
            const lintResult = await this.runLint();
            
            if (lintResult.success) {
                console.log('✅ Code quality check passed');
                return true;
            } else {
                console.log(`❌ Found ${lintResult.errors} errors, ${lintResult.warnings} warnings`);
                console.log('💡 Run "npm run lint:fix" to auto-fix some issues');
                return false;
            }
        } catch (error) {
            console.error('❌ Validation failed:', error.message);
            return false;
        }
    }

    /**
     * Open browser automatically (Windows-compatible)
     */
    openBrowser(url) {
        const platform = process.platform;
        let command;
        let options = {};
        
        switch (platform) {
            case 'win32':
                // Windows: Use cmd.exe to execute start command
                command = `cmd.exe /c start "" "${url}"`;
                options = { shell: true };
                break;
            case 'darwin':
                command = `open ${url}`;
                break;
            case 'linux':
                command = `xdg-open ${url}`;
                break;
            default:
                console.log(`🌐 Please open your browser to: ${url}`);
                return;
        }
        
        exec(command, options, (error) => {
            if (error) {
                console.log(`🌐 Please open your browser to: ${url}`);
            } else {
                console.log(`🚀 Browser opened automatically: ${url}`);
            }
        });
    }

    /**
     * Start the Fastify server
     */
    startServer() {
        if (this.serverProcess) {
            console.log('Server already running...');
            return;
        }

        console.log('🚀 Starting Fastify development server...');
        this.serverProcess = spawn('node', ['server.js'], {
            stdio: 'inherit',
            shell: true
        });

        this.serverProcess.on('error', err => {
            console.error('Failed to start server:', err);
        });

        this.serverProcess.on('exit', code => {
            console.log(`Server exited with code ${code}`);
            this.serverProcess = null;
            this.isRunning = false;
        });

        this.isRunning = true;
    }

    /**
     * Stop the server
     */
    stopServer() {
        if (this.serverProcess) {
            console.log('🛑 Stopping development server...');
            this.serverProcess.kill();
            this.serverProcess = null;
            this.isRunning = false;
        }
    }

    /**
     * Debounced file change handler
     */
    handleFileChange(filename) {
        // Clear existing timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        // Set new timer
        this.debounceTimer = setTimeout(async () => {
            console.log(`\n📝 File changed: ${filename}`);
            await this.runQuickValidation();
        }, 500); // 500ms debounce
    }

    /**
     * Watch for file changes and re-lint
     */
    watchFiles() {
        const watchPaths = ['MyHavokSimCode', 'assets/AssetManager.js'];
        
        watchPaths.forEach(watchPath => {
            if (fs.existsSync(watchPath)) {
                fs.watch(watchPath, { recursive: true }, (_, filename) => {
                    if (filename && (filename.endsWith('.js') || filename.endsWith('.ts'))) {
                        this.handleFileChange(filename);
                    }
                });
            }
        });
        
        console.log('👀 Watching for file changes...');
    }

    /**
     * Start development mode with linting integration
     */
    async start() {
        console.log('🏗️  Starting development environment...\n');
        
        // Initial validation check
        console.log('🔍 Running initial validation...');
        const validationPassed = await this.validator.validate();
        
        if (!validationPassed) {
            console.log('\n⚠️  Validation failed, but starting server for development...');
            console.log('🚀 Fix the issues above and save files to re-validate\n');
        }
        
        // Start the server
        this.startServer();
        
        // Start file watching
        this.watchFiles();
        
        console.log('\n� Development Commands:');
        console.log('  npm run lint       - Check code quality');
        console.log('  npm run lint:fix   - Auto-fix lint issues');
        console.log('  npm run type-check - Check TypeScript types');
        console.log('  npm run validate   - Run full validation');
        console.log('  npm run build      - Build with validation');
        console.log('  Ctrl+C             - Stop development server\n');
        
        console.log('🌐 Server running at: http://localhost:3000');
        console.log('Server ready at http://localhost:3000'); // VS Code-friendly pattern
        
        // Auto-open browser if requested
        if (process.env.AUTO_OPEN_BROWSER === 'true') {
            setTimeout(() => this.openBrowser('http://localhost:3000'), 1500);
        }
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n� Shutting down development server...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down development server...');
    process.exit(0);
});

// Start the development server
const devServer = new DevServer();
devServer.start().catch(console.error);
#!/usr/bin/env node

/**
 * Launch script for Vite dev server with auto-browser
 * Provides F5 debug experience with HMR
 */

import { spawn, exec } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Open browser automatically (Windows-compatible)
 */
function openBrowser(url) {
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
            command = `open "${url}"`;
            break;
        case 'linux':
            command = `xdg-open "${url}"`;
            break;
        default:
            console.log(`🌐 Please open your browser to: ${url}`);
            return;
    }
    
    exec(command, options, (error) => {
        if (error) {
            console.log(`🌐 Please open your browser to: ${url}`);
            console.error('Browser open error:', error.message);
        } else {
            console.log(`🚀 Browser opened automatically: ${url}`);
        }
    });
}

async function launchVite() {
    const port = process.env.PORT || 3000;
    const url = `http://localhost:${port}`;
    
    console.log('⚡ Starting Vite dev server with HMR...');
    
    // Determine which package manager to use
    const usesPnpm = process.env.npm_execpath?.includes('pnpm');
    const packageManager = usesPnpm ? 'pnpm' : 'npm';
    
    // Start Vite
    const viteProcess = spawn(packageManager, ['run', 'dev'], {
        cwd: __dirname,
        env: process.env,
        stdio: 'inherit',
        shell: true
    });
    
    // Wait for Vite to start, then open browser
    setTimeout(() => {
        console.log(`🌐 Opening browser to: ${url}`);
        openBrowser(url);
    }, 2000);
    
    // Handle Vite process events
    viteProcess.on('error', (err) => {
        console.error('❌ Failed to start Vite:', err);
        process.exit(1);
    });
    
    viteProcess.on('exit', (code) => {
        console.log(`🛑 Vite exited with code ${code}`);
        process.exit(code);
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down Vite...');
        viteProcess.kill('SIGINT');
    });
    
    process.on('SIGTERM', () => {
        console.log('\n🛑 Shutting down Vite...');
        viteProcess.kill('SIGTERM');
    });
}

launchVite().catch(console.error);

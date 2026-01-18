#!/usr/bin/env node

/**
 * Launch script that starts the server and opens browser
 * This ensures reliable F5 debug experience
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

async function launchServer() {
    const port = process.env.PORT || 3000;
    const url = `http://localhost:${port}`;
    
    console.log('🏗️  Starting Village Sim with auto-browser...');
    
    // Set environment variables for the server
    const env = {
        ...process.env,
        PORT: port.toString(),
        AUTO_OPEN_BROWSER: 'false' // We'll handle browser opening here
    };
    
    // Start the server
    const serverProcess = spawn('node', ['server.js'], {
        cwd: __dirname,
        env: env,
        stdio: 'inherit'
    });
    
    // Wait a moment for server to start, then open browser
    setTimeout(() => {
        console.log(`🌐 Opening browser to: ${url}`);
        openBrowser(url);
    }, 2000);
    
    // Handle server process events
    serverProcess.on('error', (err) => {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    });
    
    serverProcess.on('exit', (code) => {
        console.log(`🛑 Server exited with code ${code}`);
        process.exit(code);
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down...');
        serverProcess.kill('SIGINT');
    });
    
    process.on('SIGTERM', () => {
        console.log('\n🛑 Shutting down...');
        serverProcess.kill('SIGTERM');
    });
}

launchServer().catch(console.error);
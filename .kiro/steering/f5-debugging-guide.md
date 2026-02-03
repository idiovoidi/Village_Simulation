---
inclusion: manual
---

# F5 Debugging Guide for Village Simulation

## Quick Start

Press **F5** in VS Code to launch the simulation with debugging enabled. The browser will open automatically.

## Available Debug Configurations

### 1. 🚀 Village Sim (F5 Ready) - **RECOMMENDED**
- **What it does**: Starts server and auto-opens browser
- **Port**: 3000
- **Script**: `launch-with-browser.js`
- **Best for**: Quick testing and debugging
- **Features**:
  - Automatic browser launch
  - Server process debugging
  - Graceful shutdown handling

### 2. 🔧 Dev Server (F5 Ready)
- **What it does**: Runs development server with ESLint integration
- **Port**: 3000
- **Script**: `dev-server.js` (via npm run dev)
- **Best for**: Active development with real-time linting
- **Features**:
  - File watching with auto-validation
  - ESLint feedback on file changes
  - Automatic browser launch
  - Build validation on startup

### 3. Server Only (No Browser)
- **What it does**: Starts server without opening browser
- **Port**: 3000
- **Script**: `server.js`
- **Best for**: Backend debugging or when you want to manually open browser
- **Features**:
  - Clean server-only debugging
  - No automatic browser launch

### 4. Start server.js on PORT 5173
- **What it does**: Starts server on alternative port
- **Port**: 5173
- **Script**: `server.js`
- **Best for**: Avoiding port conflicts or testing on different port
- **Features**:
  - Alternative port configuration
  - Useful when port 3000 is in use

## How to Use

### Starting Debug Session

1. **Open VS Code** in the project root
2. **Press F5** or click the green play button in the Debug panel
3. **Select configuration** from the dropdown (default: "🚀 Village Sim (F5 Ready)")
4. **Browser opens automatically** at `http://localhost:3000`
5. **Simulation loads** with full debugging capabilities

### Setting Breakpoints

You can set breakpoints in:
- **Server code**: `server.js`, `dev-server.js`, `launch-with-browser.js`
- **Client code**: Use browser DevTools (F12) for JavaScript debugging
  - Main entry: `MyHavokSimCode/Havokimport.js`
  - Systems: `MyHavokSimCode/core/`, `MyHavokSimCode/systems/`
  - Agents: `MyHavokSimCode/Agents/`

### Debugging Workflow

1. **Server-side debugging**:
   - Set breakpoints in Node.js files (server.js, etc.)
   - F5 to start debugging
   - Breakpoints will pause execution in VS Code

2. **Client-side debugging**:
   - Open browser DevTools (F12)
   - Navigate to Sources tab
   - Find your JavaScript files under `localhost:3000`
   - Set breakpoints in browser DevTools
   - Use Console for logging and inspection

3. **Full-stack debugging**:
   - Use VS Code for server-side breakpoints
   - Use browser DevTools for client-side breakpoints
   - Monitor both simultaneously

### Stopping Debug Session

- **Press Shift+F5** or click the red stop button
- **Or press Ctrl+C** in the integrated terminal
- Server will shut down gracefully

## File Structure

```
├── .vscode/
│   └── launch.json              # Debug configurations
├── server.js                    # Production server (Fastify)
├── dev-server.js                # Development server with ESLint
├── launch-with-browser.js       # Launch script with auto-browser
├── index.html                   # Main entry point
└── MyHavokSimCode/
    ├── Havokimport.js          # Scene initialization
    ├── core/                    # Core systems
    ├── Agents/                  # AI agents
    └── systems/                 # Game systems
```

## Troubleshooting

### Browser doesn't open automatically
- **Solution**: Manually open `http://localhost:3000` in your browser
- **Cause**: Platform-specific browser launch issues

### Port 3000 already in use
- **Solution**: Use configuration #4 (PORT 5173) or kill the process using port 3000
- **Windows**: `netstat -ano | findstr :3000` then `taskkill /PID <pid> /F`

### Simulation shows blank screen
- **Check**: Browser console (F12) for errors
- **Check**: Network tab to ensure all CDN resources loaded
- **Check**: Server terminal for startup errors

### ESLint errors prevent startup
- **Solution**: Run `npm run lint:fix` to auto-fix issues
- **Or**: Use configuration #1 or #3 which don't run ESLint on startup

### TypeScript compilation errors
- **Solution**: Run `npm run type-check` to see all errors
- **Solution**: Run `npm run build` to compile TypeScript files
- **Note**: JavaScript files will still work without TypeScript compilation

## Development Commands

While debugging, you can run these commands in a separate terminal:

```bash
# Code quality
npm run lint              # Check code quality
npm run lint:fix          # Auto-fix lint issues
npm run type-check        # Check TypeScript types

# Testing
npm test                  # Run all tests
npm run test:coverage     # Run tests with coverage
npm run coverage:open     # Open coverage report

# Building
npm run build             # Build with validation
npm run build:watch       # Watch mode for TypeScript
npm run validate          # Run validation checks
```

## Tips

1. **Use configuration #1** for quick testing and debugging
2. **Use configuration #2** for active development with linting feedback
3. **Keep browser DevTools open** (F12) to see client-side logs and errors
4. **Use VS Code integrated terminal** to see server logs
5. **Set breakpoints before starting** for more efficient debugging
6. **Use "Server Only" configuration** when you want to control browser manually

## Next Steps

After setting up debugging:
1. Test the simulation loads correctly
2. Explore the codebase structure
3. Set breakpoints in key systems
4. Begin incremental refactoring following `.kiro/steering/ecs-refactoring-guide.md`

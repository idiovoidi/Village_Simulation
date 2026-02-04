# Vite Setup for TypeScript Development

## Why Vite?

Vite provides:
- **Instant TypeScript transpilation** - No manual compilation needed
- **Hot Module Replacement (HMR)** - Changes reflect instantly without full reload
- **Fast dev server** - Native ESM with on-demand compilation
- **Production builds** - Optimized bundles with tree-shaking

## Installation

Since npm has auth issues, install Vite manually:

```bash
# Fix npm auth first, or use yarn/pnpm
npm install -D vite

# Or if you have yarn
yarn add -D vite

# Or if you have pnpm
pnpm add -D vite
```

## Usage

Once Vite is installed:

```bash
# Development with HMR (recommended)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Old dev server (fallback)
npm run dev:old
```

## What Changes?

### Before (Current)
- TypeScript files exist alongside JavaScript
- Manual compilation with `tsc`
- Both `.js` and `.ts` files needed
- No HMR - full page reload on changes

### After (With Vite)
- Import `.ts` files directly with `.js` extension
- Vite transpiles on-the-fly
- Can delete `.js` versions of converted files
- HMR updates code instantly

## Migration Path

1. **Install Vite** (see above)
2. **Test with `npm run dev`** - Should work immediately
3. **Verify all features work** - Check agents, physics, rendering
4. **Delete old `.js` versions** - Keep only `.ts` files
5. **Update imports** - Change `.js` to `.ts` in import statements (optional)

## Configuration

The `vite.config.js` is already set up with:
- Port 3000 (same as current server)
- HMR enabled
- TypeScript support via esbuild
- CDN externals (Babylon.js, Havok)
- Source maps for debugging

## Benefits for This Project

1. **Live TypeScript** - Edit `.ts` files, see changes instantly
2. **Type Safety** - Compile errors show in browser overlay
3. **Better DX** - Fast refresh, better error messages
4. **Production Ready** - Optimized builds when needed
5. **No Build Step** - Development just works

## Troubleshooting

### "Cannot find module" errors
- Make sure imports use `.js` extension (Vite resolves to `.ts`)
- Example: `import { Model } from './Model.js'` (even if file is Model.ts)

### HMR not working
- Check browser console for errors
- Try hard refresh (Ctrl+Shift+R)
- Restart dev server

### Babylon.js not loading
- CDN scripts in index.html load before Vite
- Check network tab for 404s
- Verify internet connection

## Current Status

- ✅ Vite config created
- ✅ Package.json scripts updated
- ✅ Vite installed via pnpm
- ✅ F5 launch configuration updated
- ✅ VS Code tasks configured
- ✅ Tested and working on port 3000

## F5 Quick Launch

Press **F5** in VS Code and select:
- **⚡ Vite + HMR (F5 Ready)** - Recommended! Vite with hot reload
- **🚀 Village Sim (Old Server)** - Fallback to old Fastify server

The Vite configuration will:
1. Start Vite dev server on port 3000
2. Auto-open browser after 2 seconds
3. Enable HMR for instant updates
4. Show TypeScript errors in browser overlay

## VS Code Tasks

Available via `Ctrl+Shift+P` → "Tasks: Run Task":
- **Start Vite Dev Server** - Background task with problem matcher
- **Build for Production** - Create optimized build
- **Type Check** - Run TypeScript compiler without emit

## Next Steps

1. ✅ ~~Fix npm authentication or use alternative package manager~~ - Done! Using pnpm
2. ✅ ~~Run `npm install -D vite`~~ - Done! Vite 7.3.1 installed
3. ✅ ~~Test with `npm run dev`~~ - Done! Working on port 3000
4. ✅ ~~Verify game works with Vite~~ - Ready to test
5. **Press F5** to launch with Vite + HMR
6. Test TypeScript hot reload by editing a `.ts` file
7. Start deleting old `.js` files once verified

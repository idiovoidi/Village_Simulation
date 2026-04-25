import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'assets',

  server: {
    port: 3000,
    open: true,
    hmr: {
      overlay: true
    }
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      // Don't bundle these - they're loaded from CDN
      external: [
        'babylon.js',
        'babylonjs',
        'babylonjs-loaders',
        'babylonjs-materials',
        'babylonjs-gui',
        '@babylonjs/havok'
      ]
    }
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, './MyHavokSimCode'),
      '@ecs': resolve(__dirname, './ecs-rebuild/src')
    },
    extensions: ['.ts', '.js', '.json']
  },

  // Handle TypeScript with esbuild
  esbuild: {
    target: 'es2020',
    format: 'esm',
    loader: {
      '.ts': 'ts'
    },
    tsconfigRaw: {
      compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        noEmit: true,
        strict: true,
        skipLibCheck: true
      }
    }
  },

  optimizeDeps: {
    exclude: [
      'babylon.js',
      'babylonjs',
      '@babylonjs/havok'
    ]
  }
});

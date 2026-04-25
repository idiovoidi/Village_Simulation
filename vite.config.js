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
    }
  },

  // Handle TypeScript
  esbuild: {
    target: 'es2020',
    format: 'esm',
    loader: {
      '.ts': 'ts'
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

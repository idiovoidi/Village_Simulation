import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      external: [
        'babylonjs',
        'babylonjs-loaders',
        'babylonjs-materials',
        'babylonjs-gui',
        '@babylonjs/havok'
      ]
    }
  },
  server: {
    port: 5173,
    open: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@core': resolve(__dirname, './src/core'),
      '@components': resolve(__dirname, './src/components'),
      '@systems': resolve(__dirname, './src/systems'),
      '@managers': resolve(__dirname, './src/managers'),
      '@utils': resolve(__dirname, './src/utils')
    }
  }
});

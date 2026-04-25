import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    lib: {
      entry: resolve(__dirname, 'src', 'index.tsx'),
      name: 'HermesPulsePlugin',
      formats: ['iife'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
  resolve: {
    alias: {
      // Point to actual Hermes Agent source for SDK imports
      '@': '/home/carlos/.hermes/hermes-agent/web/src',
    },
  },
});

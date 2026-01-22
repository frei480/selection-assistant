import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@main': path.resolve(__dirname, './src/main'),
      '@renderer': path.resolve(__dirname, './src/renderer'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: false,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        'selection-toolbar': path.resolve(__dirname, 'selection-toolbar.html'),
        result: path.resolve(__dirname, 'result.html'),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
})

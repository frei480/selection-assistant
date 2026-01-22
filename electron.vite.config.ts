import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    resolve: {
      alias: {
        '@main': path.resolve(__dirname, './src/main'),
        '@renderer': path.resolve(__dirname, './src/renderer'),
        '@shared': path.resolve(__dirname, './src/shared'),
      },
    },
    plugins: [react()],
  },
})

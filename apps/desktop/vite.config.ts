import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Prevent Vite from obscuring Tauri Rust errors
  clearScreen: false,

  // Tauri expects a fixed port, fail if that port is already in use
  server: {
    port: 1420,
    strictPort: true,
  },

  // Define build parameters for Tauri's webview
  build: {
    // Tauri supports es2021 or higher
    target: process.env.TAURI_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    // Don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // Produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});

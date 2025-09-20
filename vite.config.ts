import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Vite replaces this with the actual value at build time.
    // This is necessary to make process.env.API_KEY available in the browser.
    'process.env': {
      API_KEY: process.env.API_KEY,
    },
  },
});

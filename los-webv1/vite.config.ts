import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
   ],
  server: {
    // Ensure the server is accessible from other devices if necessary
    host: '0.0.0.0',
    port: 5173, // Default Vite port (you can change if needed)
    open: true, // Automatically open the app in browser after startup
    hmr: {
      protocol: 'ws', // Use WebSocket protocol for Hot Module Replacement
    },
  },
  build: {
    // Optimize build output (if needed)
    outDir: 'dist',
    sourcemap: true, // Generate source maps for easier debugging
    rollupOptions: {
      // Rollup configurations for optimized builds
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'tailwindcss'],
        },
      },
    },
  },
 
})
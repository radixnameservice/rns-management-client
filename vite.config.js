import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  // Set the base path to your repository name
  // For github.io: use '/repository-name/'
  // Example: if your repo is 'rns-management-client', use '/rns-management-client/'
  base: '/rns-management-client/',
  
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Generate sourcemaps for debugging
    sourcemap: false,
  },
  
  server: {
    port: 5173,
    open: true
  }
})


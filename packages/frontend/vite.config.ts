import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [ react(),
    {
      name: 'markdown-loader',
      transform(code, id) {
        if (id.endsWith('.md')) {
          return `export default ${JSON.stringify(code)};`;
        }
      }
    }
  ],
  optimizeDeps: {
    include: ['xterm', 'xterm-addon-fit', 'xterm-addon-web-links']
  },
  build: {
    commonjsOptions: {
      include: [/xterm/, /node_modules/]
    },
    chunkSizeWarningLimit: 800,
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          styles: ['bootstrap', 'bootstrap/dist/css/bootstrap.min.css'],
        },
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name ?? '';
          if (name.endsWith('.ttf') || 
              name.endsWith('.woff') || 
              name.endsWith('.woff2')) {
            return 'assets/fonts/[name][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    },
    cssCodeSplit: true,
    cssMinify: true,
  }
})

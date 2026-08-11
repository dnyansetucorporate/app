import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

// Dev-only: the marketing site (frontend/dnyansetu) lives outside Vite's module
// graph and is served as-is at "/" so the React app (built with base "/app/")
// can move to "/app/" without the two sites' asset paths colliding.
// Only known-safe static extensions are served — this deliberately excludes
// .php and anything else, since dnyansetu still contains legacy PHP scripts
// (with live SMTP/DB credentials) that must never be served or proxied.
const dnyansetuStaticServer = (): Plugin => {
  const root = path.resolve(__dirname, 'dnyansetu')
  const mimeTypes: Record<string, string> = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.jfif': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.avif': 'image/avif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  }

  return {
    name: 'dnyansetu-static-server',
    // Registered directly (not via a returned function) so this runs BEFORE
    // Vite's built-in base-redirect middleware, which otherwise 302s every
    // request outside "/app" (our configured base) back to "/app/".
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const urlPath = (req.url || '/').split('?')[0]
        if (urlPath.startsWith('/app') || urlPath.startsWith('/api')) {
          next()
          return
        }

        const relPath = urlPath === '/' ? '/index.html' : decodeURIComponent(urlPath)
        const ext = path.extname(relPath).toLowerCase()
        const mimeType = mimeTypes[ext]
        if (!mimeType) {
          next()
          return
        }

        const filePath = path.join(root, relPath)
        if (!filePath.startsWith(root)) {
          res.statusCode = 403
          res.end()
          return
        }

        fs.readFile(filePath, (err, data) => {
          if (err) {
            next()
            return
          }
          res.setHeader('Content-Type', mimeType)
          res.end(data)
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/app/',
  plugins: [react(), tailwindcss(), dnyansetuStaticServer()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    allowedHosts: true, // Allow ngrok and other tunnel hosts
    proxy: {
      // Lets the dnyansetu static pages call relative /api/... paths in both dev and prod.
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})

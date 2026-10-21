import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import { paperPlugin } from './test/vite-plugin-paper.mjs'

export default defineConfig({
  plugins: [paperPlugin(), assetsPlugin()],
  test: {
    include: ['test/tests/**/*.test.js'],
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          setupFiles: ['test/setup.mjs'],
          // The tests load their assets relative to test/, which setup.mjs
          // changes into, and only child processes can:
          pool: 'forks',
          // Load the library once per process rather than once per file, as
          // each test runs in a project of its own:
          isolate: false
        }
      },
      {
        extends: true,
        test: {
          name: 'browser',
          browser: {
            enabled: true,
            // Use the installed Google Chrome rather than Playwright's own,
            // and draw without the GPU, which antialiases the pixel
            // comparisons of the boolean tests differently:
            provider: playwright({
              launchOptions: { channel: 'chrome', args: ['--disable-gpu'] }
            }),
            headless: true,
            instances: [{ browser: 'chromium' }]
          }
        }
      }
    ]
  }
})

// Serve test/assets at /assets, where the tests load them from in the browser:
function assetsPlugin() {
  const assets = path.resolve(import.meta.dirname, 'test', 'assets')
  const types = {
    '.gif': 'image/gif',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ttf': 'font/ttf'
  }
  return {
    name: 'assets',
    configureServer(server) {
      server.middlewares.use('/assets', (req, res, next) => {
        const file = path.join(
          assets,
          decodeURIComponent(req.url.split('?')[0])
        )
        if (file.startsWith(assets) && fs.existsSync(file)) {
          res.setHeader(
            'Content-Type',
            types[path.extname(file)] || 'text/plain'
          )
          fs.createReadStream(file).pipe(res)
        } else {
          next()
        }
      })
    }
  }
}

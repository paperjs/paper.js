import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import { paperPlugin } from './test/vite-plugin-paper.mjs'

export default defineConfig({
  plugins: [paperPlugin(), assetsPlugin()],
  test: {
    // Measured on Node, with the sources loaded through src/load.js, see
    // `pnpm test:coverage`:
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/load.js'],
      reporter: ['text-summary', 'html']
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          include: ['test/tests/**/*.test.js'],
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
          include: ['test/tests/**/*.test.js'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }]
          }
        }
      },
      {
        extends: true,
        test: {
          name: 'screenshots',
          include: ['test/screenshots/**/*.test.js'],
          // Rendering differs between systems, so the screenshots are only
          // compared in Playwright's Docker image, see `pnpm test:screenshots`:
          globalSetup: ['test/screenshots/setup.mjs'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            // Wide enough for the widest scene, as the default is a phone's:
            viewport: { width: 1000, height: 1000 },
            instances: [{ browser: 'chromium' }],
            expect: {
              toMatchScreenshot: {
                resolveScreenshotPath: ({
                  root,
                  testFileDirectory,
                  screenshotDirectory,
                  testFileName,
                  arg,
                  ext
                }) =>
                  path.join(
                    root,
                    testFileDirectory,
                    screenshotDirectory,
                    testFileName,
                    arg + ext
                  )
              }
            }
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

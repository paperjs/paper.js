// The tests load their assets relative to test/, also through the window that
// paper/node creates when imported, so change into it first:
process.chdir(new URL('.', import.meta.url).pathname)

// Text is measured in the tests' own font, which helpers.js loads in browsers:
const { GlobalFonts } = await import('paper')
const { testFontFamily } = await import('./helpers.js')
GlobalFonts.registerFromPath('assets/fonts/Inter-Regular.ttf', testFontFamily)

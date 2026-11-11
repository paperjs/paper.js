// paper/node needs the optional peers happy-dom and @napi-rs/canvas installed.
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import paper, { PaperScope } from 'paper/node'
import { PaperScript } from 'paper/paperscript'

const scope = new PaperScope()
scope.setup(new paper.Size(1024, 768))
const code = await readFile(
  path.join(import.meta.dirname, 'Tadpoles.pjs'),
  'utf8'
)
PaperScript.execute(code, scope)

await scope.view.exportFrames({
  amount: 400,
  directory: import.meta.dirname,
  onProgress(event) {
    console.log(`${event.percentage}% complete, frame took: ${event.delta}`)
  }
})
console.log('Done exporting.')

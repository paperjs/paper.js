// paper/node needs the optional peers happy-dom and @napi-rs/canvas installed.
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import paper from 'paper/node'

paper.setup(paper.createCanvas(612, 792))
const data = await readFile('./in.json', { encoding: 'utf8' })
paper.project.importJSON(data)
await paper.view.exportImage(path.resolve('./out.png'))
console.log('Saved!')

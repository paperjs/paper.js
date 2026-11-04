// paper/node needs the optional peers happy-dom and @napi-rs/canvas installed.
import path from 'node:path'
import paper from 'paper/node'

const canvas = paper.createCanvas(800, 600)
paper.setup(canvas)

const url = 'http://assets.paperjs.org/images/marilyn.jpg'
const raster = new paper.Raster(url)
raster.position = paper.view.center

raster.onLoad = async function () {
  console.log(`The image has loaded:${raster.bounds}`)
  // Saving the canvas to a file.
  await paper.view.exportImage(path.join(import.meta.dirname, 'canvas.png'))
  console.log('saved png')
}

raster.onError = function (message) {
  console.error(message)
}

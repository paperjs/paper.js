// paper/node needs the optional peers happy-dom and @napi-rs/canvas installed.
import http from 'node:http'
import paper from 'paper/node'

const { Color, Path } = paper

http
  .createServer(async (request, response) => {
    const canvas = paper.createCanvas(800, 800)
    paper.setup(canvas)
    const style = {
      fillColor: new Color(1, 1, 0, 0.5),
      strokeColor: new Color(0, 0, 0),
      strokeWidth: 1.5
    }

    const first = new Path.Rectangle([50, 50], [150, 150])
    first.style = style
    const second = first.clone().translate(50, 50)
    second.style = style

    const intersection = first.subtract(second)
    intersection.style = style
    intersection.translate(250, 0)
    paper.view.update()

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
    response.writeHead(200, { 'Content-Type': 'image/png' })
    response.end(Buffer.from(await blob.arrayBuffer()))
  })
  .listen(3000)

console.log('Server running at http://127.0.0.1:3000/')

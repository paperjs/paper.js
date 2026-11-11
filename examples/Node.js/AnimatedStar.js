// paper/node needs the optional peers happy-dom and @napi-rs/canvas installed.
import paper from 'paper/node'

const { Path, Point, Size } = paper

paper.setup(new Size(1024, 768))

const layer = paper.project.activeLayer

const values = {
  count: 34,
  points: 32
}

initialize()

paper.view.onFrame = function (event) {
  for (let i = 0, l = layer.children.length; i < l; i++) {
    const item = layer.children[i]
    const angle = ((values.count - i) * Math.sin(event.count / 128)) / 10
    item.rotate(angle)
  }
}

await paper.view.exportFrames({
  amount: 100,
  directory: import.meta.dirname,
  onProgress(event) {
    console.log(`${event.percentage}% complete, frame took: ${event.delta}`)
  }
})
console.log('Done exporting.')

function initialize() {
  for (let i = 0; i < values.count; i++) {
    const offset = new Point(20 + 10 * i, 0)
    const path = new Path()
    path.fillColor = i % 2 ? 'red' : 'black'
    path.closed = true

    const l = offset.length
    for (let j = 0; j < values.points * 2; j++) {
      offset.angle += 360 / values.points
      const vector = offset.normalize(l * (j % 2 ? 0.1 : -0.1))
      path.add(offset.add(vector))
    }
    path.smooth()
    layer.insertChild(0, path)
  }
  layer.fitBounds(paper.view.bounds)
}

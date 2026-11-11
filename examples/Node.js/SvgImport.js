// paper/node needs the optional peers happy-dom and @napi-rs/canvas installed.
import paper from 'paper/node'

paper.setup(new paper.Size(300, 600))
paper.project.importSVG('in.svg', {
  async onLoad(item) {
    await paper.view.exportFrames({
      amount: 1,
      directory: import.meta.dirname,
      onProgress(event) {
        console.log(`${event.percentage}% complete, frame took: ${event.delta}`)
      }
    })
    console.log('Done exporting.')
  },
  onError(message) {
    console.error(message)
  }
})

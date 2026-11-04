// paper/node needs the optional peers happy-dom and @napi-rs/canvas installed.
import paper from 'paper/node'

paper.setup(new paper.Size(300, 600))
paper.project.importSVG('in.svg', {
  onLoad(item) {
    paper.view.exportFrames({
      amount: 1,
      directory: import.meta.dirname,
      onComplete() {
        console.log('Done exporting.')
      },
      onProgress(event) {
        console.log(`${event.percentage}% complete, frame took: ${event.delta}`)
      }
    })
  },
  onError(message) {
    console.error(message)
  }
})

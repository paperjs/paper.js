var paper = require('paper'),
    path = require('path'),
    fs = require('fs');

paper.setup(new paper.Size(300, 600));
paper.project.importSVG('file://' + path.resolve(__dirname, 'in.svg'), {
    onLoad: function(item) {
        paper.view.exportFrames({
            amount: 1,
            directory: __dirname,
            onComplete: function() {
                console.log('Done exporting.');
            },
            onProgress: function(event) {
                console.log(event.percentage + '% complete, frame took: ' + event.delta);
            }
        });
    }
});

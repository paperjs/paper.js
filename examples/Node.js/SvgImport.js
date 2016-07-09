// Please note: When loading paper as a normal module installed in node_modules,
// you would use this instead:
// var paper = require('paper');
var paper = require('../../dist/paper-core.js');
var path = require('path');
var fs = require('fs');

paper.setup(new paper.Size(300, 600));
paper.project.importSVG('in.svg', {
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
    },
    onError: function(message) {
        console.error(message);
    }
});

// Please note: When loading paper as a normal module installed in node_modules,
// you would use this instead:
// var paper = require('paper-jsdom-canvas');
var paper = require('../../dist/paper-full.js');
var scope = require('./Tadpoles.pjs')(new paper.Size(1024, 768));

scope.view.exportFrames({
    amount: 400,
    directory: __dirname,
    onComplete: function() {
        console.log('Done exporting.');
    },
    onProgress: function(event) {
        console.log(event.percentage + '% complete, frame took: ' + event.delta);
    }
});

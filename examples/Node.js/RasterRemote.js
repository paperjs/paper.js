// Please note: When loading paper as a normal module installed in node_modules,
// you would use this instead:
// var paper = require('paper');
var paper = require('../../dist/paper-core.js');
var fs = require('fs');

var canvas = paper.createCanvas(800, 600);
paper.setup(canvas);

var url = 'http://assets.paperjs.org/images/marilyn.jpg';
var raster = new paper.Raster(url);
raster.position = paper.view.center;

raster.onLoad = function() {
    paper.view.update();
    console.log('The image has loaded:' + raster.bounds);

    // Saving the canvas to a file.
    out = fs.createWriteStream(__dirname + '/canvas.png');
    stream = canvas.createPNGStream();

    stream.on('data', function(chunk) {
        out.write(chunk);
    });

    stream.on('end', function() {
        console.log('saved png');
    });
};

raster.onError = function(message) {
    console.error(message);
};

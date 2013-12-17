var paper = require('paper');
var fs = require('fs');

var canvas = new paper.Canvas(800, 600);
paper.setup(canvas);

var url = 'http://upload.wikimedia.org/wikipedia/en/2/24/Lenna.png';
var raster = new paper.Raster(url);
raster.position = paper.view.center;

raster.onLoad = function() {
    console.log('The image has loaded:' + raster.bounds);

    // Saving the canvas to a file.
    out = fs.createWriteStream(__dirname + '/canvas.png');
    stream = canvas.pngStream();

    stream.on('data', function(chunk) {
        out.write(chunk);
    });

    stream.on('end', function() {
        console.log('saved png');
    });
};

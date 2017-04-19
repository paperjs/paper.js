// Please note: When loading paper as a normal module installed in node_modules,
// you would use this instead:
// var paper = require('paper-jsdom-canvas');
var paper = require('../../dist/paper-core.js');
var path = require('path');
var fs = require('fs');

var canvas = paper.createCanvas(612, 792, 'pdf');
paper.setup(canvas);
fs.readFile('./in.json', { encoding: 'utf8' }, function (err, data) {
    if (err)
        throw err;
    paper.project.importJSON(data);
    paper.view.update();
    fs.writeFile(path.resolve('./out.pdf'), canvas.toBuffer(), function (err) {
        if (err)
            throw err;
        console.log('Saved!');
    });
});

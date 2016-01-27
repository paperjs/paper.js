var paper = require('paper'),
    path = require('path'),
    fs = require('fs');

var canvas = paper.createCanvas(612, 792, 'pdf');
paper.setup(canvas);
fs.readFile('./in.json', { encoding: 'utf8' }, function (err, data) {
    if (err)
        throw err;
    paper.project.importJSON(data);
    paper.view.update();
    fs.writeFile(path.resolve(__dirname, 'out.pdf'), canvas.toBuffer(), function (err) {
        if (err)
            throw err;
        console.log('Saved!');
        process.exit();
    });
});

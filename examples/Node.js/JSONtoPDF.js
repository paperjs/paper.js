var paper = require('paper'),
    path = require('path'),
    fs = require('fs');

var canvas = new paper.Canvas(612, 792, 'pdf');
paper.setup(canvas);
with (paper) {
    fs.readFile('./in.json', { encoding: 'utf8' }, function (err, data) {
        if (err)
            throw err; 
        project.importJSON(data);
        view.update();
        fs.writeFile(path.resolve(__dirname, 'out.pdf'), canvas.toBuffer(), function (err) {
            if (err)
                throw err;
            console.log('Saved!');
        });
    });
}

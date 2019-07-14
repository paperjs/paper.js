// Please note: When loading paper as a normal module installed in node_modules,
// you would use this instead:
// var paper = require('paper-jsdom-canvas');
var paper = require('../../dist/paper-core.js');
var path = require('path');
var fs = require('fs');

with (paper) {
    paper.setup(new Size(300, 600));
    var stops = [new Color(1, 1, 0, 0), 'red', 'black'];

    var radius = view.bounds.width * 0.4,
        from = new Point(view.center.x),
        to = from.add(radius, 0);

    var circle = new Path.Circle({
        center: from,
        radius: radius,
        fillColor: {
            stops: stops,
            radial: true,
            origin: from,
            destination: to
        },
        strokeColor: 'black'
    });

    var from = view.bounds.leftCenter,
        to = view.bounds.bottomRight;

    var rect = new Path.Rectangle({
        from: from,
        to: to,
        fillColor: {
            stops: stops,
            radial: false,
            origin: from,
            destination: to
        },
        strokeColor: 'black'
    });

    rect.rotate(45).scale(0.7);

    var svg = project.exportSVG({ asString: true });
    console.log(svg);

    fs.writeFile(path.resolve('./out.svg'), svg, function (err) {
        if (err) throw err;
        console.log('Saved!');
    });
}

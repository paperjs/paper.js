var paper = require('paper'),
    path = require('path'),
    fs = require('fs');

paper.setup(new paper.Canvas(300, 600));
with (paper) {
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

    fs.writeFile(path.resolve(__dirname, 'out.svg'),svg, function (err) {
        if (err) throw err;
        console.log('Saved!');
    });
}

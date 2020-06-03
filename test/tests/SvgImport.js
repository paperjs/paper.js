/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2020, Jürg Lehni & Jonathan Puckey
 * http://juerglehni.com/ & https://puckey.studio/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

QUnit.module('SvgImport');

test('Import SVG line', function() {
    var attrs = {
        x1: 5,
        x2: 45,
        y1: 5,
        y2: 45
    };
    var imported = paper.project.importSVG(createSVG('line', attrs));
    var path = new Path.Line([attrs.x1, attrs.y1], [attrs.x2, attrs.y2]);
    equals(imported, path);
});

test('Import SVG rect', function() {
    var attrs = {
        x: 25,
        y: 25,
        width: 100,
        height: 100
    };
    var imported = paper.project.importSVG(createSVG('rect', attrs),
            { expandShapes: true });
    var path = new Path.Rectangle(attrs);
    equals(imported, path);
});

test('Import SVG round rect', function() {
    var attrs = {
        x: 25,
        y: 25,
        rx: 50,
        ry: 50,
        width: 100,
        height: 100
    };
    var imported = paper.project.importSVG(createSVG('rect', attrs),
            { expandShapes: true });
    var path = new Path.Rectangle(new Rectangle(attrs),
            new Size(attrs.rx, attrs.ry));
    equals(imported, path);
});

test('Import SVG ellipse', function() {
    var attrs = {
        cx: 300,
        cy: 80,
        rx: 100,
        ry: 50
    };
    var imported = paper.project.importSVG(createSVG('ellipse', attrs),
            { expandShapes: true });
    var path = new Path.Ellipse({
        center: new Point(attrs.cx, attrs.cy),
        radius: new Point(attrs.rx, attrs.ry)
    });
    equals(imported, path);
});

test('Import SVG circle', function() {
    var attrs = {
        cx: 100,
        cy: 80,
        r: 50
    };
    var imported = paper.project.importSVG(createSVG('circle', attrs),
            { expandShapes: true });
    var path = new Path.Circle({
        center: new Point(attrs.cx, attrs.cy),
        radius: attrs.r
    });
    equals(imported, path);
});

function createPolyPath(str) {
    var points = str.split(' ').map(function(point) {
        return point.split(',').map(parseFloat);
    });
    var path = new Path();
    path.moveTo(points[0]);
    for (var i = 1; i < points.length; i++)
        path.lineTo(points[i]);
    return path;
}

test('Import SVG polygon', function() {
    var points = '100,10 40,180 190,60 10,60 160,180';
    var imported = paper.project.importSVG(createSVG('polygon', {
        points: points
    }));
    var path = createPolyPath(points);
    path.closePath();
    equals(imported, path);
});

test('Import SVG polyline', function() {
    var points = '5,5 45,45 5,45 45,5';
    var imported = paper.project.importSVG(createSVG('polyline', {
        points: points
    }));
    var path = createPolyPath(points);
    equals(imported, path);
});

test('Import SVG Image', function(assert) {
    var done = assert.async();
    var svg = '<?xml version="1.0" encoding="utf-8"?><svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><image style="overflow:visible;enable-background:new    ;" width="300" height="67" id="e0" xlink:href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" transform="matrix(0.2149 0 0 0.2149 304.7706 197.8176)"></image></svg>';
    var imported = paper.project.importSVG(svg);
    var raster = imported.children[0];
    raster.on('load', function() {
        equals(raster.matrix, new Matrix(0.2149, 0, 0, 0.2149, 337.0056, 205.01675));
        done();
    });
});

test('Import complex CompoundPath and clone', function() {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg"><path fill="red" d="M4,14h20v-2H4V14z M15,26h7v-2h-7V26z M15,22h9v-2h-9V22z M15,18h9v-2h-9V18z M4,26h9V16H4V26z M28,10V6H0v22c0,0,0,4,4,4 h25c0,0,3-0.062,3-4V10H28z M4,30c-2,0-2-2-2-2V8h24v20c0,0.921,0.284,1.558,0.676,2H4z"/></svg>';
    var item = paper.project.importSVG(svg);
    equals(item.clone(), item, null, { cloned: true });
});

test('Import SVG without insertion', function() {
    var svg = createSVG('path', { d: '' });
    var imported = paper.project.importSVG(svg, { insert: true });
    equals(function() {
        return imported.parent === project.activeLayer;
    }, true);
    var imported = paper.project.importSVG(svg, { insert: false });
    equals(function() {
        return imported.parent === null;
    }, true);
});

test('Import SVG switch', function(assert) {
    var done = assert.async();
    var svg = '<svg xmlns="http://www.w3.org/2000/svg"><switch><line x1="0" x2="10" y1="0" y2="10" fill="none"></line></switch></svg>';
    paper.project.importSVG(svg, {
        onLoad: function(item) {
            equals(item.className, 'Group');
            equals(item.children.length, 1);
            equals(item.firstChild.className, 'Group');
            equals(item.firstChild.children.length, 1);
            equals(item.firstChild.firstChild, new Path([new Point(0, 0), new Point(10, 10)]));
            done();
        }
    });
});

test('Import SVG string with leading line-breaks', function() {
    var svg = '\n<?xml version="1.0" encoding="utf-8"?>\n<!-- Some Comment  -->\n<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n  <rect fill="red" width="100" height="100"/>\n</svg>\n'
    var imported = paper.project.importSVG(svg);
    equals(function() { return imported !== null }, true);
    equals(imported.children.length, 1);
    equals(imported.firstChild, new Shape.Rectangle({
        size: [100, 100],
        fillColor: 'red'
    }));
});

function importSVG(assert, url, message, options) {
    var done = assert.async();
    project.importSVG(url, {
        applyMatrix: false,

        onLoad: function(item, svg) {
            if (!message) {
                message = 'The imported SVG "' + url + '" should visually be '
                    + 'the same as the rasterized original SVG data.';
            }
            compareSVG(done, item, svg, message, options);
        },

        onError: function(error) {
            var ok = !!(options && options.expectError);
            QUnit.push(ok, false, !ok, ok && message
                || 'Loading SVG from a valid URL should not give an error: ' +
                    error);
            done();
        }
    });
}

if (!isNodeContext) {
    // JSDom does not have SVG rendering, so we can't test there.
    var svgFiles = {
        'butterfly': { tolerance: 1e-2 },
        'viewbox': { tolerance: 1e-2 },
        'clipping': {},
        'arcs': {},
        'symbol': {},
        'symbols': {},
        'blendModes': {},
        'gradients-1': {},
        'gradients-2': !isPhantomContext && {},
        'gradients-3': {},
        'gradients-4': {}
    };
    Base.each(svgFiles, function(options, name) {
        if (options) {
            name += '.svg';
            test('Import ' + name, function(assert) {
                importSVG(assert, 'assets/' + name, null, options);
            });
        }
    });

    test('Import inexistent file', function(assert) {
        importSVG(assert, 'assets/inexistent.svg',
            'Load an inexistent SVG file should trigger an error',
            { expectError: true });
    });
}

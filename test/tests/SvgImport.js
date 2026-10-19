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

test('Import SVG round rect with only rx or ry (#1863)', function() {
    function getRadius(attrs) {
        var imported = paper.project.importSVG(
                '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">'
                + '<rect width="100" height="80" ' + attrs + '/></svg>');
        return imported.firstChild.radius;
    }

    // A missing rx or ry takes the other's value, and percentages refer to
    // the width for rx and to the height for ry:
    equals(getRadius(''), new Size(0, 0));
    equals(getRadius('rx="10"'), new Size(10, 10));
    equals(getRadius('ry="10"'), new Size(10, 10));
    equals(getRadius('rx="10" ry="20"'), new Size(10, 20));
    equals(getRadius('rx="10%"'), new Size(20, 20));
    equals(getRadius('ry="10%"'), new Size(10, 10));
    equals(getRadius('rx="10%" ry="10%"'), new Size(20, 10));
});

test('Import SVG with inline styles and attributes (#1962)', function() {
    function importRect(attrs) {
        return paper.project.importSVG(
                '<svg xmlns="http://www.w3.org/2000/svg">'
                + '<rect width="10" height="10" ' + attrs + '/></svg>')
                .firstChild;
    }

    // Inline styles override presentation attributes, as in CSS:
    var rect = importRect('fill="blue" stroke-width="2" '
            + 'style="fill: red; stroke-width: 4"');
    equals(rect.fillColor, new Color('red'), 'fill from style');
    equals(rect.strokeWidth, 4, 'stroke-width from style');
    rect = importRect('fill="blue" style="stroke-width: 4"');
    equals(rect.fillColor, new Color('blue'), 'fill from attribute');
    rect = importRect('style="fill: red"');
    equals(rect.fillColor, new Color('red'), 'fill from style only');
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

test('Import SVG path with arc flags without separators (#1808)', function() {
    var data = 'M-481.302-497.13l-214.207 28.674c-.106-.531-.106-.956-.212-1.38'
            + 'l212.826-37.277a150.441 150.441 0 011.593 9.983';
    var imported = paper.project.importSVG(createSVG('path', { d: data }));
    // The relative arc ends 1.593, 9.983 from the end of the previous line:
    equals(imported.lastSegment.point, new Point(-481.302, -497.13));
    equals(imported, new Path(data.replace('0 011.593', '0 0 1 1.593')));
});

test('Import SVG multi-line text (#988)', function() {
    function importText(content) {
        return paper.project.importSVG('<svg xmlns="http://www.w3.org/2000/svg">'
                + '<text x="10" y="20">' + content + '</text></svg>')
                .firstChild;
    }

    // Lines as written by Illustrator, with formatting white-space:
    var text = importText('\n  <tspan x="10" y="20">One</tspan>'
            + '\n  <tspan x="10" y="32"></tspan>'
            + '\n  <tspan x="10" y="44">Three</tspan>\n');
    equals(text.content, 'One\n\nThree');
    equals(text.point, new Point(10, 20));
    // <tspan> elements within a line don't break it:
    equals(importText('One <tspan font-weight="bold">Two</tspan>').content,
            'One Two');
    equals(importText(' <tspan x="10" y="20">One <tspan>Two</tspan></tspan> ')
            .content, 'One Two');
});

test('Import SVG Image', function(assert) {
    var done = assert.async();
    var svg = '<?xml version="1.0" encoding="utf-8"?><svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><image style="overflow:visible;enable-background:new    ;" width="300" height="67" id="e0" xlink:href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" transform="matrix(0.2149 0 0 0.2149 304.7706 197.8176)"></image></svg>';
    var imported = paper.project.importSVG(svg);
    var raster = imported.children[0];
    raster.on('load', function() {
        // The 1 x 1 pixel image is scaled to its size of 300 x 67, and then by
        // the transform matrix:
        equals(raster.size, new Size(1, 1));
        equals(raster.matrix, new Matrix(64.47, 0, 0, 14.3983, 337.0056, 205.01675));
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

test('Import SVG Image through <use>', function(assert) {
    var done = assert.async(),
        canvas = CanvasProvider.getCanvas(4, 2),
        url = canvas.toDataURL(),
        image = '<image xlink:href="' + url + '" width="20" height="10"',
        uses = paper.project.importSVG('<svg xmlns="http://www.w3.org/2000/svg"'
            + ' xmlns:xlink="http://www.w3.org/1999/xlink">'
            + '<defs>' + image + ' id="image"/></defs>'
            + '<use xlink:href="#image" x="5" y="5"/>'
            + '<use xlink:href="#image" x="40" y="5"'
            + ' transform="rotate(90 50 10)"/></svg>'),
        // The same images, written out where the <use> elements place them:
        inline = paper.project.importSVG('<svg xmlns="http://www.w3.org/2000/svg"'
            + ' xmlns:xlink="http://www.w3.org/1999/xlink">'
            + image + ' x="5" y="5"/>'
            + '<g transform="rotate(90 50 10)">' + image + ' x="40" y="5"/>'
            + '</g></svg>'),
        rasters = uses.getItems({ class: Raster }).concat(
            inline.getItems({ class: Raster })),
        loaded = 0;
    rasters.forEach(function(raster) {
        raster.on('load', function() {
            if (++loaded === rasters.length) {
                equals(rasters[0].bounds, new Rectangle(5, 5, 20, 10),
                        'first <use> bounds');
                equals(rasters[0].bounds, rasters[2].bounds, 'first <use>');
                equals(rasters[1].bounds, rasters[3].bounds, 'second <use>');
                equals(rasters[0].size, new Size(4, 2), 'raster.size');
                done();
            }
        });
    });
});

test('Import SVG Image keeps its pixels (#1963)', function(assert) {
    var done = assert.async(),
        // A 4 x 2 pixel image with a red pixel at 3, 1:
        canvas = CanvasProvider.getCanvas(4, 2),
        ctx = canvas.getContext('2d');
    ctx.fillStyle = 'red';
    ctx.fillRect(3, 1, 1, 1);
    var url = canvas.toDataURL(),
        imported = paper.project.importSVG(
            '<svg xmlns="http://www.w3.org/2000/svg"'
            + ' xmlns:xlink="http://www.w3.org/1999/xlink">'
            + '<image xlink:href="' + url + '" x="10" y="20" width="2"'
            + ' height="1"/>'
            + '<image xlink:href="' + url + '" x="10" y="20"/></svg>'),
        scaled = imported.children[0],
        natural = imported.children[1],
        loaded = 0;

    function onLoad() {
        if (++loaded === 2) {
            // The image keeps its 4 x 2 pixels, scaled to the given size:
            equals(scaled.size, new Size(4, 2), 'scaled.size');
            equals(scaled.bounds, new Rectangle(10, 20, 2, 1), 'scaled.bounds');
            equals(scaled.getPixel(3, 1), new Color(1, 0, 0, 1), 'scaled pixel');
            // Without a size, the image is shown at its own size:
            equals(natural.bounds, new Rectangle(10, 20, 4, 2),
                    'natural.bounds');
            done();
        }
    }

    scaled.on('load', onLoad);
    natural.on('load', onLoad);
});

test('Import SVG Image with crossOrigin (#1094)', function(assert) {
    var done = assert.async(),
        canvas = CanvasProvider.getCanvas(4, 2),
        svg = '<svg xmlns="http://www.w3.org/2000/svg"'
            + ' xmlns:xlink="http://www.w3.org/1999/xlink">'
            + '<image xlink:href="' + canvas.toDataURL() + '" id="image"'
            + ' x="10" y="20"/>'
            + '<use xlink:href="#image" x="5" y="5"/></svg>',
        rasters = paper.project.importSVG(svg, { crossOrigin: 'anonymous' })
            .getItems({ class: Raster }),
        loaded = 0;
    // Both the <image> and the raster imported again for <use> get it, and
    // pass it on to their image elements:
    equals(rasters.length, 2, 'rasters.length');
    rasters.forEach(function(raster, i) {
        equals(raster.crossOrigin, 'anonymous', i + ': raster.crossOrigin');
        equals(raster.image.crossOrigin, 'anonymous', i + ': image.crossOrigin');
        raster.on('load', function() {
            if (++loaded === rasters.length) {
                // The images still load and are positioned as without it:
                equals(rasters[0].bounds, new Rectangle(10, 20, 4, 2),
                        '<image> bounds');
                equals(rasters[1].bounds, new Rectangle(15, 25, 4, 2),
                        '<use> bounds');
                done();
            }
        });
    });
    // By default, no crossOrigin is set:
    var raster = paper.project.importSVG(svg).getItem({ class: Raster });
    equals(raster.crossOrigin, '', 'default: raster.crossOrigin');
    equals(raster.image.crossOrigin, null, 'default: image.crossOrigin');
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

test('Import SVG with references to later definitions (#1146, #1884)', function() {
    function importWith(content) {
        return paper.project.importSVG('<svg xmlns="http://www.w3.org/2000/svg"'
                + ' xmlns:xlink="http://www.w3.org/1999/xlink">' + content
                + '</svg>');
    }

    function getStops(color) {
        return color.gradient.stops.map(function(stop) {
            return [stop.color.toCSS(true), stop.offset];
        });
    }

    // A gradient that links to a gradient defined after it:
    var derived = '<linearGradient id="derived" xlink:href="#base"/>',
        base = '<linearGradient id="base"><stop offset="5%" stop-color="green"/>'
            + '<stop offset="95%" stop-color="gold"/></linearGradient>',
        rect = '<rect fill="url(#derived)" width="100" height="100"/>',
        imported = importWith('<defs>' + derived + base + '</defs>' + rect);
    equals(getStops(imported.firstChild.fillColor),
            [['#008000', 0.05], ['#ffd700', 0.95]]);
    equals(imported, importWith('<defs>' + base + derived + '</defs>' + rect));

    // A fill that references a gradient after it, outside of <defs>:
    imported = importWith(rect + derived + base);
    equals(getStops(imported.firstChild.fillColor),
            [['#008000', 0.05], ['#ffd700', 0.95]]);
    equals(imported, importWith(base + derived + rect));

    // <use> elements that reference a symbol and an element after them:
    var uses = '<use xlink:href="#symbol" x="10" y="20"/>'
            + '<use xlink:href="#circle" x="10" y="20"/>',
        symbol = '<symbol id="symbol"><rect width="10" height="10"/></symbol>',
        circle = '<circle id="circle" cx="5" cy="5" r="5"/>';
    imported = importWith(uses + symbol + circle);
    equals(function() {
        return imported.children.length;
    }, 3);
    equals(function() {
        return imported.children[0].definition.item.children.length;
    }, 1);
    equals(imported.children[0].bounds, new Rectangle(10, 20, 10, 10));
    equals(imported.children[1].bounds, new Rectangle(10, 20, 10, 10));
    equals(imported.children[2].bounds, new Rectangle(0, 0, 10, 10));
    equals(imported, importWith(symbol + uses + circle));
});

test('Import SVG gradient with a link to an inexistent gradient', function() {
    // An invalid link is ignored, and the gradient uses its own stops:
    var gradient = '<linearGradient id="gradient"%s>'
            + '<stop offset="0" stop-color="red"/>'
            + '<stop offset="1" stop-color="blue"/></linearGradient>',
        rect = '<rect fill="url(#gradient)" width="100" height="100"/>';
    function importWith(href) {
        return paper.project.importSVG('<svg xmlns="http://www.w3.org/2000/svg"'
                + ' xmlns:xlink="http://www.w3.org/1999/xlink"><defs>'
                + gradient.replace('%s', href) + '</defs>' + rect + '</svg>');
    }
    var imported = importWith(' xlink:href="#inexistent"');
    equals(function() {
        return imported.firstChild.fillColor.gradient.stops.length;
    }, 2);
    equals(imported, importWith(''));
});

test('Import SVG with numeric ids (#1754)', function() {
    var imported = paper.project.importSVG('<svg xmlns="http://www.w3.org/2000/svg"'
            + ' xmlns:xlink="http://www.w3.org/1999/xlink">'
            + '<g id="2"><rect width="10" height="10"/></g>'
            + '<rect id="3a" width="10" height="10"/>'
            + '<use xlink:href="#2" x="20"/></svg>');
    equals(function() {
        return imported.children.length;
    }, 3);
    equals(function() {
        return imported.children[0].name;
    }, null);
    equals(function() {
        return imported.children[1].name;
    }, '3a');
    // References by numeric ids still work:
    equals(imported.children[2].bounds, new Rectangle(20, 0, 10, 10));
});

test('Import SVG with SVG 2 href attributes (#1329)', function(assert) {
    var done = assert.async(),
        url = CanvasProvider.getCanvas(4, 2).toDataURL(),
        svg = '<svg xmlns="http://www.w3.org/2000/svg"'
            + ' xmlns:xlink="http://www.w3.org/1999/xlink"><defs>'
            + '<linearGradient id="base">'
            + '<stop offset="0" stop-color="red"/>'
            + '<stop offset="1" stop-color="blue"/></linearGradient>'
            + '<linearGradient id="derived" %href="#base">'
            + '<stop offset="0" stop-color="green"/>'
            + '<stop offset="1" stop-color="gold"/></linearGradient>'
            + '<symbol id="symbol"><rect width="10" height="10"/></symbol>'
            + '</defs>'
            + '<rect fill="url(#derived)" width="100" height="100"/>'
            + '<use %href="#symbol" x="10" y="20"/>'
            + '<image %href="' + url + '" x="10" y="20"/></svg>';
    function importWith(href) {
        return paper.project.importSVG(svg.replace(/%href/g, href));
    }

    var plain = importWith('href'),
        xlink = importWith('xlink:href'),
        // Plain href takes precedence over xlink:href:
        both = importWith('xlink:href="#inexistent" href'),
        loaded = 0;

    // The linked gradient's stops replace the gradient's own ones:
    equals(plain.children[0].fillColor.gradient.stops[0].color,
            new Color('red'));
    equals(function() {
        return plain.children[1].definition.item.children.length;
    }, 1);
    equals(plain.children[1].bounds, new Rectangle(10, 20, 10, 10));
    equals(function() {
        return plain.children[2].source;
    }, url);

    function onLoad() {
        if (++loaded === 3) {
            equals(plain.children[2].bounds, new Rectangle(10, 20, 4, 2));
            equals(plain, xlink);
            equals(both, xlink);
            done();
        }
    }

    plain.children[2].on('load', onLoad);
    xlink.children[2].on('load', onLoad);
    both.children[2].on('load', onLoad);
});

test('Import SVG <use> of a group with a transform (#978)', function() {
    function importWith(content) {
        return paper.project.importSVG('<svg xmlns="http://www.w3.org/2000/svg"'
                + ' xmlns:xlink="http://www.w3.org/1999/xlink">'
                + '<defs><g id="group"><rect width="20" height="10"/></g>'
                + '<rect id="rect" width="20" height="10"/></defs>'
                + content + '</svg>');
    }

    // In SVG, x / y on <use> translate before its transform: rotating the
    // rectangle [10, 0, 20, 10] by 90° around [50, 50] gives [90, 10, 10, 20].
    var imported = importWith('<use xlink:href="#group" x="10"'
            + ' transform="rotate(90 50 50)"/>'),
        use = imported.lastChild;
    equals(use.bounds, new Rectangle(90, 10, 10, 20));
    // The same as a group with the equivalent transform:
    equals(use.firstChild, importWith('<g transform="rotate(90 50 50)'
            + ' translate(10 0)"><rect width="20" height="10"/></g>')
            .lastChild.firstChild);
    // The same as a <use> of a single item:
    equals(use.bounds, importWith('<use xlink:href="#rect" x="10"'
            + ' transform="rotate(90 50 50)"/>').lastChild.bounds);
    // Styles on <use> are inherited by the group's content:
    equals(importWith('<use xlink:href="#group" fill="red"/>')
            .lastChild.firstChild.fillColor, new Color('red'));
});

test('Import SVG cleans up after errors', function() {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" data-paper-data="invalid JSON"><rect width="100" height="100"/></svg>';
    var settings = paper.settings,
        count = document.getElementsByTagName('svg').length;
    equals(function() {
        try {
            paper.project.importSVG(svg);
        } catch (e) {
            return true;
        }
        return false;
    }, true);
    equals(function() {
        return document.getElementsByTagName('svg').length;
    }, count);
    equals(function() { return settings.applyMatrix; }, true);
    equals(function() { return settings.insertItems; }, true);
});

if (!isNodeContext) {
    // JSDom doesn't apply style sheets to SVG, nor does it run scripts, so
    // these can only be tested in the browser.
    test('Import SVG with embedded style sheet', function() {
        var svg = '<svg xmlns="http://www.w3.org/2000/svg"><style>rect { fill: red; }</style><rect width="100" height="100"/></svg>';
        var imported = paper.project.importSVG(svg, { expandShapes: true });
        equals(imported.lastChild.fillColor, new Color('red'));
    });

    test('Import SVG is not affected by the page\'s style sheets', function() {
        var style = document.createElement('style');
        style.textContent = 'rect.page-styled { fill: red; }';
        document.head.appendChild(style);
        var svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect class="page-styled" width="100" height="100"/></svg>';
        var imported = paper.project.importSVG(svg, { expandShapes: true });
        document.head.removeChild(style);
        equals(function() {
            return imported.lastChild.fillColor.toCSS(true);
        }, '#000000');
    });

    test('Import SVG does not execute embedded scripts (#2100)',
            function(assert) {
        var done = assert.async();
        var payload = '<foreignObject width="1" height="1"><img xmlns="http://www.w3.org/1999/xhtml" src="data:invalid" onerror="window.svgImportExecuted = true"/></foreignObject>';
        window.svgImportExecuted = false;
        try {
            // Invalid data-paper-data throws during import:
            paper.project.importSVG('<svg xmlns="http://www.w3.org/2000/svg" data-paper-data="invalid JSON">' + payload + '</svg>');
        } catch (e) {
        }
        paper.project.importSVG('<svg xmlns="http://www.w3.org/2000/svg">' + payload + '</svg>');
        setTimeout(function() {
            equals(function() { return window.svgImportExecuted; }, false);
            done();
        }, 100);
    });
}

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
        'gradients-2': {},
        'gradients-3': {},
        'gradients-4': {},
        'rectangles': {}
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

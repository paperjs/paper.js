/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2016, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

// Until window.history.pushState() works when running locally, we need to trick
// qunit into thinking that the feature is not present. This appears to work...
// TODO: Ideally we should fix this in QUnit instead.
delete window.history;
window.history = {};

QUnit.begin(function() {
    if (QUnit.urlParams.hidepassed) {
        document.getElementById('qunit-tests').className += ' hidepass';
    }
    resemble.outputSettings({
        errorColor: {
            red: 255,
            green: 51,
            blue: 0
        },
        errorType: 'flat',
        transparency: 1
    });
});

var errorHandler = console.error;
console.error = function() {
    QUnit.pushFailure([].join.call(arguments, ' '), QUnit.config.current.stack);
    errorHandler.apply(this, arguments);
}

// Register a jsDump parser for Base.
QUnit.jsDump.setParser('Base', function (obj, stack) {
    // Just compare the string representation of classes inheriting from Base,
    // since they hide the internal values.
    return obj.toString();
});

// Override the default object parser to handle Base objects.
// We need to keep a reference to the previous implementation.
var objectParser = QUnit.jsDump.parsers.object;

QUnit.jsDump.setParser('object', function (obj, stack) {
    return (obj instanceof Base
            ? QUnit.jsDump.parsers.Base
            : objectParser).call(this, obj, stack);
});

function compareProperties(actual, expected, properties, message, options) {
    for (var i = 0, l = properties.length; i < l; i++) {
        var key = properties[i];
        equals(actual[key], expected[key], message + '.' + key, options);
    }
}

function compareItem(actual, expected, message, options, properties) {

    function rasterize(item, group, resolution) {
        var raster = null;
        if (group) {
            group.addChild(item);
            raster = group.rasterize(resolution, false);
            item.remove();
        }
        return raster;
    }

    function getImageTag(raster) {
        return '<img width="' + raster.width + '" height="' + raster.height
                + '" src="' + raster.source + '">'
    }

    if (options && options.rasterize) {
        // In order to properly compare pixel by pixel, we need to put each item
        // into a group with a white background of the united dimensions of the
        // bounds of both items before rasterizing.
        var resolution = options.rasterize == true ? 72 : options.rasterize,
            actualBounds = actual.strokeBounds,
            expecedBounds = expected.strokeBounds,
            bounds = actualBounds.isEmpty()
                    ? expecedBounds
                    : expecedBounds.isEmpty()
                    ? actualBounds
                    : actualBounds.unite(expecedBounds);
        if (bounds.isEmpty()) {
            QUnit.push(true, 'empty', 'empty', message);
            return;
        }
        var group = actual && expected && new Group({
                insert: false,
                children: [
                    new Shape.Rectangle({
                        rectangle: bounds,
                        fillColor: 'white'
                    })
                ]
            }),
            actual = rasterize(actual, group, resolution),
            expected = rasterize(expected, group, resolution);
        if (!actual || !expected) {
            QUnit.pushFailure('Unable to compare rasterized items: ' +
                    (!actual ? 'actual' : 'expected') + ' item is null',
                    QUnit.stack(2));
        } else {
            // Use resemble.js to compare the two rasterized items.
            var id = QUnit.config.current.testId,
                index = QUnit.config.current.assertions.length + 1,
                result;
            resemble(actual.getImageData())
                .compareTo(expected.getImageData())
                // When working with imageData, this call is synchronous:
                .onComplete(function(data) { result = data; });
            var identical = result ? 100 - result.misMatchPercentage : 0,
                ok = identical == 100,
                text = identical.toFixed(2) + '% identical'
            QUnit.push(ok, text, '100.00% identical', message);
            if (!ok && result) {
                // Get the right entry for this unit test and assertion, and
                // replace the results with images
                var entry = document.getElementById('qunit-test-output-' + id)
                        .querySelector('li:nth-child(' + (index) + ')'),
                    bounds = result.diffBounds;
                entry.querySelector('.test-expected td').innerHTML =
                        getImageTag(expected);
                entry.querySelector('.test-actual td').innerHTML =
                        getImageTag(actual);
                entry.querySelector('.test-diff td').innerHTML = '<pre>' + text
                        + '</pre><br>'
                        + '<img src="' + result.getImageDataUrl() + '">';
            }
        }
    } else {
        if (options && options.cloned)
            QUnit.notStrictEqual(actual.id, expected.id,
                    'not ' + message + '.id');
        QUnit.strictEqual(actual.constructor, expected.constructor,
                message + '.constructor');
        // When item is cloned and has a name, the name will be versioned:
        equals(actual.name,
                options && options.cloned && expected.name
                    ? expected.name + ' 1' : expected.name,
                message + '.name');
        compareProperties(actual, expected, ['children', 'bounds', 'position',
                'matrix', 'data', 'opacity', 'locked', 'visible', 'blendMode',
                'selected', 'fullySelected', 'clipMask', 'guide'],
                message, options);
        if (properties)
            compareProperties(actual, expected, properties, message, options);
        // Style
        compareProperties(actual.style, expected.style, ['fillColor',
                'strokeColor', 'strokeCap', 'strokeJoin', 'dashArray',
                'dashOffset', 'miterLimit', 'fontSize', 'font', 'leading',
                'justification'], message + '.style', options);
    }
}

// A list of comparator functions, based on `expected` type. See equals() for
// an explanation of how the type is determined.
var comparators = {
    Null: QUnit.strictEqual,
    Undefined: QUnit.strictEqual,
    Boolean: QUnit.strictEqual,

    Object: function(actual, expected, message, options) {
        QUnit.push(Base.equals(actual, expected), actual, expected, message);
    },

    Element: function(actual, expected, message, options) {
        // Convention: Loop through the attribute lists of both actual and
        // expected element, and compare values even if they may be inherited.
        // This is to handle styling values on SVGElements more flexibly.
        equals(actual && actual.tagName, expected.tagName,
                (message || '') + '.tagName', options);
        for (var i = 0; i < expected.attributes.length; i++) {
            var attr = expected.attributes[i];
            if (attr.specified) {
                equals(actual && actual.getAttribute(attr.name), attr.value,
                        (message || '') + '.' + attr.name, options);
            }
        }
        for (var i = 0; i < actual && actual.attributes.length; i++) {
            var attr = actual.attributes[i];
            if (attr.specified) {
                equals(attr.value, expected.getAttribute(attr.name)
                        (message || '') + '.' + attr.name, options);
            }
        }
    },

    Base: function(actual, expected, message, options) {
        comparators.Object(actual, expected, message, options);
    },

    Number: function(actual, expected, message, options) {
        // Compare with a default tolerance of 1e-5:
        var ok = Math.abs(actual - expected)
                <= Base.pick(options && options.tolerance, 1e-5);
        QUnit.push(ok, ok ? expected : actual, expected, message);
    },

    Array: function(actual, expected, message, options) {
        QUnit.strictEqual(actual.length, expected.length, message + '.length');
        for (var i = 0, l = actual.length; i < l; i++) {
            equals(actual[i], expected[i], (message || '') + '[' + i + ']',
                options);
        }
    },

    Point: function(actual, expected, message, options) {
        comparators.Number(actual.x, expected.x, message + '.x', options);
        comparators.Number(actual.y, expected.y, message + '.y', options);
    },

    Size: function(actual, expected, message, options) {
        comparators.Number(actual.width, expected.width, message + '.width',
                options);
        comparators.Number(actual.height, expected.height, message + '.height',
                options);
    },

    Rectangle: function(actual, expected, message, options) {
        comparators.Point(actual, expected, message, options);
        comparators.Size(actual, expected, message, options);
    },

    Matrix: function(actual, expected, message, options) {
        comparators.Array(actual.values, expected.values, message, options);
    },

    Color: function(actual, expected, message, options) {
        if (actual && expected) {
            equals(actual.type, expected.type, message + '.type', options);
            // NOTE: This also compares gradients, with identity checks and all.
            equals(actual.components, expected.components,
                    message + '.components', options);
        } else {
            QUnit.strictEqual(actual, expected, message);
        }
    },

    Symbol: function(actual, expected, message, options) {
        equals(actual.definition, expected.definition, message + '.definition',
                options);
    },

    Segment: function(actual, expected, message, options) {
        compareProperties(actual, expected, ['handleIn', 'handleOut', 'point',
                'selected'], message, options);
    },

    SegmentPoint: function(actual, expected, message, options) {
        comparators.Point(actual, expected, message, options);
        comparators.Boolean(actual.selected, expected.selected,
                message + '.selected', options);
    },

    Item: compareItem,

    Group: function(actual, expected, message, options) {
        compareItem(actual, expected, message, options, ['clipped']);
    },

    Layer: function(actual, expected, message, options) {
        compareItem(actual, expected, message, options);
        var sameProject = actual.project === expected.project;
        var sharedProject = !(options && options.dontShareProject);
        QUnit.push(sharedProject ? sameProject : !sameProject,
                actual.project,
                sharedProject ? expected.project : 'not ' + expected.project,
                message + '.project');
    },

    Path: function(actual, expected, message, options) {
        compareItem(actual, expected, message, options,
                ['segments', 'closed', 'clockwise', 'length']);
    },

    CompoundPath: function(actual, expected, message, options) {
        compareItem(actual, expected, message, options);
    },

    Raster: function(actual, expected, message, options) {
        compareItem(actual, expected, message, options,
                ['size', 'width', 'height', 'ppi', 'source', 'image']);
        equals(actual.toDataURL(), expected.toDataURL(),
                message + '.toDataUrl()');
    },

    Shape: function(actual, expected, message, options) {
        compareItem(actual, expected, message, options,
                ['shape', 'size', 'radius']);
    },

    PlacedSymbol: function(actual, expected, message, options) {
        compareItem(actual, expected, message,
                // Cloning PlacedSymbols does not result in cloned Symbols
                options && options.cloned
                        ? new Base(options, { cloned: false })
                        : options,
                ['symbol']);
    },

    PointText: function(actual, expected, message, options) {
        compareItem(actual, expected, message, options,
                ['content', 'point']);
    },

    Project: function(actual, expected, message, options) {
        compareProperties(actual, expected, ['symbols', 'layers'],
                message, options);
    }
};

// A list of classes that should be identical after their owners were cloned.
var identicalAfterCloning = {
    Gradient: true,
    Symbol: true
};

function getFunctionMessage(func) {
    var message = func.toString().match(
        /^\s*function[^\{]*\{([\s\S]*)\}\s*$/)[1]
            .replace(/    /g, '')
            .replace(/^\s+|\s+$/g, '');
    if (/^return /.test(message)) {
        message = message
            .replace(/^return /, '')
            .replace(/;$/, '');
    }
    return message;
}

// Override equals to convert functions to message and execute them as tests()
function equals(actual, expected, message, options) {
    // Allow the use of functions for actual, which will get called and their
    // source content extracted for readable reports.
    if (typeof actual === 'function') {
        if (!message)
            message = getFunctionMessage(actual);
        actual = actual();
    }
    // Get the comparator based on the expected value's type only and ignore the
    // actual value's type.
    var type = typeof expected,
        cls;
    type = expected === null && 'Null'
            || type === 'number' && 'Number'
            || type === 'boolean' && 'Boolean'
            || type === 'undefined' && 'Undefined'
            || Array.isArray(expected) && 'Array'
            || expected instanceof Element && 'Element' // handle DOM Elements
            || (cls = expected && expected._class) // check _class 2nd last
            || type === 'object' && 'Object'; // Object as catch-all
    var comparator = type && comparators[type];
    if (!message)
        message = type ? type.toLowerCase() : 'value';
    if (comparator) {
        comparator(actual, expected, message, options);
    } else if (expected && expected.equals) {
        // Fall back to equals
        QUnit.push(expected.equals(actual), actual, expected, message);
    } else {
        // Finally perform a strict compare
        QUnit.push(actual === expected, actual, expected, message);
    }
    if (options && options.cloned && cls) {
        var identical = identicalAfterCloning[cls];
        QUnit.push(identical ? actual === expected : actual !== expected,
                actual, identical ? expected : 'not ' + expected,
                message + ': identical after cloning');
    }
}

function test(testName, expected) {
    return QUnit.test(testName, function() {
        var project = new Project();
        expected();
        project.remove();
    });
}

function asyncTest(testName, expected) {
    return QUnit.asyncTest(testName, function() {
        var project = new Project();
        expected(function() {
            project.remove();
            QUnit.start();
        });
    });
}

// SVG

function createSVG(str, attrs) {
    if (attrs) {
        // Similar to SVGExport's createElement / setAttributes.
        var node = document.createElementNS('http://www.w3.org/2000/svg', str);
        for (var key in attrs)
            node.setAttribute(key, attrs[key]);
        return node;
    } else {
        return new DOMParser().parseFromString(
            '<svg xmlns="http://www.w3.org/2000/svg">' + str + '</svg>',
            'text/xml');
    }
}

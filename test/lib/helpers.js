/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2014, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

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

var comparators = {
    Null: QUnit.strictEqual,
    Undefined: QUnit.strictEqual,
    Boolean: QUnit.strictEqual,

    Object: function(actual, expected, message, options) {
        QUnit.push(Base.equals(actual, expected), actual, expected, message);
    },

    Base: function(actual, expected, message, options) {
        comparators.Object(actual, expected, message, options);
    },

    Number: function(actual, expected, message, options) {
        // Compare with a default tolerance of Numerical.TOLERANCE:
        var ok = Math.abs(actual - expected)
                <= Base.pick(options && options.tolerance, Numerical.TOLERANCE);
        QUnit.push(ok, ok ? expected : actual, expected, message);
    },

    Array: function(actual, expected, message, options) {
        QUnit.strictEqual(actual.length, expected.length,
            (message || '') + ' length');
        for (var i = 0, l = actual.length; i < l; i++) {
            equals(actual[i], expected[i], (message || '') + ' [' + i + ']',
                options);
        }
    },

    Point: function(actual, expected, message, options) {
        comparators.Number(actual.x, expected.x, (message || '') + ' x',
            options);
        comparators.Number(actual.y, expected.y, (message || '') + ' y',
            options);
    },

    Size: function(actual, expected, message, options) {
        comparators.Number(actual.width, expected.width,
                (message || '') + ' width', options);
        comparators.Number(actual.height, expected.height,
                (message || '') + ' height', options);
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
            equals(actual.type, expected.type,
                    (message || '') + ' type', options);
            // NOTE: This also compares gradients, with identity checks and all.
            equals(actual.components, expected.components,
                    (message || '') + ' components', options);
        } else {
            equals(actual, expected, message, options);
        }
    },

    Segment: function(actual, expected, message, options) {
        Base.each(['handleIn', 'handleOut', 'point', 'selected'],
            function(key) {
                equals(actual[key], expected[key], (message || '') + ' ' + key);
            }
        );
    },

    SegmentPoint: function(actual, expected, message, options) {
        comparators.Point(actual, expected, message, options);
        comparators.Boolean(actual.selected, expected.selected,
                (message || '') + ' selected', options);
    }
};

var identicalAfterClone = {
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
            || (cls = expected && expected._class)
            || type === 'object' && 'Object';
    var comparator = type && comparators[type];
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
        var identical = identicalAfterClone[cls];
        QUnit.push(identical ? actual === expected : actual !== expected,
                actual, identical ? expected : 'not ' + expected,
                (message || '') + ' identity');
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
            start();
        });
    });
}

function compareItems(item, item2, options) {
    if (options && options.cloned)
        QUnit.notStrictEqual(item.id, item2.id, 'Compare Item#id');

    QUnit.strictEqual(item.constructor, item2.constructor,
            'Compare Item#constructor');
    // When item was cloned and had a name, the name will be versioned
    equals(options && options.cloned && item.name ? item.name + ' 1'
            : item.name, item2.name, 'Compare Item#name');
    Base.each(['bounds', 'position', 'data', 'matrix', 'opacity', 'locked',
            'visible', 'blendMode', 'selected', 'fullySelected', 'clipMask',
            'guide'],
        function(key) {
            equals(item[key], item2[key],  'Compare Item#' + key, options);
        }
    );

    // Style
    Base.each(['fillColor', 'strokeColor', 'strokeCap', 'strokeJoin',
            'dashArray', 'dashOffset', 'miterLimit',
            'fontSize', 'font', 'leading', 'justification'],
        function(key) {
            equals(item.style[key], item2.style[key], 'Compare Style#' + key,
                options);
        }
    );

    // Path specific
    if (item instanceof Path) {
        Base.each(['segments', 'closed', 'clockwise', 'length'],
            function(key) {
                equals(item[key], item2[key], 'Compare Path#' + key, options);
            }
        );
    }

    // Shape specific
    if (item instanceof Shape) {
        Base.each(['shape', 'size', 'radius'],
            function(key) {
                equals(item[key], item2[key], 'Compare Shape#' + key, options);
            }
        );
    }

    // Group specific
    if (item instanceof Group) {
        equals(item.clipped, item2.clipped, 'Compare Group#clipped', options);
    }

    // Layer specific
    if (item instanceof Layer) {
        equals(function() {
            return options && options.dontShareProject
                    ? item.project != item2.project
                    : item.project == item2.project;
        }, true);
    }

    // PlacedSymbol specific
    if (item instanceof PlacedSymbol) {
        if (options.dontShareProject) {
            compareItems(item.symbol.definition, item2.symbol.definition,
                    options,
                    'Compare Symbol#definition');
        } else {
            equals(item.symbol, item2.symbol, 'Compare PlacedSymbol#symbol',
                options);
        }
    }

    // Raster specific
    if (item instanceof Raster) {
        equals(item.size, item2.size, 'Compare Raster#size');
        equals(item.width, item2.width, 'Compare Raster#width');
        equals(item.height, item2.height, 'Compare Raster#height');
        equals(item.ppi, item2.ppi, 'Compare Raster#ppi');
        equals(item.source, item2.source, 'Compare Raster#source');
        equals(item.image, item2.image, 'Compare Raster#image');
        equals(item.toDataURL(), item2.toDataURL(),
                'Compare Raster#toDataUrl()');
    }

    // TextItem specific:
    if (item instanceof TextItem) {
        equals(item.content, item2.content, 'Compare Item#content');
    }

    // PointText specific:
    if (item instanceof PointText) {
        equals(item.point, item2.point, 'Compare Item#point');
    }

    // Check length of children and recursively compare them:
    if (item.children) {
        equals(function() {
            return item.children.length == item2.children.length;
        }, true);
        for (var i = 0, l = item.children.length; i < l; i++) {
            compareItems(item.children[i], item2.children[i], options);
        }
    }
}

function compareProjects(project, project2) {
    // Compare Project#symbols:
    equals(function() {
        return project.symbols.length == project2.symbols.length;
    }, true);
    for (var i = 0, l = project.symbols.length; i < l; i++) {
        var definition1 = project.symbols[i].definition;
        var definition2 = project2.symbols[i].definition;
        compareItems(definition1, definition2, { dontShareProject: true },
                'Compare Symbol#definition');
    }

    // Compare Project#layers:
    equals(function() {
        return project.layers.length == project2.layers.length;
    }, true);
    for (var i = 0, l = project.layers.length; i < l; i++) {
        compareItems(project.layers[i], project2.layers[i],
                { dontShareProject: true });
    }
}

// SVG

function createSVG(xml) {
    return new DOMParser().parseFromString(
        '<svg xmlns="http://www.w3.org/2000/svg">' + xml + '</svg>',
        'text/xml');
}

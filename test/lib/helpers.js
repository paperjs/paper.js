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

function compareProperties(actual, expected, properties, message, options) {
    Base.each(properties, function(key) {
        equals(actual[key], expected[key], message + '.' + key, options);
    });
}

function compareItem(actual, expected, message, options, properties) {
    if (options && options.cloned)
        QUnit.notStrictEqual(actual.id, 'not ' + expected.id, message + '.id');
    QUnit.strictEqual(actual.constructor, expected.constructor,
            message + '.constructor');
    // When item was cloned and had a name, the name will be versioned
    equals(options && options.cloned && actual.name ? actual.name + ' 1'
            : actual.name, expected.name,
            message + '.name');
    compareProperties(actual, expected, ['children', 'bounds', 'position',
            'matrix', 'data', 'opacity', 'locked', 'visible', 'blendMode',
            'selected', 'fullySelected', 'clipMask', 'guide'],
            message, options);
    if (properties)
        compareProperties(actual, expected, properties, message, options);
    // Style
    compareProperties(actual.style, expected.style, ['fillColor', 'strokeColor',
            'strokeCap', 'strokeJoin', 'dashArray', 'dashOffset', 'miterLimit',
            'fontSize', 'font', 'leading', 'justification'],
            message + '.style', options);
}

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
        Base.each(['handleIn', 'handleOut', 'point', 'selected'],
            function(key) {
                equals(actual[key], expected[key], message + '.' + key);
            }
        );
    },

    SegmentPoint: function(actual, expected, message, options) {
        comparators.Point(actual, expected, message, options);
        comparators.Boolean(actual.selected, expected.selected,
                message + '.selected', options);
    },

    Item: compareItem,

    Group: function(actual, expected, message, options) {
        compareItem(actual, expected, message, options,
                ['clipped']);
    },

    Layer: function(actual, expected, message, options) {
        compareItem(actual, expected, message, options);
        equals(function() {
            return options && options.dontShareProject
                    ? actual.project !== expected.project
                    : actual.project === expected.project;
        }, true);
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

var strictIdenticalAfterCloning = {
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
    if (!message) {
        message = type
                ? type.charAt(0).toLowerCase() + type.substring(1)
                : 'value';
    }
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
        var identical = strictIdenticalAfterCloning[cls];
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
            start();
        });
    });
}

// SVG

function createSVG(xml) {
    return new DOMParser().parseFromString(
        '<svg xmlns="http://www.w3.org/2000/svg">' + xml + '</svg>',
        'text/xml');
}

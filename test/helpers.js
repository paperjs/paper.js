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

// We call our variable `isNodeContext` because resemble.js exposes a global
// `isNode` function which would override it and break node check.
var isNodeContext = typeof global === 'object',
    isPhantomContext = typeof window === 'object' && !!window.callPhantom,
    scope;

if (isNodeContext) {
    scope = global;
    // Resemble.js needs the Image constructor global.
    global.Image = paper.window.Image;
} else {
    scope = window;
    // This is only required when running in the browser:
    // Until window.history.pushState() works when running locally, we need to
    // trick qunit into thinking that the feature is not present. This appears
    // to work...
    // TODO: Ideally we should fix this in QUnit instead.
    delete window.history;
    window.history = {};
    QUnit.begin(function() {
        if (QUnit.urlParams.hidepassed) {
            document.getElementById('qunit-tests').className += ' hidepass';
        }
    });
}

// Some native javascript classes have name collisions with Paper.js classes.
// If they have not already been stored in `src/load.js`, do it now:
var nativeClasses = this.nativeClasses || {
    Event: this.Event || {},
    MouseEvent: this.MouseEvent || {}
};

// The unit-tests expect the paper classes to be global.
paper.install(scope);

// Override console.error, so that we can catch errors that are only logged to
// the console.
var errorHandler = console.error;
console.error = function() {
    var current = QUnit.config.current;
    if (current) {
        QUnit.pushFailure([].join.call(arguments, ' '), current.stack);
    }
    errorHandler.apply(this, arguments);
};

var currentProject;

QUnit.done(function(details) {
    console.error = errorHandler;
    // Clear all event listeners after final test.
    if (currentProject) {
        currentProject.remove();
    }
});

// NOTE: In order to "export" all methods into the shared Prepro.js scope when
// using node-qunit, we need to define global functions as:
// `var name = function() {}`. `function name() {}` does not work!
var test = function(testName, expected) {
    return QUnit.test(testName, function(assert) {
        // Since tests can be asynchronous, remove the old project before
        // running the next test.
        if (currentProject) {
            currentProject.remove();
            // This is needed for interactions tests, to make sure that test is
            // run with a fresh state.
            View._resetState();
        }

        // Instantiate project with 100x100 pixels canvas instead of default
        // 1x1 to make interactions tests simpler by working with integers.
        currentProject = new Project(new Size(100, 100));
        expected(assert);
    });
};

// Override equals to convert functions to message and execute them as tests()
var equals = function(actual, expected, message, options) {
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
            || expected instanceof window.Element && 'Element' // DOM Elements
            || (cls = expected && expected._class) // check _class 2nd last
            || type === 'object' && 'Object'; // Object as catch-all
    var comparator = type && comparators[type];
    if (!message) {
        message = type ? type.toLowerCase() : 'value';
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
        var identical = identicalAfterCloning[cls];
        QUnit.push(identical ? actual === expected : actual !== expected,
                actual, identical ? expected : 'not ' + expected,
                message + ': identical after cloning');
    }
};

// A list of classes that should be identical after their owners were cloned.
var identicalAfterCloning = {
    Gradient: true,
    SymbolDefinition: true
};

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

var compareProperties = function(actual, expected, properties, message, options) {
    for (var i = 0, l = properties.length; i < l; i++) {
        var key = properties[i];
        equals(actual[key], expected[key],
                message + ' (#' + key + ')', options);
    }
};

/**
 * Compare 2 image data with resemble.js library.
 * When comparison fails, expected, actual and compared images are displayed.
 * @param {ImageData} imageData1 the expected image data
 * @param {ImageData} imageData2 the actual image data
 * @param {number} tolerance
 * @param {string} message
 * @param {string} description text displayed when comparison fails
 */
var compareImageData = function(imageData1, imageData2, tolerance, message, description) {
    /**
     * Build an image element from a given image data.
     * @param {ImageData} imageData
     * @return {HTMLImageElement}
     */
    function image(imageData) {
        var canvas = document.createElement('canvas');
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        canvas.getContext('2d').putImageData(imageData, 0, 0);
        var image = new Image();
        image.src = canvas.toDataURL();
        canvas.remove();
        return image;
    }

    tolerance = (tolerance || 1e-4) * 100;

    var id = QUnit.config.current.testId,
        index = QUnit.config.current.assertions.length + 1,
        result;
    // Compare image-data using resemble.js:
    resemble.compare(
        imageData1,
        imageData2,
        {
            output: {
                errorColor: { red: 255, green: 51, blue: 0 },
                errorType: 'flat',
                transparency: 1
            },
            ignore: ['antialiasing']
        },
        // When working with imageData, this call is synchronous:
        function (error, data) {
            if (error) {
                console.error(error);
            } else {
                result = data;
            }
        }
    )
    // Compare with tolerance in percentage...
    var fixed = tolerance < 1 ? ((1 / tolerance) + '').length - 1 : 0,
        identical = result ? 100 - result.misMatchPercentage : 0,
        ok = Math.abs(100 - identical) <= tolerance,
        text = identical.toFixed(fixed) + '% identical';
    QUnit.push(ok, text, (100).toFixed(fixed) + '% identical', message);
    if (!ok && result && !isNodeContext) {
        // Get the right entry for this unit test and assertion, and
        // replace the results with images
        var entry = document.getElementById('qunit-test-output-' + id)
            .querySelector('li:nth-child(' + (index) + ')'),
            bounds = result.diffBounds;
        entry.querySelector('.test-expected td').appendChild(image(imageData2));
        entry.querySelector('.test-actual td').appendChild(image(imageData1));
        entry.querySelector('.test-diff td').innerHTML = '<pre>'
            + text + (description || '')
            + '</pre><br>'
            + '<img src="' + result.getImageDataUrl() + '">';
    }
};

var comparePixels = function(actual, expected, message, options) {
    function rasterize(item, group, resolution) {
        var raster = null;
        if (group) {
            var parent = item.parent,
                index = item.index;
            group.addChild(item);
            raster = group.rasterize(resolution, false);
            if (parent) {
                parent.insertChild(index, item);
            } else {
                item.remove();
            }
        }
        return raster;
    }

    if (!expected) {
        return QUnit.strictEqual(actual, expected, message, options);
    } else if (!actual) {
        // In order to compare pixels, just create an empty item that can be
        // rasterized to an empty raster.
        actual = new Group();
    }

    options = options || {};
    // In order to properly compare pixel by pixel, we need to put each item
    // into a group with a white background of the united dimensions of the
    // bounds of both items before rasterizing.
    var resolution = options.resolution || 72,
        actualBounds = actual.strokeBounds,
        expectedBounds = expected.strokeBounds,
        bounds = actualBounds.isEmpty()
            ? expectedBounds
            : expectedBounds.isEmpty()
                ? actualBounds
                : actualBounds.unite(expectedBounds);
    if (bounds.isEmpty()) {
        QUnit.equal('empty', 'empty', message);
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
        actualRaster = rasterize(actual, group, resolution),
        expectedRaster = rasterize(expected, group, resolution);
    if (!actualRaster || !expectedRaster) {
        QUnit.push(false, null, null, 'Unable to compare rasterized items: ' +
            (!actualRaster ? 'actual' : 'expected') + ' item is null',
            QUnit.stack(2));
    } else {
        // Compare the two rasterized items.
        var description = actual instanceof PathItem && expected instanceof PathItem
            ? '\nExpected:\n' + expected.pathData +
                '\nActual:\n' + actual.pathData
            : '';
        compareImageData(
            actualRaster.getImageData(),
            expectedRaster.getImageData(),
            options.tolerance,
            message,
            description
        );
    }
};

var compareItem = function(actual, expected, message, options, properties) {
    options = options || {};
    if (options.rasterize) {
        comparePixels(actual, expected, message, options);
    } else if (!actual || !expected) {
        QUnit.strictEqual(actual, expected, message);
    } else {
        if (options.cloned)
            QUnit.notStrictEqual(actual.id, expected.id,
                    message + ' (not #id)');
        QUnit.strictEqual(actual.constructor, expected.constructor,
                message + ' (#constructor)');
        // When item is cloned and has a name, the name will be versioned:
        equals(actual.name,
                options.cloned && expected.name
                    ? expected.name + ' 1' : expected.name,
                message + ' (#name)');
        compareProperties(actual, expected, ['children', 'bounds', 'position',
                'matrix', 'data', 'opacity', 'locked', 'visible', 'blendMode',
                'selected', 'fullySelected', 'clipMask', 'guide'],
                message, options);
        if (properties)
            compareProperties(actual, expected, properties, message, options);
        // Style
        var styles = ['fillColor',
                'strokeColor', 'strokeCap', 'strokeJoin', 'dashArray',
                'dashOffset', 'miterLimit'];
        if (expected instanceof TextItem)
            styles.push('fontSize', 'font', 'leading', 'justification');
        compareProperties(actual.style, expected.style, styles,
                message + ' (#style)', options);
    }
};

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
        // This is to handle styling values on SVGElement items more flexibly.
        equals(actual && actual.tagName, expected.tagName,
                (message || '') + ' (#tagName)', options);
        for (var i = 0; i < expected.attributes.length; i++) {
            var attr = expected.attributes[i];
            if (attr.specified) {
                equals(actual && actual.getAttribute(attr.name), attr.value,
                        (message || '') + ' (#' + attr.name + ')', options);
            }
        }
        for (var i = 0; i < actual && actual.attributes.length; i++) {
            var attr = actual.attributes[i];
            if (attr.specified) {
                equals(attr.value, expected.getAttribute(attr.name)
                        (message || '') + ' #(' + attr.name + ')', options);
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
        QUnit.strictEqual(actual.length, expected.length, message
                + ' (#length)');
        for (var i = 0, l = actual.length; i < l; i++) {
            equals(actual[i], expected[i], (message || '') + '[' + i + ']',
                options);
        }
    },

    Point: function(actual, expected, message, options) {
        comparators.Number(actual.x, expected.x, message + ' (#x)', options);
        comparators.Number(actual.y, expected.y, message + ' (#y)', options);
    },

    Size: function(actual, expected, message, options) {
        comparators.Number(actual.width, expected.width,
                message + ' (#width)', options);
        comparators.Number(actual.height, expected.height,
                message + ' (#height)', options);
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
            equals(actual.type, expected.type, message + ' (#type)', options);
            // NOTE: This also compares gradients, with identity checks and all.
            equals(actual.components, expected.components,
                    message + ' (#components)', options);
        } else {
            QUnit.push(expected.equals(actual), actual, expected, message);
        }
    },

    Segment: function(actual, expected, message, options) {
        compareProperties(actual, expected, ['handleIn', 'handleOut', 'point',
                'selected'], message, options);
    },

    SegmentPoint: function(actual, expected, message, options) {
        comparators.Point(actual, expected, message, options);
        comparators.Boolean(actual.selected, expected.selected,
                message + ' (#selected)', options);
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
                message + ' (#project)');
    },

    Path: function(actual, expected, message, options) {
        compareItem(actual, expected, message, options,
                ['segments', 'closed', 'clockwise']);
    },

    CompoundPath: function(actual, expected, message, options) {
        compareItem(actual, expected, message, options);
    },

    Raster: function(actual, expected, message, options) {
        var pixels = options && options.pixels,
            properties = ['size', 'width', 'height', 'resolution'];
        if (!pixels)
            properties.push('source', 'image');
        compareItem(actual, expected, message, options, properties);
        if (pixels) {
            comparePixels(actual, expected, message, options);
        } else {
            equals(actual.toDataURL(), expected.toDataURL(),
                    message + ' (#toDataUrl())');
        }
    },

    Shape: function(actual, expected, message, options) {
        compareItem(actual, expected, message, options,
                ['shape', 'size', 'radius']);
    },

    PointText: function(actual, expected, message, options) {
        compareItem(actual, expected, message, options,
                ['content', 'point']);
    },

    SymbolItem: function(actual, expected, message, options) {
        compareItem(actual, expected, message,
                // Cloning SymbolItems does not result in cloned
                // SymbolDefinitions
                options && options.cloned
                        ? Base.set({}, options, { cloned: false })
                        : options,
                ['symbol']);
    },

    SymbolDefinition: function(actual, expected, message, options) {
        equals(actual.definition, expected.definition,
                message + ' (#definition)', options);
    },

    Project: function(actual, expected, message, options) {
        compareProperties(actual, expected, ['layers'], message, options);
    }
};

// Some other helpers:

var getFunctionMessage = function(func) {
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
};

var compareBoolean = function(actual, expected, message, options) {
    expected = typeof expected === 'string'
            ? PathItem.create(expected)
            : expected;
    if (typeof actual === 'function') {
        if (!message)
            message = getFunctionMessage(actual);
        actual = actual();
    }
    var parent,
        index,
        style = {
            strokeColor: 'black',
            fillColor: expected && (expected.closed
                || expected.firstChild && expected.firstChild.closed && 'yellow')
                || null
        };
    if (actual) {
        parent = actual.parent;
        index = actual.index;
        // Remove it from parent already now, in case we're comparing children
        // of compound-paths, so we can apply styling to them.
        if (parent && parent instanceof CompoundPath) {
            actual.remove();
        } else {
            parent = null;
        }
        actual.style = style;
    }
    if (expected) {
        expected.style = style;
    }
    equals(actual, expected, message, Base.set({ rasterize: true }, options));
    if (parent) {
        // Insert it back.
        parent.insertChild(index, actual);
    }
};

var createSVG = function(str, attrs) {
    // Similar to SvgElement.create():
    var node = document.createElementNS('http://www.w3.org/2000/svg', str);
    for (var key in attrs)
        node.setAttribute(key, attrs[key]);
    // Paper.js paths do not have a fill by default, SVG does.
    node.setAttribute('fill', 'none');
    return node;
};

var compareSVG = function(done, actual, expected, message, options) {
    function getItem(item) {
        return item instanceof Item
            ? item
            : typeof item === 'string'
            ? new Raster({
                source: 'data:image/svg+xml;base64,' + window.btoa(item),
                insert: false
            })
            : null;
    }

    actual = getItem(actual);
    expected = getItem(expected);
    actual.position = expected.position;

    if (typeof actual === 'function') {
        if (!message)
            message = getFunctionMessage(actual);
        actual = actual();
    }

    function compare() {
        comparePixels(actual, expected, message, Base.set({
            tolerance: 1e-3,
            resolution: 72
        }, options));
        done();
    }

    if (expected instanceof Raster) {
        expected.onLoad = compare;
    } else if (actual instanceof Raster) {
        actual.onLoad = compare;
    } else {
        compare();
    }
};


//
// Interactions helpers
//
var MouseEventPolyfill = function(type, params) {
    var mouseEvent = document.createEvent('MouseEvent');
    mouseEvent.initMouseEvent(
        type,
        params.bubbles,
        params.cancelable,
        window,
        0,
        params.screenX,
        params.screenY,
        params.clientX,
        params.clientY,
        params.ctrlKey,
        params.altKey,
        params.shiftKey,
        params.metaKey,
        params.button,
        params.relatedTarget
    );
    return mouseEvent;
};

MouseEventPolyfill.prototype = nativeClasses.Event.prototype;

var triggerMouseEvent = function(type, point, target) {
    // Depending on event type, events have to be triggered on different
    // elements due to the event handling implementation (see `viewEvents`
    // and `docEvents` in View.js). And we cannot rely on the fact that event
    // will bubble from canvas to document, since the canvas used in tests is
    // not inserted in DOM.
    target = target || (type === 'mousedown' ? view.element : document);
    // If `gulp load` was run, there is a name collision between paper Event /
    // MouseEvent and native javascript classes. In this case, we need to use
    // native classes stored in the nativeClasses object instead.
    // MouseEvent class does not exist in PhantomJS, so in that case, we need to
    // use a polyfill method, see: https://stackoverflow.com/questions/42929639
    var MouseEvent = typeof nativeClasses.MouseEvent === 'function'
        ? nativeClasses.MouseEvent
        : MouseEventPolyfill;
    var event = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: point.x,
        clientY: point.y,
        screenX: point.x,
        screenY: point.y
    });
    target.dispatchEvent(event);
};

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

/**
 * @name CompoundPath
 *
 * @class A compound path is a complex path that is made up of one or more
 * simple sub-paths. It can have the `nonzero` fill rule, or the `evenodd` rule
 * applied. Both rules use mathematical equations to determine if any region is
 * outside or inside the final shape. The `evenodd` rule is more predictable:
 * Every other region within a such a compound path is a hole, regardless of
 * path direction.
 *
 * All the paths in a compound path take on the style of the compound path and
 * can be accessed through its {@link Item#children} list.
 *
 * @extends PathItem
 */
var CompoundPath = PathItem.extend(/** @lends CompoundPath# */{
    _class: 'CompoundPath',
    _serializeFields: {
        children: []
    },

    /**
     * Creates a new compound path item and places it in the active layer.
     *
     * @param {Path[]} [paths] the paths to place within the compound path
     *
     * @example {@paperscript}
     * // Create a circle shaped path with a hole in it:
     * var circle = new Path.Circle({
     *     center: new Point(50, 50),
     *     radius: 30
     * });
     *
     * var innerCircle = new Path.Circle({
     *     center: new Point(50, 50),
     *     radius: 10
     * });
     *
     * var compoundPath = new CompoundPath([circle, innerCircle]);
     * compoundPath.fillColor = 'red';
     *
     * // Move the inner circle 5pt to the right:
     * compoundPath.children[1].position.x += 5;
     */
    /**
     * Creates a new compound path item from an object description and places it
     * at the top of the active layer.
     *
     * @name CompoundPath#initialize
     * @param {Object} object an object literal containing properties to
     * be set on the path
     * @return {CompoundPath} the newly created path
     *
     * @example {@paperscript}
     * var path = new CompoundPath({
     *     children: [
     *         new Path.Circle({
     *             center: new Point(50, 50),
     *             radius: 30
     *         }),
     *         new Path.Circle({
     *             center: new Point(50, 50),
     *             radius: 10
     *         })
     *     ],
     *     fillColor: 'black',
     *     selected: true
     * });
     */
    /**
     * Creates a new compound path item from SVG path-data and places it at the
     * top of the active layer.
     *
     * @name CompoundPath#initialize
     * @param {String} pathData the SVG path-data that describes the geometry
     * of this path
     * @return {CompoundPath} the newly created path
     *
     * @example {@paperscript}
     * var pathData = 'M20,50c0,-16.56854 13.43146,-30 30,-30c16.56854,0 30,13.43146 30,30c0,16.56854 -13.43146,30 -30,30c-16.56854,0 -30,-13.43146 -30,-30z M50,60c5.52285,0 10,-4.47715 10,-10c0,-5.52285 -4.47715,-10 -10,-10c-5.52285,0 -10,4.47715 -10,10c0,5.52285 4.47715,10 10,10z';
     * var path = new CompoundPath(pathData);
     * path.fillColor = 'black';
     */
    initialize: function CompoundPath(arg) {
        // CompoundPath has children and supports named children.
        this._children = [];
        this._namedChildren = {};
        if (!this._initialize(arg)) {
            if (typeof arg === 'string') {
                this.setPathData(arg);
            } else {
                this.addChildren(Array.isArray(arg) ? arg : arguments);
            }
        }
    },

    insertChildren: function insertChildren(index, items, _preserve) {
        // Convert CompoundPath items in the children list by adding their
        // children to the list, replacing their parent.
        for (var i = items.length - 1; i >= 0; i--) {
            var item = items[i];
            if (item instanceof CompoundPath) {
                // Clone the items array before modifying it, as it may be a
                // passed children array from another item.
                items = items.slice();
                items.splice.apply(items, [i, 1].concat(item.removeChildren()));
                item.remove();
            }
        }
        // Pass on 'path' for _type, to make sure that only paths are added as
        // children.
        items = insertChildren.base.call(this, index, items, _preserve, Path);
        // All children except for the bottom one (first one in list) are set
        // to anti-clockwise orientation, so that they appear as holes, but
        // only if their orientation was not already specified before
        // (= _clockwise is defined).
        for (var i = 0, l = !_preserve && items && items.length; i < l; i++) {
            var item = items[i];
            if (item._clockwise === undefined)
                item.setClockwise(item._index === 0);
        }
        return items;
    },

    // DOCS: reduce()
    // TEST: reduce()
    reduce: function reduce(options) {
        var children = this._children;
        for (var i = children.length - 1; i >= 0; i--) {
            var path = children[i].reduce(options);
            if (path.isEmpty())
                path.remove();
        }
        if (children.length === 0) { // Replace with a simple empty Path
            var path = new Path(Item.NO_INSERT);
            path.copyAttributes(this);
            path.insertAbove(this);
            this.remove();
            return path;
        }
        return reduce.base.call(this);
    },

    /**
     * Specifies whether the compound path is oriented clock-wise.
     *
     * @bean
     * @type Boolean
     */
    isClockwise: function() {
        var child = this.getFirstChild();
        return child && child.isClockwise();
    },

    setClockwise: function(clockwise) {
        if (this.isClockwise() ^ !!clockwise)
            this.reverse();
    },

    /**
     * The first Segment contained within the path.
     *
     * @bean
     * @type Segment
     */
    getFirstSegment: function() {
        var first = this.getFirstChild();
        return first && first.getFirstSegment();
    },

    /**
     * The last Segment contained within the path.
     *
     * @bean
     * @type Segment
     */
    getLastSegment: function() {
        var last = this.getLastChild();
        return last && last.getLastSegment();
    },

    /**
     * All the curves contained within the compound-path, from all its child
     * {@link Path} items.
     *
     * @bean
     * @type Curve[]
     */
    getCurves: function() {
        var children = this._children,
            curves = [];
        for (var i = 0, l = children.length; i < l; i++)
            curves.push.apply(curves, children[i].getCurves());
        return curves;
    },

    /**
     * The first Curve contained within the path.
     *
     * @bean
     * @type Curve
     */
    getFirstCurve: function() {
        var first = this.getFirstChild();
        return first && first.getFirstCurve();
    },

    /**
     * The last Curve contained within the path.
     *
     * @bean
     * @type Curve
     */
    getLastCurve: function() {
        var last = this.getLastChild();
        return last && last.getFirstCurve();
    },

    /**
     * The area that the path's geometry is covering. Self-intersecting paths
     * can contain sub-areas that cancel each other out.
     *
     * @bean
     * @type Number
     */
    getArea: function() {
        var children = this._children,
            area = 0;
        for (var i = 0, l = children.length; i < l; i++)
            area += children[i].getArea();
        return area;
    }
}, /** @lends CompoundPath# */{
    // Enforce bean creation for getPathData(), as it has hidden parameters.
    beans: true,

    getPathData: function(_matrix, _precision) {
        // NOTE: #setPathData() is defined in PathItem.
        var children = this._children,
            paths = [];
        for (var i = 0, l = children.length; i < l; i++) {
            var child = children[i],
                mx = child._matrix;
            paths.push(child.getPathData(_matrix && !mx.isIdentity()
                    ? _matrix.appended(mx) : _matrix, _precision));
        }
        return paths.join(' ');
    }
}, /** @lends CompoundPath# */{
    _hitTestChildren: function _hitTestChildren(point, options, viewMatrix) {
        return _hitTestChildren.base.call(this, point,
                // If we're not specifically asked to returns paths through
                // options.class == Path, do not test children for fill, since a
                // compound path forms one shape.
                // Also support legacy format `type: 'path'`.
                options.class === Path || options.type === 'path' ? options
                    : Base.set({}, options, { fill: false }),
                viewMatrix);
    },

    _draw: function(ctx, param, viewMatrix, strokeMatrix) {
        var children = this._children;
        // Return early if the compound path doesn't have any children:
        if (children.length === 0)
            return;

        param = param.extend({ dontStart: true, dontFinish: true });
        ctx.beginPath();
        for (var i = 0, l = children.length; i < l; i++)
            children[i].draw(ctx, param, strokeMatrix);

        if (!param.clip) {
            this._setStyles(ctx, param, viewMatrix);
            var style = this._style;
            if (style.hasFill()) {
                ctx.fill(style.getFillRule());
                ctx.shadowColor = 'rgba(0,0,0,0)';
            }
            if (style.hasStroke())
                ctx.stroke();
        }
    },

    _drawSelected: function(ctx, matrix, selectionItems) {
        var children = this._children;
        for (var i = 0, l = children.length; i < l; i++) {
            var child = children[i],
                mx = child._matrix;
            // Do not draw this child now if it's separately marked as selected,
            // as it would be drawn twice otherwise.
            if (!selectionItems[child._id]) {
                child._drawSelected(ctx, mx.isIdentity() ? matrix
                        : matrix.appended(mx));
            }
        }
    }
},
new function() { // Injection scope for PostScript-like drawing functions
    /**
     * Helper method that returns the current path and checks if a moveTo()
     * command is required first.
     */
    function getCurrentPath(that, check) {
        var children = that._children;
        if (check && children.length === 0)
            throw new Error('Use a moveTo() command first');
        return children[children.length - 1];
    }

    // Redirect all other drawing commands to the current path
    return Base.each(['lineTo', 'cubicCurveTo', 'quadraticCurveTo', 'curveTo',
            'arcTo', 'lineBy', 'cubicCurveBy', 'quadraticCurveBy', 'curveBy',
            'arcBy'],
        function(key) {
            this[key] = function() {
                var path = getCurrentPath(this, true);
                path[key].apply(path, arguments);
            };
        }, {
            // NOTE: Documentation for these methods is found in PathItem, as
            // they are considered abstract methods of PathItem and need to be
            // defined in all implementing classes.
            moveTo: function(/* point */) {
                var current = getCurrentPath(this),
                    // Reuse current path if nothing was added yet
                    path = current && current.isEmpty() ? current
                            : new Path(Item.NO_INSERT);
                if (path !== current)
                    this.addChild(path);
                path.moveTo.apply(path, arguments);
            },

            moveBy: function(/* point */) {
                var current = getCurrentPath(this, true),
                    last = current && current.getLastSegment(),
                    point = Point.read(arguments);
                this.moveTo(last ? point.add(last._point) : point);
            },

            closePath: function(join) {
                getCurrentPath(this, true).closePath(join);
            }
        }
    );
}, Base.each(['reverse', 'flatten', 'simplify', 'smooth'], function(key) {
    // Injection scope for methods forwarded to the child paths.
    // NOTE: Documentation is in PathItem
    this[key] = function(param) {
        var children = this._children,
            res;
        for (var i = 0, l = children.length; i < l; i++) {
            res = children[i][key](param) || res;
        }
        return res;
    };
}, {}));

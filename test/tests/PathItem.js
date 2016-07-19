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

QUnit.module('PathItem');

test('PathItem#create() with SVG path-data (#1101)', function() {
    var data = [
        'M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z',
        'M20 20l20 20v-20zm20 20l-20 20h20z',
        'M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z',
        'M11,18l0,-12l-8.5,6z M11.5,12l8.5,6l0,-12z',
        'M10,10 L20,20 L10,30 M30,10 L30,30',
        'M 0 1.5 l 1e1 0 m -10 2 l 1e+1 0 m -10 2 l 100e-1 0',
        'M372 130Q272 50 422 10zm70 0q50-150-80-90z'
    ];
    var expected = [
        [[[11,18],[11,6],[2.5,12],true], [[11.5,12],[20,18],[20,6],true]],
        [[[20,20],[40,40],[40,20],true], [[40,40],[20,60],[40,60],true]],
        [[[11,18],[11,6],[2.5,12],true],[[11.5,12],[20,18],[20,6],true]],
        [[[11,18],[11,6],[2.5,12],true],[[11.5,12],[20,18],[20,6],true]],
        [[[10,10],[20,20],[10,30]],[[30,10],[30,30]]],
        [[[0,1.5],[10,1.5]],[[0,3.5],[10,3.5]],[[0,5.5],[10,5.5]]],
        [[[372,130,0,0,-66.66667,-53.33333],[422,10,-100,26.66667,0,0],true],
            [[442,130,0,0,33.33333,-100],[362,40,86.66667,-40,0,0],true]]
    ];

    var formatter = new Formatter(5);

    function describe(path) {
        var res;
        if (path.children) {
            res = path.children.map(function(child) {
                return describe(child);
            });
        } else {
            res = path.segments.map(function(segment) {
                var pt = segment.point,
                    hi = segment.handleIn,
                    ho = segment.handleOut;
                return (hi.isZero() && ho.isZero()
                        ? [pt.x, pt.y]
                        : [pt.x, pt.y, hi.x, hi.y, ho.x, ho.y])
                        .map(function(x) { return formatter.number(x); });
            });
            if (path.closed)
                res.push(true);
        }
        return res;
    }

    function create(data) {
        if (!data)
            return null;
        var first = data[0],
            peek = first && first[0];
        if (typeof peek === 'number') {
            var closed = data[data.length - 1];
            if (typeof closed === 'boolean') {
                data.length--;
            } else {
                closed = false;
            }
            var path = new Path({ segments: data, closed: closed });
            // Fix natural clockwise value, so it's not automatically determined
            // when inserted into the compound-path.
            path.clockwise = path.clockwise;
            return path;
        } else {
            return new CompoundPath(data.map(create));
        }
    }

    data.forEach(function(entry, i) {
        var item = PathItem.create(entry);
        // console.log(JSON.stringify(describe(item)));
        var compare = create(expected[i]);
        equals(item, compare, 'data[' + i + ']');
    });
});

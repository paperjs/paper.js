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

QUnit.module('PathItem');

test('PathItem#create() with SVG path-data (#1101)', function() {
    var data = [
        'M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z',
        'M20 20l20 20v-20zm20 20l-20 20h20z',
        'M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z',
        'M11,18l0,-12l-8.5,6z M11.5,12l8.5,6l0,-12z',
        'M10,10 L20,20 L10,30 M30,10 L30,30',
        'M 0 1.5 l 1e1 0 m -10 2 l 1e+1 0 m -10 2 l 100e-1 0',
        'M372 130Q272 50 422 10zm70 0q50-150-80-90z',
        // The following tests are derived from test of the
        // "W3C Scalable Vector Graphics (SVG) Test Suite"
        //https://www.w3.org/Graphics/SVG/Test/20110816/svg/paths-data-01-t.svg
        //https://www.w3.org/Graphics/SVG/Test/20110816/svg/paths-data-02-t.svg
        // Copyright © 2015 W3C® (MIT, ERCIM, Keio, Beihang)
        'M210 130C145 130 110 80 110 80S75 25 10 25m0 105c65 0 100 -50 100 ' +
        '-50s35 -55 100 -55',
        'M240 90c0 30 7 50 50 0c43-50 50 -30 50 0c0 83-68-34-90-30C240 60 ' +
        '240 90 240 90z',
        'M80 170C100 170 160 170 180 170Z',
        'M5 260C40 260 60 175 55 160c-5 15 15 100 50 100Z',
        'm200 260c50-40 50-100 25-100s-25 60 25 100',
        'M360 100C420 90 460 140 450 190',
        'M360 210c0 20-16 36-36 36s-36-16-36-36s16-36 36-36s36 16 36 36z',
        '   m   360  325   c  -40-60 95   -100 80 0   z   ',
        'M15 20Q30 120 130 30M180 80q-75-100-163-60z',
        'M372 130Q272 50 422 10zm70 0q50-150-80-90z',
        'M224 103Q234-12 304 33Z',
        'M208 168Q258 268 308 168T258 118Q128 88 208 168z',
        'M60 100Q-40 150 60 200Q160 150 60 100z',
        'M240 296q25-100 47 0t47 0t47 0t47 0t47 0z',
        'M172 193q-100 50 0 50Q72 243 172 293q100-50 0-50Q272 243 172 193z'
    ];

    var expected = [
        [[[11,18],[11,6],[2.5,12],true], [[11.5,12],[20,18],[20,6],true]],
        [[[20,20],[40,40],[40,20],true], [[40,40],[20,60],[40,60],true]],
        [[[11,18],[11,6],[2.5,12],true],[[11.5,12],[20,18],[20,6],true]],
        [[[11,18],[11,6],[2.5,12],true],[[11.5,12],[20,18],[20,6],true]],
        [[[10,10],[20,20],[10,30]],[[30,10],[30,30]]],
        [[[0,1.5],[10,1.5]],[[0,3.5],[10,3.5]],[[0,5.5],[10,5.5]]],
        [[[372,130,0,0,-66.66667,-53.33333],[422,10,-100,26.66667,0,0],true],
            [[442,130,0,0,33.33333,-100],[362,40,86.66667,-40,0,0],true]],
        [[[210,130,0,0,-65,0],[110,80],[10,25,65,0,0,0]],[[10,130,0,0,65,0],
            [110,80],[210,25,-65,0,0,0]]],
        [[240,90,0,0,0,30],[290,90,-43,50,43,-50],[340,90,0,-30,0,83],
            [250,60,22,-4,-10,0],true],
        [[80,170,0,0,20,0],[180,170,-20,0,0,0],true],
        [[5,260,0,0,35,0],[55,160,5,15,-5,15],[105,260,-35,0,0,0],true],
        [[200,260,0,0,50,-40],[225,160,25,0,-25,0],[250,260,-50,-40,0,0]],
        [[360,100,0,0,60,-10],[450,190,10,-50,0,0]],
        [[360,210,0,-20,0,20],[324,246,20,0,-20,0],[288,210,0,20,0,-20],
            [324,174,-20,0,20,0],true],
        [[360,325,0,0,-40,-60],[440,325,15,-100,0,0],true],
        [[[15,20,0,0,10,66.66667],[130,30,-66.66667,60,0,0]],
            [[180,80,0,0,-50,-66.66667],[17,20,58.66667,-26.66667,0,0],true]],
        [[[372,130,0,0,-66.66667,-53.33333],[422,10,-100,26.66667,0,0],true],
            [[442,130,0,0,33.33333,-100],[362,40,86.66667,-40,0,0],true]],
        [[224,103,0,0,6.66667,-76.66667],[304,33,-46.66667,-30,0,0],true],
        [[208,168,-53.33333,-53.33333,33.33333,66.66667],
            [308,168,-33.33333,66.66667,33.33333,-66.66667],
            [258,118,66.66667,-33.33333,-86.66667,-20],true],
        [[60,100,66.66667,33.33333,-66.66667,33.33333],
            [60,200,-66.66667,-33.33333,66.66667,-33.33333],true],
        [[240,296,0,0,16.66667,-66.66667],
            [287,296,-14.66667,-66.66667,14.66667,66.66667],
            [334,296,-16.66667,66.66667,16.66667,-66.66667],
            [381,296,-14.66667,-66.66667,14.66667,66.66667],
            [428,296,-16.66667,66.66667,16.66667,-66.66667],
            [475,296,-14.66667,-66.66667,0,0],true],
        [[172,193,66.66667,33.33333,-66.66667,33.33333],
            [172,243,-66.66667,0,-66.66667,0],
            [172,293,-66.66667,-33.33333,66.66667,-33.33333],
            [172,243,66.66667,0,66.66667,0],true]
    ];

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
                    ho = segment.handleOut,
                    multiplier = Math.pow(10, 5);
                return (hi.isZero() && ho.isZero()
                        ? [pt.x, pt.y]
                        : [pt.x, pt.y, hi.x, hi.y, ho.x, ho.y])
                        .map(function(x) {
                            return Math.round(x * multiplier) / multiplier;
                        });
            });
            if (path.closed)
                res.push(true);
        }
        return res;
    }

    data.forEach(function(entry, i) {
        var path = PathItem.create(entry);
        // console.log(JSON.stringify(describe(path)));
        equals(path, PathItem.create(expected[i]), 'data[' + i + ']');
    });
});

test('PathItem#compare()', function() {
    var empty = new Path();
    var circle = new Path.Circle({
        center: [100, 100],
        radius: 100
    });
    var square = new Path.Rectangle({
        point: [100, 100],
        size: [100, 100]
    });

    var square2 = square.clone();
    square2.divideAt(50);
    square2.divideAt(150);

    var circle2 = circle.clone();
    circle2.divideAt(50);
    circle2.divideAt(100);

    equals(function() {
        return square.compare(null);
    }, false, 'Comparing with an invalid item should return false.');
    equals(function() {
        return square.compare(empty);
    }, false, 'Comparing a square with an empty path should return false.');
    equals(function() {
        return square.compare(circle);
    }, false, 'Comparing a square with a circle should return false.');
    equals(function() {
        return square.compare(square.clone());
    }, true, 'Comparing a square with its clone should return true.');
    equals(function() {
        return circle.compare(circle.clone());
    }, true, 'Comparing a circle with its clone should return true.');
    equals(function() {
        return square.compare(square2);
    }, true, 'Comparing a square with an identical square with additional segments should return true.');
    equals(function() {
        return square2.compare(square);
    }, true, 'Comparing a square with additional segments with an identical square should return true.');
    equals(function() {
        return circle.compare(circle2);
    }, true, 'Comparing a circle with an identical circle with additional segments should return true.');
    equals(function() {
        return circle2.compare(circle);
    }, true, 'Comparing a circle with additional segments with an identical circle should return true.');

    var compoundPath1 = PathItem.create('M50,300l0,-150l50,25l0,-75l200,0l0,200z M100,200l50,0l-50,-25z');
    var compoundPath2 = PathItem.create('M50,300l0,-150l50,25l0,-75l200,0l0,200z M100,175l0,25l50,0z');
    var compoundPath3 = PathItem.create('M50,300l0,-150l50,25l0,-75l200,0l0,210z M100,200l50,0l-50,-25z');

    equals(function() {
        return compoundPath1.compare(compoundPath2);
    }, true, 'Comparing two compound paths with one child starting at a different point should return true.');
    equals(function() {
        return compoundPath1.compare(compoundPath3);
    }, false, 'Comparing two compound paths with one child having a different shape should return false.');
});

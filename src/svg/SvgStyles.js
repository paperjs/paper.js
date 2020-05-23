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

var SvgStyles = Base.each({
    // Fill
    fillColor: ['fill', 'color'],
    fillRule: ['fill-rule', 'string'],
    // Stroke
    strokeColor: ['stroke', 'color'],
    strokeWidth: ['stroke-width', 'number'],
    strokeCap: ['stroke-linecap', 'string'],
    strokeJoin: ['stroke-linejoin', 'string'],
    strokeScaling: ['vector-effect', 'lookup', {
        true: 'none',
        false: 'non-scaling-stroke'
    }, function(item, value) {
        // no inheritance, only applies to graphical elements
        return !value // false, meaning non-scaling-stroke
                && (item instanceof PathItem
                    || item instanceof Shape
                    || item instanceof TextItem);
    }],
    miterLimit: ['stroke-miterlimit', 'number'],
    dashArray: ['stroke-dasharray', 'array'],
    dashOffset: ['stroke-dashoffset', 'number'],
    // Text
    fontFamily: ['font-family', 'string'],
    fontWeight: ['font-weight', 'string'],
    fontSize: ['font-size', 'number'],
    justification: ['text-anchor', 'lookup', {
        left: 'start',
        center: 'middle',
        right: 'end'
    }],
    // Item
    opacity: ['opacity', 'number'],
    blendMode: ['mix-blend-mode', 'style']
}, function(entry, key) {
    var part = Base.capitalize(key),
        lookup = entry[2];
    this[key] = {
        type: entry[1],
        property: key,
        attribute: entry[0],
        toSVG: lookup,
        fromSVG: lookup && Base.each(lookup, function(value, name) {
            this[value] = name;
        }, {}),
        exportFilter: entry[3],
        get: 'get' + part,
        set: 'set' + part
    };
}, {});

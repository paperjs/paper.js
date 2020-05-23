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

/**
 * @name SvgElement
 * @namespace
 * @private
 */
var SvgElement = new function() {
    // SVG related namespaces
    var svg = 'http://www.w3.org/2000/svg',
        xmlns = 'http://www.w3.org/2000/xmlns',
        xlink = 'http://www.w3.org/1999/xlink',
        // Mapping of attribute names to required namespaces:
        attributeNamespace = {
            href: xlink,
            xlink: xmlns,
            // Only the xmlns attribute needs the trailing slash. See #984
            xmlns: xmlns + '/',
            // IE needs the xmlns namespace when setting 'xmlns:xlink'. See #984
            'xmlns:xlink': xmlns + '/'
        };

    function create(tag, attributes, formatter) {
        return set(document.createElementNS(svg, tag), attributes, formatter);
    }

    function get(node, name) {
        var namespace = attributeNamespace[name],
            value = namespace
                ? node.getAttributeNS(namespace, name)
                : node.getAttribute(name);
        return value === 'null' ? null : value;
    }

    function set(node, attributes, formatter) {
        for (var name in attributes) {
            var value = attributes[name],
                namespace = attributeNamespace[name];
            if (typeof value === 'number' && formatter)
                value = formatter.number(value);
            if (namespace) {
                node.setAttributeNS(namespace, name, value);
            } else {
                node.setAttribute(name, value);
            }
        }
        return node;
    }

    return /** @lends SvgElement */{
        // Export namespaces
        svg: svg,
        xmlns: xmlns,
        xlink: xlink,

        // Methods
        create: create,
        get: get,
        set: set
    };
};

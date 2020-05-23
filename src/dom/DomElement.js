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
 * @name DomElement
 * @namespace
 * @private
 */
var DomElement = new function() {
    // Handles both getting and setting of vendor prefix values
    function handlePrefix(el, name, set, value) {
        var prefixes = ['', 'webkit', 'moz', 'Moz', 'ms', 'o'],
            suffix = name[0].toUpperCase() + name.substring(1);
        for (var i = 0; i < 6; i++) {
            var prefix = prefixes[i],
                key = prefix ? prefix + suffix : name;
            if (key in el) {
                if (set) {
                    el[key] = value;
                } else {
                    return el[key];
                }
                break;
            }
        }
    }

    return /** @lends DomElement */{
        getStyles: function(el) {
            // If el is a document (nodeType == 9), use it directly
            var doc = el && el.nodeType !== 9 ? el.ownerDocument : el,
                view = doc && doc.defaultView;
            return view && view.getComputedStyle(el, '');
        },

        getBounds: function(el, viewport) {
            var doc = el.ownerDocument,
                body = doc.body,
                html = doc.documentElement,
                rect;
            try {
                // On IE, for nodes that are not inside the DOM, this throws an
                // exception. Emulate the behavior of all other browsers, which
                // return a rectangle of 0 dimensions.
                rect = el.getBoundingClientRect();
            } catch (e) {
                rect = { left: 0, top: 0, width: 0, height: 0 };
            }
            var x = rect.left - (html.clientLeft || body.clientLeft || 0),
                y = rect.top - (html.clientTop || body.clientTop || 0);
            if (!viewport) {
                var view = doc.defaultView;
                x += view.pageXOffset || html.scrollLeft || body.scrollLeft;
                y += view.pageYOffset || html.scrollTop || body.scrollTop;
            }
            return new Rectangle(x, y, rect.width, rect.height);
        },

        getViewportBounds: function(el) {
            var doc = el.ownerDocument,
                view = doc.defaultView,
                html = doc.documentElement;
            return new Rectangle(0, 0,
                view.innerWidth || html.clientWidth,
                view.innerHeight || html.clientHeight
            );
        },

        getOffset: function(el, viewport) {
            return DomElement.getBounds(el, viewport).getPoint();
        },

        getSize: function(el) {
            return DomElement.getBounds(el, true).getSize();
        },

        /**
         * Checks if element is invisible (display: none, ...).
         */
        isInvisible: function(el) {
            return DomElement.getSize(el).equals(new Size(0, 0));
        },

        /**
         * Checks if element is visible in current viewport.
         */
        isInView: function(el) {
            // See if the viewport bounds intersect with the windows rectangle
            // which always starts at 0, 0
            return !DomElement.isInvisible(el)
                    && DomElement.getViewportBounds(el).intersects(
                        DomElement.getBounds(el, true));
        },

        /**
         * Checks if element is inside the DOM.
         */
        isInserted: function(el) {
            return document.body.contains(el);
        },

        /**
         * Gets the given property from the element, trying out all browser
         * prefix variants.
         */
        getPrefixed: function(el, name) {
            return el && handlePrefix(el, name);
        },

        setPrefixed: function(el, name, value) {
            if (typeof name === 'object') {
                for (var key in name)
                    handlePrefix(el, key, true, name[key]);
            } else {
                handlePrefix(el, name, true, value);
            }
        }
    };
};

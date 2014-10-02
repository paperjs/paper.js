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

/**
 * @name DomElement
 * @namespace
 * @private
 */
var DomElement = new function() {
    // We use a mix of Bootstrap.js legacy and Bonzo.js magic, ported over and
    // furhter simplified to a subset actually required by Paper.js

    var special = /^(checked|value|selected|disabled)$/i,
        translated = { text: 'textContent', html: 'innerHTML' },
        unitless = { lineHeight: 1, zoom: 1, zIndex: 1, opacity: 1 };

    function create(nodes, parent) {
        var res = [];
        for (var i =  0, l = nodes && nodes.length; i < l;) {
            var el = nodes[i++];
            if (typeof el === 'string') {
                el = document.createElement(el);
            } else if (!el || !el.nodeType) {
                continue;
            }
            // Do we have attributes?
            if (Base.isPlainObject(nodes[i]))
                DomElement.set(el, nodes[i++]);
            // Do we have children?
            if (Array.isArray(nodes[i]))
                create(nodes[i++], el);
            // Are we adding to a parent?
            if (parent)
                parent.appendChild(el);
            res.push(el);
        }
        return res;
    }

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
        create: function(nodes, parent) {
            var isArray = Array.isArray(nodes),
                res = create(isArray ? nodes : arguments, isArray ? parent : null);
            return res.length == 1 ? res[0] : res;
        },

        find: function(selector, root) {
            return (root || document).querySelector(selector);
        },

        findAll: function(selector, root) {
            return (root || document).querySelectorAll(selector);
        },

        get: function(el, key) {
            return el
                ? special.test(key)
                    ? key === 'value' || typeof el[key] !== 'string'
                        ? el[key]
                        : true
                    : key in translated
                        ? el[translated[key]]
                        : el.getAttribute(key)
                : null;
        },

        set: function(el, key, value) {
            if (typeof key !== 'string') {
                for (var name in key)
                    if (key.hasOwnProperty(name))
                        DomElement.set(el, name, key[name]);
            } else if (!el || value === undefined) {
                return el;
            } else if (special.test(key)) {
                el[key] = value;
            } else if (key in translated) {
                el[translated[key]] = value;
            } else if (key === 'style') {
                DomElement.setStyle(el, value);
            } else if (key === 'events') {
                DomEvent.add(el, value);
            } else {
                el.setAttribute(key, value);
            }
            return el;
        },

        getStyles: function(el) {
            // If el is a document (nodeType == 9), use it directly
            var doc = el && el.nodeType !== 9 ? el.ownerDocument : el,
                view = doc && doc.defaultView;
            return view && view.getComputedStyle(el, '');
        },

        getStyle: function(el, key) {
            return el && el.style[key] || DomElement.getStyles(el)[key] || null;
        },

        setStyle: function(el, key, value) {
            if (typeof key !== 'string') {
                for (var name in key)
                    if (key.hasOwnProperty(name))
                        DomElement.setStyle(el, name, key[name]);
            } else {
                if (/^-?[\d\.]+$/.test(value) && !(key in unitless))
                    value += 'px';
                el.style[key] = value;
            }
            return el;
        },

        hasClass: function(el, cls) {
            return el && new RegExp('\\s*' + cls + '\\s*').test(el.className);
        },

        addClass: function(el, cls) {
            if (el) {
                el.className = (el.className + ' ' + cls).trim();
            }
        },

        removeClass: function(el, cls) {
            if (el) {
                el.className = el.className.replace(
                    new RegExp('\\s*' + cls + '\\s*'), ' ').trim();
            }
        },

        toggleClass: function(el, cls, state) {
            DomElement[(state === undefined ? !DomElement.hasClass(el, cls)
                    : state) ? 'addClass' : 'removeClass'](el, cls);
        },

        remove: function(el) {
            if (el.parentNode)
                el.parentNode.removeChild(el);
        },

        addChildren: function(el, children) {
            // We can use the create() function for this too!
            return create(children, el);
        },

        removeChildren: function(el) {
            while (el.firstChild)
                el.removeChild(el.firstChild);
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
         * Checks if element is invisibile (display: none, ...)
         */
        isInvisible: function(el) {
            return DomElement.getSize(el).equals(new Size(0, 0));
        },

        /**
         * Checks if element is visibile in current viewport
         */
        isInView: function(el) {
            // See if the viewport bounds intersect with the windows rectangle
            // which always starts at 0, 0
            return !DomElement.isInvisible(el)
                    && DomElement.getViewportBounds(el).intersects(
                        DomElement.getBounds(el, true));
        },

        /**
         * Gets the given property from the element, trying out all browser
         * prefix variants.
         */
        getPrefixed: function(el, name) {
            return handlePrefix(el, name);
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

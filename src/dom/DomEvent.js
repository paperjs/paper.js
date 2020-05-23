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
 * @name DomEvent
 * @namespace
 * @private
 */
var DomEvent = /** @lends DomEvent */{
    add: function(el, events) {
        // Do not fail if el is not defined, that way we can keep the code that
        // should not fail in web-workers to a minimum.
        if (el) {
            for (var type in events) {
                var func = events[type],
                    parts = type.split(/[\s,]+/g);
                for (var i = 0, l = parts.length; i < l; i++) {
                    var name = parts[i];
                    // For touchstart/touchmove events on document, we need to
                    // explicitly declare that the event is not passive (can be
                    // prevented).  Otherwise chrome browser would ignore
                    // `event.preventDefault()` calls and omit warnings.
                    // See #1501 and:
                    // https://www.chromestatus.com/features/5093566007214080
                    var options = (
                        el === document
                        && (name === 'touchstart' || name === 'touchmove')
                    ) ? { passive: false } : false;
                    el.addEventListener(name, func, options);
                }
            }
        }
    },

    remove: function(el, events) {
        // See DomEvent.add() for an explanation of this check:
        if (el) {
            for (var type in events) {
                var func = events[type],
                    parts = type.split(/[\s,]+/g);
                for (var i = 0, l = parts.length; i < l; i++)
                    el.removeEventListener(parts[i], func, false);
            }
        }
    },

    getPoint: function(event) {
        var pos = event.targetTouches
                ? event.targetTouches.length
                    ? event.targetTouches[0]
                    : event.changedTouches[0]
                : event;
        return new Point(
            pos.pageX || pos.clientX + document.documentElement.scrollLeft,
            pos.pageY || pos.clientY + document.documentElement.scrollTop
        );
    },

    getTarget: function(event) {
        return event.target || event.srcElement;
    },

    getRelatedTarget: function(event) {
        return event.relatedTarget || event.toElement;
    },

    getOffset: function(event, target) {
        // Remove target offsets from page coordinates
        return DomEvent.getPoint(event).subtract(DomElement.getOffset(
                target || DomEvent.getTarget(event)));
    }
};

DomEvent.requestAnimationFrame = new function() {
    var nativeRequest = DomElement.getPrefixed(window, 'requestAnimationFrame'),
        requested = false,
        callbacks = [],
        timer;

    function handleCallbacks() {
        // Make a local references to the current callbacks array and set
        // callbacks to a new empty array, so it can collect the functions for
        // the new requests.
        var functions = callbacks;
        callbacks = [];
        // Call the collected callback functions.
        for (var i = 0, l = functions.length; i < l; i++)
            functions[i]();
        // Now see if the above calls have collected new callbacks. Keep
        // requesting new frames as long as we have callbacks.
        requested = nativeRequest && callbacks.length;
        if (requested)
            nativeRequest(handleCallbacks);
    }

    return function(callback) {
        // Add to the list of callbacks to be called in the next animation
        // frame.
        callbacks.push(callback);
        if (nativeRequest) {
            // Handle animation natively. We only need to request the frame
            // once for all collected callbacks.
            if (!requested) {
                nativeRequest(handleCallbacks);
                requested = true;
            }
        } else if (!timer) {
            // Install interval timer that checks all callbacks. This
            // results in faster animations than repeatedly installing
            // timeout timers.
            timer = setInterval(handleCallbacks, 1000 / 60);
        }
    };
};

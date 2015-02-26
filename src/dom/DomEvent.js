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
 * @name DomEvent
 * @namespace
 * @private
 */
var DomEvent = /** @lends DomEvent */{
    add: function(el, events) {
        for (var type in events) {
            var func = events[type],
                parts = type.split(/[\s,]+/g);
            for (var i = 0, l = parts.length; i < l; i++)
                el.addEventListener(parts[i], func, false);
        }
    },

    remove: function(el, events) {
        for (var type in events) {
            var func = events[type],
                parts = type.split(/[\s,]+/g);
            for (var i = 0, l = parts.length; i < l; i++)
                el.removeEventListener(parts[i], func, false);
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
    },

    stop: function(event) {
        event.stopPropagation();
        event.preventDefault();
    }
};

DomEvent.requestAnimationFrame = new function() {
    var nativeRequest = typeof window === 'object' &&
            DomElement.getPrefixed(window, 'requestAnimationFrame'),
        requested = false,
        callbacks = [],
        focused = true,
        timer;

    if ( typeof window === 'object' ) {
        DomEvent.add(window, {
            focus: function() {
                focused = true;
            },
            blur: function() {
                focused = false;
            }
        });
    }

    function handleCallbacks() {
        // Checks all installed callbacks for element visibility and
        // execute if needed.
        for (var i = callbacks.length - 1; i >= 0; i--) {
            var entry = callbacks[i],
                func = entry[0],
                el = entry[1];
            if (!el || (PaperScope.getAttribute(el, 'keepalive') == 'true'
                    || focused) && DomElement.isInView(el)) {
                // Only remove from the list once the callback was called. This
                // could take a long time based on visibility. But this way we
                // are sure to keep the animation loop running.
                callbacks.splice(i, 1);
                func();
            }
        }
        if (nativeRequest) {
            if (callbacks.length) {
                // If we haven't processed all callbacks yet, we need to keep
                // the loop running, as otherwise it would die off.
                nativeRequest(handleCallbacks);
            } else {
                requested = false;
            }
        }
    }

    return function(callback, element) {
        // Add to the list of callbacks to be called in the next animation
        // frame.
        callbacks.push([callback, element]);
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
            // timout timers.
            timer = setInterval(handleCallbacks, 1000 / 60);
        }
    };
};

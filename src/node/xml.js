/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2019, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & https://puckey.studio/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

module.exports = function(self) {
    // Define XMLSerializer shim, to emulate browser behavior.
    // Effort to bring XMLSerializer to jsdom:
    // https://github.com/tmpvar/jsdom/issues/1368
    self.XMLSerializer = function XMLSerializer() {
    };

    self.XMLSerializer.prototype = {
        serializeToString: function(node) {
            if (!node)
                return '';
            // Fix a jsdom issue where all SVG tagNames are lowercased:
            // https://github.com/tmpvar/jsdom/issues/620
            var text = node.outerHTML,
                tagNames = ['linearGradient', 'radialGradient', 'clipPath',
                    'textPath'];
            for (var i = 0, l = tagNames.length; i < l; i++) {
                var tagName = tagNames[i];
                text = text.replace(
                    new RegExp('(<|</)' + tagName.toLowerCase() + '\\b', 'g'),
                    function(match, start) {
                        return start + tagName;
                    });
            }
            return text;
        }
    };
};

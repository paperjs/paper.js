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

var Http = {
    request: function(options) {
        // Code borrowed from Coffee Script and extended:
        var ctor = window.ActiveXObject || window.XMLHttpRequest,
            xhr = new ctor('Microsoft.XMLHTTP');
        xhr.open((options.method || 'get').toUpperCase(), options.url,
                Base.pick(options.async, true));
        if ('overrideMimeType' in xhr)
            xhr.overrideMimeType('text/plain');
        xhr.onload = function() {
            var status = xhr.status;
            if (status === 0 || status === 200) {
                if (options.onLoad) {
                    options.onLoad.call(xhr, xhr.responseText);
                }
            } else {
                xhr.onerror();
            }
        };
        xhr.onerror = function() {
            var status = xhr.status,
                message = 'Could not load "' + options.url + '" (Status: '
                        + status + ')';
            if (options.onError) {
                options.onError(message, status);
            } else {
                throw new Error(message);
            }
        };
        return xhr.send(null);
    }
};

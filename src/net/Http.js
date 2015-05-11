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

var Http = {
    request: function(method, url, callback, async) {
        // Code borrowed from Coffee Script and extended:
        async = (async === undefined) ? true : async;
        var xhr = new (window.ActiveXObject || XMLHttpRequest)(
                    'Microsoft.XMLHTTP');
        xhr.open(method.toUpperCase(), url, async);
        if ('overrideMimeType' in xhr)
            xhr.overrideMimeType('text/plain');
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                var status = xhr.status;
                if (status === 0 || status === 200) {
                    callback.call(xhr, xhr.responseText);
                } else {
                    throw new Error('Could not load ' + url + ' (Error '
                            + status + ')');
                }
            }
        };
        return xhr.send(null);
    }
};

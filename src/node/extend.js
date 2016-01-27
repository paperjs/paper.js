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

var fs = require('fs'),
    path = require('path');
    Canvas = require('canvas');

module.exports = function(paper) {
    var sourceMaps = {},
        sourceMapSupprt = 'require("source-map-support").install(paper.PaperScript.sourceMapSupport);\n';

    paper.PaperScript.sourceMapSupport = {
        retrieveSourceMap: function(source) {
            var map = sourceMaps[source];
            return map ? { url: source, map: map } : null;
        }
    };

    // Register the .pjs extension for automatic compilation as PaperScript
    require.extensions['.pjs'] = function(module, filename) {
        // Requiring a PaperScript on Node.js returns an initialize method which
        // needs to receive a Canvas object when called and returns the
        // PaperScope.
        module.exports = function(canvas) {
            var source = fs.readFileSync(filename, 'utf8'),
                code = sourceMapSupprt + source,
                compiled = paper.PaperScript.compile(code, {
                    url: filename,
                    source: source,
                    sourceMaps: true,
                    offset: -1 // remove sourceMapSupprt...
                }),
                scope = new paper.PaperScope();
            // Keep track of sourceMaps so retrieveSourceMap() can link them up
            scope.setup(canvas);
            scope.__filename = filename;
            scope.__dirname = path.dirname(filename);
            // Expose core methods and values
            scope.require = require;
            scope.console = console;
            sourceMaps[filename] = compiled.map;
            paper.PaperScript.execute(compiled, scope);
            return scope;
        };
    };

    paper.PaperScope.inject({
        createCanvas: function(width, height, type) {
            // Do not use CanvasProvider.getCanvas(), since we may be changing
            // the underlying node-canvas and don't want to release it after
            // back into the pool.
            var canvas = paper.document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvas.type = type;
            return canvas;
        },

        /**
         * @deprecated, use use {@link #createCanvas(width, height)} instead.
         */
        Canvas: '#createCanvas'
    });

    // Node.js based image exporting code.
    paper.CanvasView.inject({
        // DOCS: CanvasView#exportFrames(param);
        exportFrames: function(param) {
            param = new paper.Base({
                fps: 30,
                prefix: 'frame-',
                amount: 1
            }, param);
            if (!param.directory) {
                throw new Error('Missing param.directory');
            }
            var view = this,
                count = 0,
                frameDuration = 1 / param.fps,
                startTime = Date.now(),
                lastTime = startTime;

            // Start exporting frames by exporting the first frame:
            exportFrame(param);

            function exportFrame(param) {
                var file = path.join(param.directory,
                        param.prefix + ('000000' + count).slice(-6) + '.png');
                var out = view.exportImage(file, function() {
                    // When the file has been closed, export the next fame:
                    var then = Date.now();
                    if (param.onProgress) {
                        param.onProgress({
                            count: count,
                            amount: param.amount,
                            percentage: Math.round(count / param.amount
                                    * 10000) / 100,
                            time: then - startTime,
                            delta: then - lastTime
                        });
                    }
                    lastTime = then;
                    if (count < param.amount) {
                        exportFrame(param);
                    } else {
                        // Call onComplete handler when finished:
                        if (param.onComplete) {
                            param.onComplete();
                        }
                    }
                });
                // Convert to a Base object, for #toString()
                view.emit('frame', new paper.Base({
                    delta: frameDuration,
                    time: frameDuration * count,
                    count: count
                }));
                count++;
            }
        },

        // DOCS: CanvasView#exportImage(path, callback);
        exportImage: function(path, callback) {
            this.update();
            var out = fs.createWriteStream(path),
                stream = this._element.createPNGStream();
            // Pipe the png stream to the write stream:
            stream.pipe(out);
            if (callback) {
                out.on('close', callback);
            }
            return out;
        }
    });
};

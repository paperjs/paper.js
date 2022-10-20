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
 * @name Raster
 *
 * @class The Raster item represents an image in a Paper.js project.
 *
 * @extends Item
 */
var Raster = Item.extend(/** @lends Raster# */{
    _class: 'Raster',
    _applyMatrix: false,
    _canApplyMatrix: false,
    // Raster doesn't make the distinction between the different bounds,
    // so use the same name for all of them
    _boundsOptions: { stroke: false, handle: false },
    _serializeFields: {
        crossOrigin: null, // NOTE: Needs to be set before source to work!
        source: null
    },
    // Prioritize `crossOrigin` over `source`:
    _prioritize: ['crossOrigin'],
    _smoothing: 'low',
    // Enforce creation of beans, as bean getters have hidden parameters.
    // See  #getContext(_change) below.
    beans: true,

    // TODO: Implement type, width, height.
    // TODO: Have SymbolItem & Raster inherit from a shared class?
    /**
     * Creates a new raster item from the passed argument, and places it in the
     * active layer. `source` can either be a DOM Image, a Canvas, or a string
     * describing the URL to load the image from, or the ID of a DOM element to
     * get the image from (either a DOM Image or a Canvas).
     *
     * @name Raster#initialize
     * @param {HTMLImageElement|HTMLCanvasElement|String} [source] the source of
     *     the raster
     * @param {Point} [position] the center position at which the raster item is
     *     placed
     *
     * @example {@paperscript height=300} // Creating a raster using a url
     * var url = 'http://assets.paperjs.org/images/marilyn.jpg';
     * var raster = new Raster(url);
     *
     * // If you create a Raster using a url, you can use the onLoad
     * // handler to do something once it is loaded:
     * raster.onLoad = function() {
     *     console.log('The image has loaded.');
     * };
     *
     * @example // Creating a raster using the id of a DOM Image:
     *
     * // Create a raster using the id of the image:
     * var raster = new Raster('art');
     *
     * @example // Creating a raster using a DOM Image:
     *
     * // Find the element using its id:
     * var imageElement = document.getElementById('art');
     *
     * // Create the raster:
     * var raster = new Raster(imageElement);
     */
    /**
     * Creates a new empty raster of the given size, and places it in the
     * active layer.
     *
     * @name Raster#initialize
     * @param {Size} size the size of the raster
     * @param {Point} [position] the center position at which the raster item is
     *     placed
     *
     * @example {@paperscript height=150}
     * // Creating an empty raster and fill it with random pixels:
     * var width = 100;
     * var height = 100;
     *
     * // Create an empty raster placed at view center.
     * var raster = new Raster(new Size(width, height), view.center);
     *
     * // For all of its pixels...
     * for (var i = 0; i < width; i++) {
     *     for (var j = 0; j < height; j++) {
     *         // ...set a random color.
     *         raster.setPixel(i, j, Color.random());
     *     }
     * }
     */
    /**
     * Creates a new raster from an object description, and places it in the
     * active layer.
     *
     * @name Raster#initialize
     * @param {Object} object an object containing properties to be set on the
     *     raster
     *
     * @example {@paperscript height=300}
     * var raster = new Raster({
     *     source: 'http://assets.paperjs.org/images/marilyn.jpg',
     *     position: view.center
     * });
     *
     * raster.scale(0.5);
     * raster.rotate(10);
     */
    initialize: function Raster(source, position) {
        // Support three forms of item initialization:
        // - One object literal describing all the different properties.
        // - An image (Image|Canvas|String) and an optional position (Point).
        // - A size (Size) describing the canvas that will be  created and an
        //   optional position (Point).
        // If _initialize can set properties through object literal, we're done.
        // Otherwise we need to check the type of object:
        if (!this._initialize(source,
                position !== undefined && Point.read(arguments))) {
            var image,
                type = typeof source,
                object = type === 'string'
                    ? document.getElementById(source)
                    : type  === 'object'
                        ? source
                        : null;
            if (object && object !== Item.NO_INSERT) {
                if (object.getContext || object.naturalHeight != null) {
                    image = object;
                } else if (object) {
                    // See if the arguments describe the raster size:
                    var size = Size.read(arguments);
                    if (!size.isZero()) {
                        image = CanvasProvider.getCanvas(size);
                    }
                }
            }
            if (image) {
                // #setImage() handles both canvas and image types.
                this.setImage(image);
            } else {
                this.setSource(source);
            }
        }
        if (!this._size) {
            this._size = new Size();
            this._loaded = false;
        }
    },

    _equals: function(item) {
        return this.getSource() === item.getSource();
    },

    copyContent: function(source) {
        var image = source._image,
            canvas = source._canvas;
        if (image) {
            this._setImage(image);
        } else if (canvas) {
            // If the Raster contains a Canvas object, we need to create a new
            // one and draw this raster's canvas on it.
            var copyCanvas = CanvasProvider.getCanvas(source._size);
            copyCanvas.getContext('2d').drawImage(canvas, 0, 0);
            this._setImage(copyCanvas);
        }
        // TODO: Shouldn't this be copied with attributes instead of content?
        this._crossOrigin = source._crossOrigin;
    },

    /**
     * The size of the raster in pixels.
     *
     * @bean
     * @type Size
     */
    getSize: function() {
        var size = this._size;
        return new LinkedSize(size ? size.width : 0, size ? size.height : 0,
                this, 'setSize');
    },

    setSize: function(_size, _clear) {
        var size = Size.read(arguments);
        if (!size.equals(this._size)) { // NOTE: this._size could be null
            if (size.width > 0 && size.height > 0) {
                // Get reference to image before changing canvas.
                var element = !_clear && this.getElement();
                // NOTE: Setting canvas internally sets _size.
                // NOTE: No need to release canvas because #_setImage() does so.
                this._setImage(CanvasProvider.getCanvas(size));
                if (element) {
                    // Draw element back onto the new, resized canvas.
                    this.getContext(true).drawImage(element, 0, 0,
                            size.width, size.height);
                }
            } else {
                // 0-width / height dimensions do not require the creation of
                // an internal canvas. Just reflect the size for now.
                if (this._canvas)
                    CanvasProvider.release(this._canvas);
                this._size = size.clone();
            }
        } else if (_clear) {
            // We can reuse the canvas, but need to clear it.
            this.clear();
        }
    },

    /**
     * The width of the raster in pixels.
     *
     * @bean
     * @type Number
     */
    getWidth: function() {
        return this._size ? this._size.width : 0;
    },

    setWidth: function(width) {
        this.setSize(width, this.getHeight());
    },

    /**
     * The height of the raster in pixels.
     *
     * @bean
     * @type Number
     */
    getHeight: function() {
        return this._size ? this._size.height : 0;
    },

    setHeight: function(height) {
        this.setSize(this.getWidth(), height);
    },

    /**
     * The loading state of the raster image.
     *
     * @bean
     * @type Boolean
     */
    getLoaded: function() {
        return this._loaded;
    },

    isEmpty: function() {
        var size = this._size;
        return !size || size.width === 0 && size.height === 0;
    },

    /**
     * The resolution of the raster at its current size, in PPI (pixels per
     * inch).
     *
     * @bean
     * @type Size
     */
    getResolution: function() {
        var matrix = this._matrix,
            orig = new Point(0, 0).transform(matrix),
            u = new Point(1, 0).transform(matrix).subtract(orig),
            v = new Point(0, 1).transform(matrix).subtract(orig);
        return new Size(
            72 / u.getLength(),
            72 / v.getLength()
        );
    },

    /**
     * @private
     * @bean
     * @deprecated use {@link #resolution} instead.
     */
    getPpi: '#getResolution',

    /**
     * The HTMLImageElement or Canvas element of the raster, if one is
     * associated.
     * Note that for consistency, a {@link #onLoad} event will be triggered on
     * the raster even if the image has already finished loading before, or if
     * we are setting the raster to a canvas.
     *
     * @bean
     * @type HTMLImageElement|HTMLCanvasElement
     */
    getImage: function() {
        return this._image;
    },

    setImage: function(image) {
        var that = this;

        function emit(event) {
            var view = that.getView(),
                type = event && event.type || 'load';
            if (view && that.responds(type)) {
                paper = view._scope;
                that.emit(type, new Event(event));
            }
        }

        this._setImage(image);
        if (this._loaded) {
            // Emit load event with a delay, so behavior is the same as when
            // it's actually loaded and we give the code time to install event.
            setTimeout(emit, 0);
        } else if (image) {
            // Trigger the load event on the image once it's loaded
            DomEvent.add(image, {
                load: function(event) {
                    that._setImage(image);
                    emit(event);
                },
                error: emit
            });
        }
    },

    /**
     * Internal version of {@link #setImage(image)} that does not trigger
     * events. This is used by #setImage(), but also in other places where
     * underlying canvases are replaced, resized, etc.
     */
    _setImage: function(image) {
        if (this._canvas)
            CanvasProvider.release(this._canvas);
        // Due to similarities, we can handle both canvas and image types here.
        if (image && image.getContext) {
            // A Canvas object
            this._image = null;
            this._canvas = image;
            this._loaded = true;
        } else {
            // A Image object
            this._image = image;
            this._canvas = null;
            this._loaded = !!(image && image.src && image.complete);
        }
        // Both canvas and image have width / height attributes. Due to IE,
        // naturalWidth / Height needs to be checked for a swell, because it
        // apparently can have width / height set to 0 when the image is
        // invisible in the document.
        this._size = new Size(
                image ? image.naturalWidth || image.width : 0,
                image ? image.naturalHeight || image.height : 0);
        this._context = null;
        this._changed(/*#=*/(Change.GEOMETRY | Change.PIXELS));
    },

    /**
     * The Canvas object of the raster. If the raster was created from an image,
     * accessing its canvas causes the raster to try and create one and draw the
     * image into it. Depending on security policies, this might fail, in which
     * case `null` is returned instead.
     *
     * @bean
     * @type HTMLCanvasElement
     */
    getCanvas: function() {
        if (!this._canvas) {
            var ctx = CanvasProvider.getContext(this._size);
            // Since drawImage into canvas might fail based on security policies
            // wrap the call in try-catch and only set _canvas if we succeeded.
            try {
                if (this._image)
                    ctx.drawImage(this._image, 0, 0);
                this._canvas = ctx.canvas;
            } catch (e) {
                CanvasProvider.release(ctx);
            }
        }
        return this._canvas;
    },

    // #setCanvas() is a simple alias to #setImage()
    setCanvas: '#setImage',

    /**
     * The Canvas 2D drawing context of the raster.
     *
     * @bean
     * @type CanvasRenderingContext2D
     */
    getContext: function(_change) {
        if (!this._context)
            this._context = this.getCanvas().getContext('2d');
        // Support a hidden parameter that indicates if the context will be used
        // to change the Raster object. We can notify such changes ahead since
        // they are only used afterwards for redrawing.
        if (_change) {
            // Also set _image to null since the Raster stops representing it.
            // NOTE: This should theoretically be in our own _changed() handler
            // for ChangeFlag.PIXELS, but since it's only happening in one place
            // this is fine:
            this._image = null;
            this._changed(/*#=*/Change.PIXELS);
        }
        return this._context;
    },

    setContext: function(context) {
        this._context = context;
    },

    /**
     * The source of the raster, which can be set using a DOM Image, a Canvas,
     * a data url, a string describing the URL to load the image from, or the
     * ID of a DOM element to get the image from (either a DOM Image or a
     * Canvas). Reading this property will return the url of the source image or
     * a data-url.
     * Note that for consistency, a {@link #onLoad} event will be triggered on
     * the raster even if the image has already finished loading before.
     *
     * @bean
     * @type HTMLImageElement|HTMLCanvasElement|String
     *
     * @example {@paperscript}
     * var raster = new Raster();
     * raster.source = 'http://paperjs.org/about/paper-js.gif';
     * raster.position = view.center;
     *
     * @example {@paperscript}
     * var raster = new Raster({
     *     source: 'http://paperjs.org/about/paper-js.gif',
     *     position: view.center
     * });
     */
    getSource: function() {
        var image = this._image;
        return image && image.src || this.toDataURL();
    },

    setSource: function(src) {
        var image = new self.Image(),
            crossOrigin = this._crossOrigin;
        if (crossOrigin)
            image.crossOrigin = crossOrigin;
        // Prevent setting image source to `null`, as this isn't supported by
        // browsers, and it would actually throw exceptions in JSDOM.
        // TODO: Look into fixing this bug in JSDOM.
        if (src)
            image.src = src;
        this.setImage(image);
    },

    /**
     * The crossOrigin value to be used when loading the image resource, in
     * order to support CORS. Note that this needs to be set before setting the
     * {@link #source} property in order to always work (e.g. when the image is
     * cached in the browser).
     *
     * @bean
     * @type String
     *
     * @example {@paperscript}
     * var raster = new Raster({
     *     crossOrigin: 'anonymous',
     *     source: 'http://assets.paperjs.org/images/marilyn.jpg',
     *     position: view.center
     * });
     *
     * console.log(view.element.toDataURL('image/png').substring(0, 32));
     */
    getCrossOrigin: function() {
        var image = this._image;
        return image && image.crossOrigin || this._crossOrigin || '';
    },

    setCrossOrigin: function(crossOrigin) {
        this._crossOrigin = crossOrigin;
        var image = this._image;
        if (image)
            image.crossOrigin = crossOrigin;
    },

    /**
     * Determines if the raster is drawn with pixel smoothing when scaled up or
     * down, and if so, at which quality its pixels are to be smoothed. The
     * settings of this property control both the `imageSmoothingEnabled` and
     * `imageSmoothingQuality` properties of the `CanvasRenderingContext2D`
     * interface.
     *
     * By default, smoothing is enabled at `'low'` quality. It can be set to of
     * `'off'` to scale the raster's pixels by repeating the nearest neighboring
     * pixels, or to `'low'`, `'medium'` or `'high'` to control the various
     * degrees of available image smoothing quality.
     *
     * For backward compatibility, it can can also be set to `false` (= `'off'`)
     * or `true` (= `'low'`).
     *
     * @bean
     * @type String
     * @default 'low'
     * @values 'low', 'medium', 'high', 'off'
     *
     * @example {@paperscript} var raster = new Raster({source:
     * 'http://assets.paperjs.org/images/marilyn.jpg', smoothing: 'off'
     * });
     * raster.scale(5);
     */
    getSmoothing: function() {
        return this._smoothing;
    },

    setSmoothing: function(smoothing) {
        this._smoothing = typeof smoothing === 'string'
            ? smoothing
            : smoothing ? 'low' : 'off';
        this._changed(/*#=*/Change.ATTRIBUTE);
    },

    // DOCS: document Raster#getElement
    getElement: function() {
        // Only return the internal element if the content is actually ready.
        return this._canvas || this._loaded && this._image;
    }
}, /** @lends Raster# */{
    // Explicitly deactivate the creation of beans, as we have functions here
    // that look like bean getters but actually read arguments.
    // See #getSubCanvas(), #getSubRaster(), #getSubRaster(), #getPixel(),
    // #getImageData()
    beans: false,

    /**
     * Extracts a part of the Raster's content as a sub image, and returns it as
     * a Canvas object.
     *
     * @param {Rectangle} rect the boundaries of the sub image in pixel
     * coordinates
     *
     * @return {HTMLCanvasElement} the sub image as a Canvas object
     */
    getSubCanvas: function(/* rect */) {
        var rect = Rectangle.read(arguments),
            ctx = CanvasProvider.getContext(rect.getSize());
        ctx.drawImage(this.getCanvas(), rect.x, rect.y,
                rect.width, rect.height, 0, 0, rect.width, rect.height);
        return ctx.canvas;
    },

    /**
     * Extracts a part of the raster item's content as a new raster item, placed
     * in exactly the same place as the original content.
     *
     * @param {Rectangle} rect the boundaries of the sub raster in pixel
     * coordinates
     *
     * @return {Raster} the sub raster as a newly created raster item
     */
    getSubRaster: function(/* rect */) {
        var rect = Rectangle.read(arguments),
            raster = new Raster(Item.NO_INSERT);
        raster._setImage(this.getSubCanvas(rect));
        raster.translate(rect.getCenter().subtract(this.getSize().divide(2)));
        raster._matrix.prepend(this._matrix);
        raster.insertAbove(this);
        return raster;
    },

    /**
     * Returns a Base 64 encoded `data:` URL representation of the raster.
     *
     * @return {String}
     */
    toDataURL: function() {
        // See if the linked image is base64 encoded already, if so reuse it,
        // otherwise try using canvas.toDataURL()
        var image = this._image,
            src = image && image.src;
        if (/^data:/.test(src))
            return src;
        var canvas = this.getCanvas();
        return canvas ? canvas.toDataURL.apply(canvas, arguments) : null;
    },

    /**
     * Draws an image on the raster.
     *
     * @param {CanvasImageSource} image
     * @param {Point} point the offset of the image as a point in pixel
     * coordinates
     */
    drawImage: function(image /*, point */) {
        var point = Point.read(arguments, 1);
        this.getContext(true).drawImage(image, point.x, point.y);
    },

    /**
     * Calculates the average color of the image within the given path,
     * rectangle or point. This can be used for creating raster image
     * effects.
     *
     * @param {Path|Rectangle|Point} object
     * @return {Color} the average color contained in the area covered by the
     * specified path, rectangle or point
     */
    getAverageColor: function(object) {
        var bounds, path;
        if (!object) {
            bounds = this.getBounds();
        } else if (object instanceof PathItem) {
            // TODO: What if the path is smaller than 1 px?
            // TODO: How about rounding of bounds.size?
            path = object;
            bounds = object.getBounds();
        } else if (typeof object === 'object') {
            if ('width' in object) {
                bounds = new Rectangle(object);
            } else if ('x' in object) {
                // Create a rectangle of 1px size around the specified point.
                bounds = new Rectangle(object.x - 0.5, object.y - 0.5, 1, 1);
            }
        }
        if (!bounds)
            return null;
        // Use a sample size of max 32 x 32 pixels, into which the path is
        // scaled as a clipping path, and then the actual image is drawn in and
        // sampled.
        var sampleSize = 32,
            width = Math.min(bounds.width, sampleSize),
            height = Math.min(bounds.height, sampleSize);
        // Reuse the same sample context for speed. Memory consumption is low
        // since it's only 32 x 32 pixels.
        var ctx = Raster._sampleContext;
        if (!ctx) {
            ctx = Raster._sampleContext = CanvasProvider.getContext(
                    new Size(sampleSize));
        } else {
            // Clear the sample canvas:
            ctx.clearRect(0, 0, sampleSize + 1, sampleSize + 1);
        }
        ctx.save();
        // Scale the context so that the bounds ends up at the given sample size
        var matrix = new Matrix()
                .scale(width / bounds.width, height / bounds.height)
                .translate(-bounds.x, -bounds.y);
        matrix.applyToContext(ctx);
        // If a path was passed, draw it as a clipping mask:
        // See Project#draw() for an explanation of new Base()
        if (path)
            path.draw(ctx, new Base({ clip: true, matrices: [matrix] }));
        // Now draw the image clipped into it.
        this._matrix.applyToContext(ctx);
        var element = this.getElement(),
            size = this._size;
        if (element)
            ctx.drawImage(element, -size.width / 2, -size.height / 2);
        ctx.restore();
        // Get pixel data from the context and calculate the average color value
        // from it, taking alpha into account.
        var pixels = ctx.getImageData(0.5, 0.5, Math.ceil(width),
                Math.ceil(height)).data,
            channels = [0, 0, 0],
            total = 0;
        for (var i = 0, l = pixels.length; i < l; i += 4) {
            var alpha = pixels[i + 3];
            total += alpha;
            alpha /= 255;
            channels[0] += pixels[i] * alpha;
            channels[1] += pixels[i + 1] * alpha;
            channels[2] += pixels[i + 2] * alpha;
        }
        for (var i = 0; i < 3; i++)
            channels[i] /= total;
        return total ? Color.read(channels) : null;
    },

    /**
     * {@grouptitle Pixels}
     * Gets the color of a pixel in the raster.
     *
     * @name Raster#getPixel
     * @function
     * @param {Number} x the x offset of the pixel in pixel coordinates
     * @param {Number} y the y offset of the pixel in pixel coordinates
     * @return {Color} the color of the pixel
     */
    /**
     * Gets the color of a pixel in the raster.
     *
     * @name Raster#getPixel
     * @function
     * @param {Point} point the offset of the pixel as a point in pixel
     *     coordinates
     * @return {Color} the color of the pixel
     */
    getPixel: function(/* point */) {
        var point = Point.read(arguments);
        var data = this.getContext().getImageData(point.x, point.y, 1, 1).data;
        // Alpha is separate now:
        return new Color('rgb', [data[0] / 255, data[1] / 255, data[2] / 255],
                data[3] / 255);
    },

    /**
     * Sets the color of the specified pixel to the specified color.
     *
     * @name Raster#setPixel
     * @function
     * @param {Number} x the x offset of the pixel in pixel coordinates
     * @param {Number} y the y offset of the pixel in pixel coordinates
     * @param {Color} color the color that the pixel will be set to
     */
    /**
     * Sets the color of the specified pixel to the specified color.
     *
     * @name Raster#setPixel
     * @function
     * @param {Point} point the offset of the pixel as a point in pixel
     *     coordinates
     * @param {Color} color the color that the pixel will be set to
     */
    setPixel: function(/* point, color */) {
        var args = arguments,
            point = Point.read(args),
            color = Color.read(args),
            components = color._convert('rgb'),
            alpha = color._alpha,
            ctx = this.getContext(true),
            imageData = ctx.createImageData(1, 1),
            data = imageData.data;
        data[0] = components[0] * 255;
        data[1] = components[1] * 255;
        data[2] = components[2] * 255;
        data[3] = alpha != null ? alpha * 255 : 255;
        ctx.putImageData(imageData, point.x, point.y);
    },

    /**
     * Clears the image, if it is backed by a canvas.
     */
    clear: function() {
        var size = this._size;
        this.getContext(true).clearRect(0, 0, size.width + 1, size.height + 1);
    },

    // DOCS: document Raster#createImageData
    /**
     * {@grouptitle Image Data}
     * @param {Size} size
     * @return {ImageData}
     */
    createImageData: function(/* size */) {
        var size = Size.read(arguments);
        return this.getContext().createImageData(size.width, size.height);
    },

    // DOCS: document Raster#getImageData
    /**
     * @param {Rectangle} rect
     * @return {ImageData}
     */
    getImageData: function(/* rect */) {
        var rect = Rectangle.read(arguments);
        if (rect.isEmpty())
            rect = new Rectangle(this._size);
        return this.getContext().getImageData(rect.x, rect.y,
                rect.width, rect.height);
    },

    // DOCS: document Raster#putImageData
    /**
     * @param {ImageData} data
     * @param {Point} point
     */
    putImageData: function(data /*, point */) {
        var point = Point.read(arguments, 1);
        this.getContext(true).putImageData(data, point.x, point.y);
    },

    // DOCS: document Raster#setImageData
    /**
     * @param {ImageData} data
     */
    setImageData: function(data) {
        this.setSize(data);
        this.getContext(true).putImageData(data, 0, 0);
    },

    /**
     * {@grouptitle Event Handlers}
     *
     * The event handler function to be called when the underlying image has
     * finished loading and is ready to be used. This is also triggered when
     * the image is already loaded, or when a canvas is used instead of an
     * image.
     *
     * @name Raster#onLoad
     * @property
     * @type ?Function
     *
     * @example
     * var url = 'http://assets.paperjs.org/images/marilyn.jpg';
     * var raster = new Raster(url);
     *
     * // If you create a Raster using a url, you can use the onLoad
     * // handler to do something once it is loaded:
     * raster.onLoad = function() {
     *     console.log('The image has finished loading.');
     * };
     *
     * // As with all events in paper.js, you can also use this notation instead
     * // to install multiple handlers:
     * raster.on('load', function() {
     *     console.log('Now the image is definitely ready.');
     * });
     */

    /**
     *
     * The event handler function to be called when there is an error loading
     * the underlying image.
     *
     * @name Raster#onError
     * @property
     * @type ?Function
     */

    _getBounds: function(matrix, options) {
        var rect = new Rectangle(this._size).setCenter(0, 0);
        return matrix ? matrix._transformBounds(rect) : rect;
    },

    _hitTestSelf: function(point) {
        if (this._contains(point)) {
            var that = this;
            return new HitResult('pixel', that, {
                offset: point.add(that._size.divide(2)).round(),
                // Inject as Straps.js accessor, so #toString renders well too
                color: {
                    get: function() {
                        return that.getPixel(this.offset);
                    }
                }
            });
        }
    },

    _draw: function(ctx, param, viewMatrix) {
        var element = this.getElement();
        // Only draw if image is not empty (#1320).
        if (element && element.width > 0 && element.height > 0) {
            // Handle opacity for Rasters separately from the rest, since
            // Rasters never draw a stroke. See Item#draw().
            ctx.globalAlpha = Numerical.clamp(this._opacity, 0, 1);

            // Call _setStyles() to make sure shadow is drawn (#1437).
            this._setStyles(ctx, param, viewMatrix);

            // `Raster#smoothing` controlls both the `imageSmoothingQuality`
            // and `imageSmoothingEnabled` canvas context properties:
            var smoothing = this._smoothing,
                disabled = smoothing === 'off';
            DomElement.setPrefixed(
                ctx,
                disabled ? 'imageSmoothingEnabled' : 'imageSmoothingQuality',
                disabled ? false : smoothing
            );

            ctx.drawImage(element,
                    -this._size.width / 2, -this._size.height / 2);
        }
    },

    _canComposite: function() {
        return true;
    }
});

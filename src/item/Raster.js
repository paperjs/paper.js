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
    _boundsGetter: 'getBounds',
    _boundsSelected: true,
    _serializeFields: {
        crossOrigin: null, // NOTE: Needs to be set before source to work!
        source: null
    },

    // TODO: Implement type, width, height.
    // TODO: Have PlacedSymbol & Raster inherit from a shared class?
    /**
     * Creates a new raster item from the passed argument, and places it in the
     * active layer. {@code object} can either be a DOM Image, a Canvas, or a
     * string describing the URL to load the image from, or the ID of a DOM
     * element to get the image from (either a DOM Image or a Canvas).
     *
     * @param {HTMLImageElement|HTMLCanvasElement|String} [source] the source of
     * the raster
     * @param {Point} [position] the center position at which the raster item is
     * placed
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
    initialize: function Raster(object, position) {
        // Support two forms of item initialization: Passing one object literal
        // describing all the different properties to be set, or an image
        // (object) and a point where it should be placed (point).
        // If _initialize can set properties through object literal, we're done.
        // Otherwise we need to check the type of object:
        if (!this._initialize(object,
                position !== undefined && Point.read(arguments, 1))) {
            if (typeof object === 'string') {
                // Both data-urls and normal urls are supported here!
                this.setSource(object);
            } else {
                // #setImage() handles both canvas and image types.
                this.setImage(object);
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

    clone: function(insert) {
        var copy = new Raster(Item.NO_INSERT),
            image = this._image,
            canvas = this._canvas;
        if (image) {
            copy.setImage(image);
        } else if (canvas) {
            // If the Raster contains a Canvas object, we need to create a new
            // one and draw this raster's canvas on it.
            var copyCanvas = CanvasProvider.getCanvas(this._size);
            copyCanvas.getContext('2d').drawImage(canvas, 0, 0);
            copy.setImage(copyCanvas);
        }
        copy._crossOrigin = this._crossOrigin;
        return this._clone(copy, insert);
    },

    /**
     * The size of the raster in pixels.
     *
     * @type Size
     * @bean
     */
    getSize: function() {
        var size = this._size;
        return new LinkedSize(size ? size.width : 0, size ? size.height : 0,
                this, 'setSize');
    },

    setSize: function(/* size */) {
        var size = Size.read(arguments);
        if (!size.equals(this._size)) { // NOTE: this._size could be null
            if (size.width > 0 && size.height > 0) {
                // Get reference to image before changing canvas.
                var element = this.getElement();
                // NOTE: Setting canvas internally sets _size.
                // NOTE: No need to release previous canvas as #setImage() does.
                this.setImage(CanvasProvider.getCanvas(size));
                // Draw element back onto new canvas.
                if (element)
                    this.getContext(true).drawImage(element, 0, 0,
                            size.width, size.height);
            } else {
                // 0-width / height dimensions do not require the creation of
                // an internal canvas. Just reflect the size for now.
                if (this._canvas)
                    CanvasProvider.release(this._canvas);
                this._size = size.clone();
            }
        }
    },

    /**
     * The width of the raster in pixels.
     *
     * @type Number
     * @bean
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
     * @type Number
     * @bean
     */
    getHeight: function() {
        return this._size ? this._size.height : 0;
    },

    setHeight: function(height) {
        this.setSize(this.getWidth(), height);
    },

    isEmpty: function() {
        var size = this._size;
        return !size || size.width === 0 && size.height === 0;
    },

    /**
     * The resolution of the raster at its current size, in PPI (pixels per
     * inch).
     *
     * @type Size
     * @bean
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
     * @deprecated use {@link #getResolution()} instead.
     */
    getPpi: '#getResolution',

    /**
     * The HTMLImageElement of the raster, if one is associated.
     *
     * @type HTMLImageElement|Canvas
     * @bean
     */
    getImage: function() {
        return this._image;
    },

    setImage: function(image) {
        if (this._canvas)
            CanvasProvider.release(this._canvas);
        // Due to similarities, we can handle both canvas and image types here.
        if (image && image.getContext) {
            // A canvas object
            this._image = null;
            this._canvas = image;
            this._loaded = true;
        } else {
            // A image object
            this._image = image;
            this._canvas = null;
            this._loaded = image && image.complete;
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
     * case {@code null} is returned instead.
     *
     * @type Canvas
     * @bean
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
     * @type Context
     * @bean
     */
    getContext: function(modify) {
        if (!this._context)
            this._context = this.getCanvas().getContext('2d');
        // Support a hidden parameter that indicates if the context will be used
        // to modify the Raster object. We can notify such changes ahead since
        // they are only used afterwards for redrawing.
        if (modify) {
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
        return this._image && this._image.src || this.toDataURL();
    },

    setSource: function(src) {
        var that = this,
            crossOrigin = this._crossOrigin,
            image;

        function loaded() {
            var view = that.getView();
            if (view) {
                paper = view._scope;
                that.setImage(image);
                that.emit('load');
                view.update();
            }
        }

/*#*/ if (__options.environment == 'browser') {
        // src can be an URL or a DOM ID to load the image from
        image = document.getElementById(src) || new Image();
        if (crossOrigin)
            image.crossOrigin = crossOrigin;
        // IE has naturalWidth / Height defined, but width / height set to 0
        // when the image is invisible in the document.
        if (image.naturalWidth && image.naturalHeight) {
            // Emit load event with a delay, so behavior is the same as when
            // it's actually loaded and we give the code time to install event.
            setTimeout(loaded, 0);
        } else {
            // Trigger the load event on the image once it's loaded
            DomEvent.add(image, { load: loaded });
            // A new image created above? Set the source now.
            if (!image.src)
                image.src = src;
        }
        this.setImage(image);
/*#*/ } else if (__options.environment == 'node') {
        image = new Image();
        if (crossOrigin)
            image.crossOrigin = crossOrigin;
        // If we're running on the server and it's a string,
        // check if it is a data URL
        if (/^data:/.test(src)) {
            // Preserve the data in this._data since canvas-node eats it.
            // TODO: Fix canvas-node instead
            image.src = this._data = src;
            // Emit load event with a delay, so behavior is the same as when
            // it's actually loaded and we give the code time to install event.
            setTimeout(loaded, 0);
        } else if (/^https?:\/\//.test(src)) {
            // Load it from remote location:
            require('request').get({
                url: src,
                encoding: null // So the response data is a Buffer
            }, function (err, response, data) {
                if (err)
                    throw err;
                if (response.statusCode == 200) {
                    image.src = this._data = data;
                    loaded();
                }
            });
        } else {
            // Load it from disk:
            require('fs').readFile(src, function (err, data) {
                if (err)
                    throw err;
                image.src = this._data = data;
                loaded();
            });
        }
        this.setImage(image);
/*#*/ } // __options.environment == 'node'
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
        return this._image && this._image.crossOrigin || this._crossOrigin || '';
    },

    setCrossOrigin: function(crossOrigin) {
        this._crossOrigin = crossOrigin;
        if (this._image)
            this._image.crossOrigin = crossOrigin;
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
     * @return {Canvas} the sub image as a Canvas object
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
        raster.setImage(this.getSubCanvas(rect));
        raster.translate(rect.getCenter().subtract(this.getSize().divide(2)));
        raster._matrix.preConcatenate(this._matrix);
        raster.insertAbove(this);
        return raster;
    },

    /**
     * Returns a Base 64 encoded {@code data:} URL representation of the raster.
     *
     * @param {options} options for converting to DataURL.
     *
     * @return {String}
     */
    toDataURL: function(options) {
        options = options || {};
        
        // See if the linked image is base64 encoded already, if so reuse it,
        // otherwise try using canvas.toDataURL()
/*#*/ if (__options.environment == 'node') {
        if (this._data) {
            if (this._data instanceof Buffer)
                this._data = this._data.toString('base64');
            return this._data;
        }
/*#*/ } else {
        var src = this._image && this._image.src;
        if (/^data:/.test(src))
            return src;
/*#*/ }
        var canvas = this.getCanvas();
        
        if (!options.quality) {
            //default quality used by most browsers
            options.quality = 0.92;
        }
        
        if (options.type) {
            if ((options.type !== "image/jpeg") && (options.type !== "image/png")) {
                //Default to image/png if options.type is an unknown type
                options.type = "image/png";
            }
            
            return canvas ? canvas.toDataURL(options.type, options.quality) : null;
        } else {
            return canvas ? canvas.toDataURL() : null;
        }
    },

    /**
     * Draws an image on the raster.
     *
     * @param {HTMLImageELement|Canvas} image
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
        } else if (object.width) {
            bounds = new Rectangle(object);
        } else if (object.x) {
            // Create a rectangle of 1px size around the specified coordinates
            bounds = new Rectangle(object.x - 0.5, object.y - 0.5, 1, 1);
        }
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
     * @param x the x offset of the pixel in pixel coordinates
     * @param y the y offset of the pixel in pixel coordinates
     * @return {Color} the color of the pixel
     */
    /**
     * Gets the color of a pixel in the raster.
     *
     * @name Raster#getPixel
     * @function
     * @param point the offset of the pixel as a point in pixel coordinates
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
     * @param x the x offset of the pixel in pixel coordinates
     * @param y the y offset of the pixel in pixel coordinates
     * @param color the color that the pixel will be set to
     */
    /**
     * Sets the color of the specified pixel to the specified color.
     *
     * @name Raster#setPixel
     * @function
     * @param point the offset of the pixel as a point in pixel coordinates
     * @param color the color that the pixel will be set to
     */
    setPixel: function(/* point, color */) {
        var point = Point.read(arguments),
            color = Color.read(arguments),
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

    // DOCS: document Raster#setImageData
    /**
     * @param {ImageData} data
     * @param {Point} point
     */
    setImageData: function(data /*, point */) {
        var point = Point.read(arguments, 1);
        this.getContext(true).putImageData(data, point.x, point.y);
    },

    _getBounds: function(getter, matrix) {
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

    _draw: function(ctx) {
        var element = this.getElement();
        if (element) {
            // Handle opacity for Rasters separately from the rest, since
            // Rasters never draw a stroke. See Item#draw().
            ctx.globalAlpha = this._opacity;
            ctx.drawImage(element,
                    -this._size.width / 2, -this._size.height / 2);
        }
    },

    _canComposite: function() {
        return true;
    }
});

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
 * @name PaperScope
 *
 * @class The {@code PaperScope} class represents the scope associated with a
 * Paper context. When working with PaperScript, these scopes are automatically
 * created for us, and through clever scoping the properties and methods of the
 * active scope seem to become part of the global scope.
 *
 * When working with normal JavaScript code, {@code PaperScope} objects need to
 * be manually created and handled.
 *
 * Paper classes can only be accessed through {@code PaperScope} objects. Thus
 * in PaperScript they are global, while in JavaScript, they are available on
 * the global {@link paper} object. For JavaScript you can use
 * {@link PaperScope#install(scope) } to install the Paper classes and objects
 * on the global scope. Note that when working with more than one scope, this
 * still works for classes, but not for objects like {@link PaperScope#project},
 * since they are not updated in the injected scope if scopes are switched.
 *
 * The global {@link paper} object is simply a reference to the currently active
 * {@code PaperScope}.
 */
var PaperScope = Base.extend(/** @lends PaperScope# */{
    _class: 'PaperScope',

    /**
     * Creates a PaperScope object.
     *
     * @name PaperScope#initialize
     * @function
     */
    // DOCS: initialize() parameters
    initialize: function PaperScope() {
        // element is only used internally when creating scopes for PaperScript.
        // Whenever a PaperScope is created, it automatically becomes the active
        // one.
        paper = this;
        // Default configurable settings.
        this.settings = new Base({
            applyMatrix: true,
            handleSize: 4,
            hitTolerance: 0
        });
        this.project = null;
        this.projects = [];
        this.tools = [];
        this.palettes = [];
        // Assign a unique id to each scope .
        this._id = PaperScope._id++;
        PaperScope._scopes[this._id] = this;
        var proto = PaperScope.prototype;
        if ( noCanvas ) {
            return;
        }
        if (!this.support) {
            // Set up paper.support, as an object containing properties that
            // describe the support of various features.
            var ctx = CanvasProvider.getContext(1, 1);
            proto.support = {
                nativeDash: 'setLineDash' in ctx || 'mozDash' in ctx,
                nativeBlendModes: BlendMode.nativeModes
            };
            CanvasProvider.release(ctx);
        }

/*#*/ if (__options.environment == 'browser') {
        if (!this.browser) {
            var browser = proto.browser = {};
            // Use replace() to get all matches, and deal with Chrome/Webkit
            // overlap:
            // TODO: Do we need Mozilla next to Firefox? Other than the
            // different treatment of the Chrome/Webkit overlap
            // here: { chrome: true, webkit: false }, mozilla missing is the
            // only difference to jQuery.browser
            navigator.userAgent.toLowerCase().replace(
                /(opera|chrome|safari|webkit|firefox|msie|trident)\/?\s*([.\d]+)(?:.*version\/([.\d]+))?(?:.*rv\:([.\d]+))?/g,
                function(all, n, v1, v2, rv) {
                    // Do not set additional browsers once chrome is detected.
                    if (!browser.chrome) {
                        var v = n === 'opera' ? v2 : v1;
                        if (n === 'trident') {
                            // Use rv: and rename to msie
                            v = rv;
                            n = 'msie';
                        } 
                        browser.version = v;
                        browser.versionNumber = parseFloat(v);
                        browser.name = n;
                        browser[n] = true;
                    }
                }
            );
            if (browser.chrome)
                delete browser.webkit;
        }
/*#*/ } // __options.environment == 'browser'
    },

    /**
     * The version of Paper.js, as a string.
     *
     * @type String
     */
    version: '/*#=*/__options.version',

    // DOCS: PaperScope#settings
    /**
     * Gives access to paper's configurable settings.
     *
     * @name PaperScope#settings
     * @type Object
     *
     * @option settings.applyMatrix {Boolean}
     * @option settings.handleSize {Number}
     * @option settings.hitTolerance {Number}
     */

    /**
     * The currently active project.
     * @name PaperScope#project
     * @type Project
     */

    /**
     * The list of all open projects within the current Paper.js context.
     * @name PaperScope#projects
     * @type Project[]
     */

    /**
     * The reference to the active project's view.
     * @type View
     * @bean
     */
    getView: function() {
        return this.project && this.project.getView();
    },

    /**
     * The reference to the active tool.
     * @name PaperScope#tool
     * @type Tool
     */

    /**
     * The list of available tools.
     * @name PaperScope#tools
     * @type Tool[]
     */

    /**
     * A reference to the local scope. This is required, so `paper` will always
     * refer to the local scope, even when calling into it from another scope.
     * `paper.activate();` will have to be called in such a situation.
     * @type PaperScript
     * @private
     * @bean
     */
    getPaper: function() {
        return this;
    },

    execute: function(code, url, options) {
        paper.PaperScript.execute(code, this, url, options);
        View.updateFocus();
    },

    /**
     * Injects the paper scope into any other given scope. Can be used for
     * examle to inject the currently active PaperScope into the window's global
     * scope, to emulate PaperScript-style globally accessible Paper classes and
     * objects.
     *
     * <b>Please note:</b> Using this method may override native constructors
     * (e.g. Path, RGBColor). This may cause problems when using Paper.js in
     * conjunction with other libraries that rely on these constructors. Keep
     * the library scoped if you encounter issues caused by this.
     *
     * @example
     * paper.install(window);
     */
    install: function(scope) {
        // Define project, view and tool as getters that redirect to these
        // values on the PaperScope, so they are kept up to date
        var that = this;
        Base.each(['project', 'view', 'tool'], function(key) {
            Base.define(scope, key, {
                configurable: true,
                get: function() {
                    return that[key];
                }
            });
        });
        // Copy over all fields from this scope to the destination.
        // Do not use Base.each, since we also want to enumerate over
        // fields on PaperScope.prototype, e.g. all classes
        for (var key in this)
            // Exclude all 'hidden' fields
            if (!/^_/.test(key) && this[key])
                scope[key] = this[key];
    },

    /**
     * Sets up an empty project for us. If a canvas is provided, it also creates
     * a {@link View} for it, both linked to this scope.
     *
     * @param {HTMLCanvasElement|String} element the HTML canvas element this
     * scope should be associated with, or an ID string by which to find the
     * element.
     */
    setup: function(element) {
        // Make sure this is the active scope, so the created project and view
        // are automatically associated with it.
        paper = this;
        // Create an empty project for the scope.
        this.project = new Project(element);
        // This is needed in PaperScript.load().
        return this;
    },

    /**
     * Activates this PaperScope, so all newly created items will be placed
     * in its active project.
     */
    activate: function() {
        paper = this;
    },

    clear: function() {
        // Remove all projects, views and tools.
        // This also removes the installed event handlers.
        for (var i = this.projects.length - 1; i >= 0; i--)
            this.projects[i].remove();
        for (var i = this.tools.length - 1; i >= 0; i--)
            this.tools[i].remove();
        for (var i = this.palettes.length - 1; i >= 0; i--)
            this.palettes[i].remove();
    },

    remove: function() {
        this.clear();
        delete PaperScope._scopes[this._id];
    },

    statics: new function() {
        // Produces helpers to e.g. check for both 'canvas' and
        // 'data-paper-canvas' attributes:
        function handleAttribute(name) {
            name += 'Attribute';
            return function(el, attr) {
                return el[name](attr) || el[name]('data-paper-' + attr);
            };
        }

        return /** @lends PaperScope */{
            _scopes: {},
            _id: 0,

            /**
             * Retrieves a PaperScope object with the given scope id.
             *
             * @param id
             */
            get: function(id) {
                return this._scopes[id] || null;
            },

            getAttribute: handleAttribute('get'),
            hasAttribute: handleAttribute('has')
        };
    }
});

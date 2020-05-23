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
 * @name PaperScript
 * @namespace
 */
Base.exports.PaperScript = function() {
    // `this` == global scope, as the function is called with `.call(this);`
    var global = this,
        // See if there is a global Acorn in the browser already.
        acorn = global.acorn;
    // Also try importing an outside version of Acorn.
    if (!acorn && typeof require !== 'undefined') {
        try { acorn = require('acorn'); } catch(e) {}
    }
    // If no Acorn was found, load the bundled version.
    if (!acorn) {
        // Provide our own local exports and module object so that Acorn gets
        // assigned to it and ends up in the local acorn object.
        var exports, module;
        acorn = exports = module = {};
/*#*/ include('../../node_modules/acorn/acorn.js', { exports: false });
        // Clear object again if it wasn't loaded here; for load.js, see below.
        if (!acorn.version)
            acorn = null;
    }

    function parse(code, options) {
        // NOTE: When using load.js, Acorn will end up in global.acorn and will
        // not be immediately available, so we need to check for it here again.
        // We also give global.acorn the preference over the bundled one, so
        // people can load their own preferred version in sketch.paperjs.org
        return (global.acorn || acorn).parse(code, options);
    }

    // Operators to overload

    var binaryOperators = {
        // The hidden math methods are to be injected specifically, see below.
        '+': '__add',
        '-': '__subtract',
        '*': '__multiply',
        '/': '__divide',
        '%': '__modulo',
        '==': '__equals',
        '!=': '__equals'
    };

    var unaryOperators = {
        '-': '__negate',
        '+': '__self'
    };

    // Inject underscored math methods as aliases to Point, Size and Color.
    var fields = Base.each(
        ['add', 'subtract', 'multiply', 'divide', 'modulo', 'equals', 'negate'],
        function(name) {
            // Create an alias for each math method to be injected into the
            // classes using Straps.js' #inject()
            this['__' + name] = '#' + name;
        },
        {
            // Needed for '+' unary operator:
            __self: function() {
                return this;
            }
        }
    );
    Point.inject(fields);
    Size.inject(fields);
    Color.inject(fields);

    // Use very short name for the binary operator (__$__) as well as the
    // unary operator ($__), as operations will be replaced with then.
    // The underscores stands for the values, and the $ for the operators.

    // Binary Operator Handler
    function __$__(left, operator, right) {
        var handler = binaryOperators[operator];
        if (left && left[handler]) {
            var res = left[handler](right);
            return operator === '!=' ? !res : res;
        }
        switch (operator) {
        case '+': return left + right;
        case '-': return left - right;
        case '*': return left * right;
        case '/': return left / right;
        case '%': return left % right;
        case '==': return left == right;
        case '!=': return left != right;
        }
    }

    // Unary Operator Handler
    function $__(operator, value) {
        var handler = unaryOperators[operator];
        if (value && value[handler])
            return value[handler]();
        switch (operator) {
        case '+': return +value;
        case '-': return -value;
        }
    }

    // AST Helpers

    /**
     * Compiles PaperScript code into JavaScript code.
     *
     * @name PaperScript.compile
     * @function
     *
     * @option options.url {String} the url of the source, for source-map
     *     generation
     * @option options.source {String} the source to be used for the source-
     *     mapping, in case the code that's passed in has already been mingled.
     *
     * @param {String} code the PaperScript code
     * @param {Object} [options] the compilation options
     * @return {Object} an object holding the compiled PaperScript translated
     *     into JavaScript code along with source-maps and other information.
     */
    function compile(code, options) {
        if (!code)
            return '';
        options = options || {};
        // Use Acorn or Esprima to translate the code into an AST structure
        // which is then walked and parsed for operators to overload. Instead of
        // modifying the AST and translating it back to code, we directly change
        // the source code based on the parser's range information, to preserve
        // line-numbers in syntax errors and remove the need for Escodegen.

        // Track code insertions so their differences can be added to the
        // original offsets.
        var insertions = [];

        // Converts an original offset to the one in the current state of the
        // modified code.
        function getOffset(offset) {
            // Add all insertions before this location together to calculate
            // the current offset
            for (var i = 0, l = insertions.length; i < l; i++) {
                var insertion = insertions[i];
                if (insertion[0] >= offset)
                    break;
                offset += insertion[1];
            }
            return offset;
        }

        // Returns the node's code as a string, taking insertions into account.
        function getCode(node) {
            return code.substring(getOffset(node.range[0]),
                    getOffset(node.range[1]));
        }

        // Returns the code between two nodes, e.g. an operator and white-space.
        function getBetween(left, right) {
            return code.substring(getOffset(left.range[1]),
                    getOffset(right.range[0]));
        }

        // Replaces the node's code with a new version and keeps insertions
        // information up-to-date.
        function replaceCode(node, str) {
            var start = getOffset(node.range[0]),
                end = getOffset(node.range[1]),
                insert = 0;
            // Sort insertions by their offset, so getOffset() can do its thing
            for (var i = insertions.length - 1; i >= 0; i--) {
                if (start > insertions[i][0]) {
                    insert = i + 1;
                    break;
                }
            }
            insertions.splice(insert, 0, [start, str.length - end + start]);
            code = code.substring(0, start) + str + code.substring(end);
        }

        function handleOverloading(node, parent) {
			switch (node.type) {
            case 'UnaryExpression': // -a
                if (node.operator in unaryOperators
                        && node.argument.type !== 'Literal') {
                    var arg = getCode(node.argument);
                    replaceCode(node, '$__("' + node.operator + '", '
                            + arg + ')');
                }
                break;
            case 'BinaryExpression': // a + b, a - b, a / b, a * b, a == b, ...
                if (node.operator in binaryOperators
                        && node.left.type !== 'Literal') {
                    var left = getCode(node.left),
                        right = getCode(node.right),
                        between = getBetween(node.left, node.right),
                        operator = node.operator;
                    replaceCode(node, '__$__(' + left + ','
                            // To preserve line-breaks, get the code in between
                            // left & right, and replace the occurrence of the
                            // operator with its string counterpart:
                            + between.replace(new RegExp('\\' + operator),
                                '"' + operator + '"')
                            + ', ' + right + ')');
                }
                break;
            case 'UpdateExpression': // a++, a--, ++a, --a
            case 'AssignmentExpression': /// a += b, a -= b
                var parentType = parent && parent.type;
                if (!(
                        // Filter out for statements to allow loop increments
                        // to perform well
                        parentType === 'ForStatement'
                        // We need to filter out parents that are comparison
                        // operators, e.g. for situations like `if (++i < 1)`,
                        // as we can't replace that with
                        // `if (__$__(i, "+", 1) < 1)`
                        // Match any operator beginning with =, !, < and >.
                        || parentType === 'BinaryExpression'
                            && /^[=!<>]/.test(parent.operator)
                        // array[i++] is a MemberExpression with computed = true
                        // We can't replace that with array[__$__(i, "+", 1)].
                        || parentType === 'MemberExpression' && parent.computed
                )) {
                    if (node.type === 'UpdateExpression') {
                        var arg = getCode(node.argument),
                            exp = '__$__(' + arg + ', "' + node.operator[0]
                                    + '", 1)',
                            str = arg + ' = ' + exp;
                        if (node.prefix) {
                            // A prefixed update expression (++a / --a),
                            // wrap expression in paranthesis. See #1611
                            str = '(' + str + ')';
                        } else if (
                            // A suffixed update expression (a++, a--),
                            // assign the old value before updating it.
                            // See #691, #1450
                            parentType === 'AssignmentExpression' ||
                            parentType === 'VariableDeclarator' ||
                            parentType === 'BinaryExpression'
                        ) {
                            // Handle special case where the old value is
                            // assigned to itself, and the expression is just
                            // executed after, e.g.: `var x = ***; x = x++;`
                            if (getCode(parent.left || parent.id) === arg)
                                str = exp;
                            str = arg + '; ' + str;
                        }
                        replaceCode(node, str);
                    } else { // AssignmentExpression
                        if (/^.=$/.test(node.operator)
                                && node.left.type !== 'Literal') {
                            var left = getCode(node.left),
                                right = getCode(node.right),
                                exp = left + ' = __$__(' + left + ', "'
                                    + node.operator[0] + '", ' + right + ')';
                            // If the original expression is wrapped in
                            // parenthesis, do the same with the replacement:
                            replaceCode(node, /^\(.*\)$/.test(getCode(node))
                                    ? '(' + exp + ')' : exp);
                        }
                    }
                }
                break;
            }
        }

        function handleExports(node) {
			switch (node.type) {
            case 'ExportDefaultDeclaration':
                // Convert `export default` to `module.exports = ` statements:
                replaceCode({
                    range: [node.start, node.declaration.start]
                }, 'module.exports = ');
                break;
            case 'ExportNamedDeclaration':
                // Convert named exports to `module.exports.NAME = NAME;`
                // statements both for new declarations and existing specifiers:
                var declaration = node.declaration;
                var specifiers = node.specifiers;
                if (declaration) {
                    var declarations = declaration.declarations;
                    if (declarations) {
                        declarations.forEach(function(dec) {
                            replaceCode(dec, 'module.exports.' + getCode(dec));
                        });
                        replaceCode({
                            range: [
                                node.start,
                                declaration.start + declaration.kind.length
                            ]
                        }, '');
                    }
                } else if (specifiers) {
                    var exports = specifiers.map(function(specifier) {
                        var name = getCode(specifier);
                        return 'module.exports.' + name + ' = ' + name + '; ';
                    }).join('');
                    if (exports) {
                        replaceCode(node, exports);
                    }
                }
                break;
            }
        }

        // Recursively walks the AST and replaces the code of certain nodes
        function walkAST(node, parent, paperFeatures) {
            if (node) {
                // The easiest way to walk through the whole AST is to simply
                // loop over each property of the node and filter out fields we
                // don't need to consider...
                for (var key in node) {
                    if (key !== 'range' && key !== 'loc') {
                        var value = node[key];
                        if (Array.isArray(value)) {
                            for (var i = 0, l = value.length; i < l; i++) {
                                walkAST(value[i], node, paperFeatures);
                            }
                        } else if (value && typeof value === 'object') {
                            // Don't use Base.isPlainObject() for these since
                            // Acorn.js uses its own internal prototypes now.
                            walkAST(value, node, paperFeatures);
                        }
                    }
                }
                if (paperFeatures.operatorOverloading !== false) {
                    handleOverloading(node, parent);
                }
                if (paperFeatures.moduleExports !== false) {
                    handleExports(node);
                }
            }
        }

        // Source-map support:
        // Encodes a Variable Length Quantity as a Base64 string.
        // See: https://www.html5rocks.com/en/tutorials/developertools/sourcemaps/
        function encodeVLQ(value) {
            var res = '',
                base64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
            value = (Math.abs(value) << 1) + (value < 0 ? 1 : 0);
            while (value || !res) {
                var next = value & (32 - 1);
                value >>= 5;
                if (value)
                    next |= 32;
                res += base64[next];
            }
            return res;
        }

        var url = options.url || '',
            sourceMaps = options.sourceMaps,
            paperFeatures = options.paperFeatures || {},
            // Include the original code in the sourceMap if there is no linked
            // source file so the debugger can still display it correctly.
            source = options.source || code,
            offset = options.offset || 0,
            agent = paper.agent,
            version = agent.versionNumber,
            offsetCode = false,
            lineBreaks = /\r\n|\n|\r/mg,
            map;
        // TODO: Verify these browser versions for source map support, and check
        // other browsers.
        if (sourceMaps && (agent.chrome && version >= 30
                || agent.webkit && version >= 537.76 // >= Safari 7.0.4
                || agent.firefox && version >= 23
                || agent.node)) {
            if (agent.node) {
                // -2 required to remove function header:
                // https://code.google.com/p/chromium/issues/detail?id=331655
                offset -= 2;
            } else if (window && url && !window.location.href.indexOf(url)) {
                // If the code stems from the actual html page, determine the
                // offset of inlined code.
                var html = document.getElementsByTagName('html')[0].innerHTML;
                // Count the amount of line breaks in the html before this code
                // to determine the offset.
                offset = html.substr(0, html.indexOf(code) + 1).match(
                        lineBreaks).length + 1;
            }
            // A hack required by older versions of browsers to align inlined
            // code: Instead of starting the mappings at the given offset, we
            // have to shift the actual code down to the place in the original
            // file, as source-map support seems incomplete in these browsers.
            offsetCode = offset > 0 && !(
                    agent.chrome && version >= 36 ||
                    agent.safari && version >= 600 ||
                    agent.firefox && version >= 40 ||
                    agent.node);
            var mappings = ['AA' + encodeVLQ(offsetCode ? 0 : offset) + 'A'];
            // Create empty entries by the amount of lines + 1, so join can be
            // used below to produce the actual instructions that many times.
            mappings.length = (code.match(lineBreaks) || []).length + 1
                    + (offsetCode ? offset : 0);
            map = {
                version: 3,
                file: url,
                names:[],
                // Since PaperScript doesn't actually change the offsets between
                // the lines of the original code, all that is required is a
                // mappings string that increments by one between each line.
                // AACA is the instruction to increment the line by one.
                // TODO: Add support for column offsets!
                mappings: mappings.join(';AACA'),
                sourceRoot: '',
                sources: [url],
                sourcesContent: [source]
            };
        }
        if (
            paperFeatures.operatorOverloading !== false ||
            paperFeatures.moduleExports !== false
        ) {
            // Now do the parsing magic
            walkAST(parse(code, {
                ranges: true,
                preserveParens: true,
                sourceType: 'module'
            }), null, paperFeatures);
        }
        if (map) {
            if (offsetCode) {
                // Adjust the line offset of the resulting code if required.
                // This is part of a browser hack, see above.
                code = new Array(offset + 1).join('\n') + code;
            }
            if (/^(inline|both)$/.test(sourceMaps)) {
                code += "\n//# sourceMappingURL=data:application/json;base64,"
                        + self.btoa(unescape(encodeURIComponent(
                            JSON.stringify(map))));
            }
            code += "\n//# sourceURL=" + (url || 'paperscript');
        }
        return {
            url: url,
            source: source,
            code: code,
            map: map
        };
    }

    /**
     * Compiles the PaperScript code into a compiled function and executes it.
     * The compiled function receives all properties of the passed {@link
     * PaperScope} as arguments, to emulate a global scope with unaffected
     * performance. It also installs global view and tool handlers automatically
     * on the respective objects.
     *
     * @name PaperScript.execute
     * @function
     *
     * @option options.url {String} the url of the source, for source-map
     *     generation
     * @option options.source {String} the source to be used for the source-
     *     mapping, in case the code that's passed in has already been mingled.
     *
     * @param {String} code the PaperScript code
     * @param {PaperScope} scope the scope for which the code is executed
     * @param {Object} [options] the compilation options
     * @return {Object} the exports defined in the executed code
     */
    function execute(code, scope, options) {
        // Set currently active scope.
        paper = scope;
        var view = scope.getView(),
            // Only create a tool if the tool object is accessed or something
            // resembling a global tool handler is contained in the code, but
            // no tool objects are actually created.
            tool = /\btool\.\w+|\s+on(?:Key|Mouse)(?:Up|Down|Move|Drag)\b/
                    .test(code) && !/\bnew\s+Tool\b/.test(code)
                        ? new Tool() : null,
            toolHandlers = tool ? tool._events : [],
            // Compile a list of all handlers that can be defined globally
            // inside the PaperScript. These are passed on to the function as
            // undefined arguments, so that their name exists, rather than
            // injecting a code line that defines them as variables. They are
            // exported again at the end of the function.
            handlers = ['onFrame', 'onResize'].concat(toolHandlers),
            // compile a list of parameter names for all variables that need to
            // appear as globals inside the script. At the same time, also
            // collect their values, so we can pass them on as arguments in the
            // function call.
            params = [],
            args = [],
            func,
            compiled = typeof code === 'object' ? code : compile(code, options);
        code = compiled.code;
        function expose(scope, hidden) {
            // Look through all enumerable properties on the scope and expose
            // these too as pseudo-globals, but only if they seem to be in use.
            for (var key in scope) {
                // Next to \b well also need to match \s and \W in the beginning
                // of $__, since $ is not part of \w. And that causes \b to not
                // match ^ longer, so include that specifically too.
                if ((hidden || !/^_/.test(key)) && new RegExp('([\\b\\s\\W]|^)'
                        + key.replace(/\$/g, '\\$') + '\\b').test(code)) {
                    params.push(key);
                    args.push(scope[key]);
                }
            }
        }
        expose({ __$__: __$__, $__: $__, paper: scope, tool: tool },
                true);
        expose(scope);
        // Add a fake `module.exports` object so PaperScripts can export things.
        code = 'var module = { exports: {} }; ' + code;
        // Finally define the handler variable names as parameters and compose
        // the string describing the properties for the returned exports object
        // at the end of the code execution, so we can retrieve their values
        // from the function call.
        var exports = Base.each(handlers, function(key) {
            // Check for each handler explicitly and only export them if they
            // seem to exist.
            if (new RegExp('\\s+' + key + '\\b').test(code)) {
                params.push(key);
                this.push('module.exports.' + key + ' = ' + key + ';');
            }
        }, []).join('\n');
        // Add the setting of the exported handlers to the end of the code.
        if (exports) {
            code += '\n' + exports;
        }
        // End by returning `module.exports` at the end of the generated code:
        code += '\nreturn module.exports;';
        var agent = paper.agent;
        if (document && (agent.chrome
                || agent.firefox && agent.versionNumber < 40)) {
            // On older Firefox, all error numbers inside dynamically compiled
            // code are relative to the line where the eval / compilation
            // happened. To fix this issue, we're temporarily inserting a new
            // script tag.
            // We also use this on Chrome to fix issues with compiled functions:
            // https://code.google.com/p/chromium/issues/detail?id=331655
            var script = document.createElement('script'),
                head = document.head || document.getElementsByTagName('head')[0];
            // Add a new-line before the code on Firefox since the error
            // messages appear to be aligned to line number 0...
            if (agent.firefox)
                code = '\n' + code;
            script.appendChild(document.createTextNode(
                'document.__paperscript__ = function(' + params + ') {' +
                    code +
                '\n}'
            ));
            head.appendChild(script);
            func = document.__paperscript__;
            delete document.__paperscript__;
            head.removeChild(script);
        } else {
            func = Function(params, code);
        }
        var exports = func && func.apply(scope, args);
        var obj = exports || {};
        // Now install the 'global' tool and view handlers, and we're done!
        Base.each(toolHandlers, function(key) {
            var value = obj[key];
            if (value)
                tool[key] = value;
        });
        if (view) {
            if (obj.onResize)
                view.setOnResize(obj.onResize);
            // Emit resize event directly, so any user
            // defined resize handlers are called.
            view.emit('resize', {
                size: view.size,
                delta: new Point()
            });
            if (obj.onFrame)
                view.setOnFrame(obj.onFrame);
            // Automatically request an update at the end. This is only needed
            // if the script does not actually produce anything yet, and the
            // used canvas contains previous content.
            view.requestUpdate();
        }
        return exports;
    }

    function loadScript(script) {
        // Only load this script if it not loaded already.
        // Support both text/paperscript and text/x-paperscript:
        if (/^text\/(?:x-|)paperscript$/.test(script.type)
                && PaperScope.getAttribute(script, 'ignore') !== 'true') {
            // Produce a new PaperScope for this script now. Scopes are cheap so
            // let's not worry about the initial one that was already created.
            // Define an id for each PaperScript, so its scope can be retrieved
            // through PaperScope.get().
            // If a canvas id is provided, pass it on to the PaperScope so a
            // project is created for it now.
            var canvasId = PaperScope.getAttribute(script, 'canvas'),
                canvas = document.getElementById(canvasId),
                // To avoid possible duplicate browser requests for PaperScript
                // files, support the data-src attribute as well as src:
                // TODO: Consider switching from data-paper- to data- prefix
                // in PaperScope.getAttribute() and use it here too:
                src = script.src || script.getAttribute('data-src'),
                async = PaperScope.hasAttribute(script, 'async'),
                scopeAttribute = 'data-paper-scope';
            if (!canvas)
                throw new Error('Unable to find canvas with id "'
                        + canvasId + '"');
            // See if there already is a scope for this canvas and reuse it, to
            // support multiple scripts per canvas. Otherwise create a new one.
            var scope = PaperScope.get(canvas.getAttribute(scopeAttribute))
                        || new PaperScope().setup(canvas);
            // Link the element to this scope, so we can reuse the scope when
            // compiling multiple scripts for the same element.
            canvas.setAttribute(scopeAttribute, scope._id);
            if (src) {
                // If we're loading from a source, request the source
                // synchronously to guarantee code is executed in the
                // same order the script tags appear.
                // If the async attribute is specified on the script element,
                // request the source asynchronously and execute as soon as
                // it is retrieved.
                Http.request({
                    url: src,
                    async: async,
                    mimeType: 'text/plain',
                    onLoad: function(code) {
                        execute(code, scope, src);
                    }
                });
            } else {
                // We can simply get the code form the script tag.
                execute(script.innerHTML, scope, script.baseURI);
            }
            // Mark script as loaded now.
            script.setAttribute('data-paper-ignore', 'true');
            return scope;
        }
    }

    function loadAll() {
        Base.each(document && document.getElementsByTagName('script'),
                loadScript);
    }

   /**
     * Loads, compiles and executes PaperScript code in the HTML document. Note
     * that this method is executed automatically for all scripts in the
     * document through a window load event. You can optionally call it earlier
     * (e.g. from a DOM ready event), or you can mark scripts to be ignored by
     * setting the attribute `ignore="true"` or `data-paper-ignore="true"`, and
     * call the `PaperScript.load(script)` method for each script separately
     * when needed.
     *
     * @name PaperScript.load
     * @function
     * @param {HTMLScriptElement} [script=null] the script to load. If none is
     *     provided, all scripts of the HTML document are iterated over and
     *     loaded
     * @return {PaperScope} the scope produced for the passed `script`, or
     *     `undefined` of multiple scripts area loaded
     */
    function load(script) {
        return script ? loadScript(script) : loadAll();
    }

    if (window) {
        // Catch cases where paper.js is loaded after the browser event has
        // already occurred.
        if (document.readyState === 'complete') {
            // Handle it asynchronously
            setTimeout(loadAll);
        } else {
            DomEvent.add(window, { load: loadAll });
        }
    }

    return {
        compile: compile,
        execute: execute,
        load: load,
        parse: parse,
        calculateBinary: __$__,
        calculateUnary: $__
    };
// Pass on `this` as the binding object, so we can reference Acorn both in
// development and in the built library.
}.call(this);

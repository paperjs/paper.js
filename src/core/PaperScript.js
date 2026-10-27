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
    // See if there is a global Acorn in the browser already.
    var acorn = self.acorn;
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
        // NOTE: When using load.js, Acorn will end up in self.acorn and will
        // not be immediately available, so we need to check for it here again.
        // We also give self.acorn the preference over the bundled one, so
        // people can load their own preferred version in sketch.paperjs.org
        var parser = self.acorn || acorn;
        // Acorn 8 and newer require ecmaVersion, and parse all current syntax
        // with 'latest', which the bundled version doesn't know:
        if (parseInt(parser.version, 10) >= 8)
            options = Base.set({ ecmaVersion: 'latest' }, options);
        return parser.parse(code, options);
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

    // Compound assignment of a property, which evaluates the object and the
    // key only once, e.g. for `array[index()] += 1`. Postfix updates such as
    // `array[index()]++` return the old value:
    function __$assign__(object, key, operator, value, postfix) {
        var old = object[key],
            res = object[key] = __$__(old, operator, value);
        return postfix ? old : res;
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
            // Add the changes of all replacements that end before this
            // location in the original code, to get its current offset:
            var current = offset;
            for (var i = 0, l = insertions.length; i < l; i++) {
                var insertion = insertions[i];
                if (insertion[1] <= offset)
                    current += insertion[2];
            }
            return current;
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
        // information up-to-date. Each insertion holds the original range of
        // the replaced code and the change in length, so the order of the
        // replacements doesn't matter. A replacement of code that contains
        // others takes their place:
        function replaceCode(node, str) {
            var range = node.range,
                start = getOffset(range[0]),
                end = getOffset(range[1]);
            insertions = insertions.filter(function(insertion) {
                return insertion[0] < range[0] || insertion[1] > range[1];
            });
            // Keep the replacement apart from the identifiers or keywords
            // that minified code may put right next to it, as in `return-1`:
            if (/[\w$]/.test(code.charAt(start - 1)) && /^[\w$]/.test(str))
                str = ' ' + str;
            if (/[\w$]/.test(code.charAt(end)) && /[\w$]$/.test(str))
                str += ' ';
            insertions.push([range[0], range[1],
                    str.length - range[1] + range[0]]);
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
                    var isUpdate = node.type === 'UpdateExpression',
                        target = isUpdate ? node.argument : node.left;
                    if (isUpdate || /^.=$/.test(node.operator)
                            && target.type !== 'Literal') {
                        var left = getCode(target),
                            right = isUpdate ? '1' : getCode(node.right),
                            operator = node.operator[0],
                            // The value of updates is used, except in
                            // statements and before the end of sequences:
                            isUsed = isUpdate && !(
                                parentType === 'ExpressionStatement' ||
                                parentType === 'SequenceExpression' &&
                                    node !== parent.expressions[
                                        parent.expressions.length - 1]
                            ),
                            // Postfix updates (a++, a--) result in the old
                            // value, see #691, #1450:
                            isPostfix = isUsed && !node.prefix,
                            // Assign properties through __$assign__(),
                            // which evaluates their object and key once,
                            // except for private ones and those of super:
                            member = target.type === 'MemberExpression'
                                && target.object.type !== 'Super'
                                && target.property.type
                                    !== 'PrivateIdentifier',
                            exp = member
                                ? '__$assign__(' + getCode(target.object)
                                    + ', ' + (target.computed
                                        ? getCode(target.property)
                                        : JSON.stringify(
                                            target.property.name))
                                    + ', "' + operator + '", ' + right
                                    + (isPostfix ? ', true' : '') + ')'
                                : left + ' = __$__(' + left + ', "'
                                    + operator + '", ' + right + ')';
                        if (isUsed && !member) {
                            // Turn the assignment into an expression of the
                            // new value, or of the old one before it, see
                            // #1611:
                            exp = isPostfix
                                ? '[' + left + ', ' + exp + '][0]'
                                : '(' + exp + ')';
                        }
                        // If the original expression is wrapped in
                        // parenthesis, do the same with the replacement:
                        replaceCode(node, /^\(.*\)$/.test(getCode(node))
                                ? '(' + exp + ')' : exp);
                    }
                }
                break;
            }
        }

        // Collects the names that a declaration's identifier or destructuring
        // pattern declares:
        function collectNames(node, names) {
            switch (node.type) {
            case 'Identifier':
                names.push(node.name);
                break;
            case 'ObjectPattern':
                node.properties.forEach(function(property) {
                    collectNames(property.value || property.argument, names);
                });
                break;
            case 'ArrayPattern':
                node.elements.forEach(function(element) {
                    if (element)
                        collectNames(element, names);
                });
                break;
            case 'AssignmentPattern':
                collectNames(node.left, names);
                break;
            case 'RestElement':
                collectNames(node.argument, names);
                break;
            }
        }

        // The number of modules imported with named specifiers, for the names
        // of the variables that hold them:
        var moduleCount = 0,
            // Whether the code exports with ES module syntax, to mark it so:
            isModule = false;

        // Static imports are turned into calls of __$import__(), which
        // execute() binds to the loader in options.load. `as` asks for the
        // module's 'default' export or its 'namespace', see __$import__(), and
        // the import attributes are passed on as an object:
        function getImport(node, as) {
            var attributes = node.attributes || [],
                args = [JSON.stringify(node.source.value)];
            if (as || attributes.length)
                args.push(as ? '"' + as + '"' : 'undefined');
            if (attributes.length) {
                var values = {};
                attributes.forEach(function(attribute) {
                    var key = attribute.key;
                    values[key.name || key.value] = attribute.value.value;
                });
                args.push(JSON.stringify(values));
            }
            return '__$import__(' + args.join(', ') + ')';
        }

        function handleModules(node) {
			switch (node.type) {
            case 'ImportExpression':
                // `import(specifier)` resolves to the module's namespace, as a
                // Promise, so a failed load rejects instead of throwing, and
                // `import(specifier, options)` passes on `options.with`:
                replaceCode(node, 'Promise.resolve().then(function() { '
                        + 'return __$import__(' + getCode(node.source)
                        + ', "dynamic"' + (node.options
                            ? ', (' + getCode(node.options) + ' || {}).with'
                            : '')
                        + '); })');
                break;
            case 'ImportDeclaration':
                // `import x from 'm'` assigns the module's default export,
                // `import * as x from 'm'` its namespace, and
                // `import { a, b as c } from 'm'` reads names from its exports:
                var module = getImport(node),
                    named = [];
                var vars = node.specifiers.map(function(specifier) {
                    var local = specifier.local.name;
                    if (specifier.type === 'ImportSpecifier') {
                        named.push(local + ' = ' + '__$module' + moduleCount
                                + '__.' + specifier.imported.name);
                        return null;
                    }
                    return local + ' = ' + getImport(node,
                            specifier.type === 'ImportDefaultSpecifier'
                                ? 'default' : 'namespace');
                }).filter(Boolean);
                if (named.length) {
                    vars.push('__$module' + moduleCount + '__ = ' + module);
                    Base.push(vars, named);
                    moduleCount++;
                }
                replaceCode(node, vars.length
                        ? 'var ' + vars.join(', ') + ';'
                        : module + ';');
                break;
            case 'ExportAllDeclaration':
                // `export * as x from 'm'`, and `export * from 'm'`, which
                // leaves out the default export, as in ES modules:
                isModule = true;
                replaceCode(node, node.exported
                        ? 'module.exports.' + node.exported.name + ' = '
                            + getImport(node, 'namespace') + ';'
                        : '(function(m) { for (var k in m) if (k !== '
                            + '"default") module.exports[k] = m[k]; })('
                            + getImport(node) + ');');
                break;
            case 'ExportDefaultDeclaration':
                // Convert `export default` to `module.exports.default = `,
                // next to the named exports:
                isModule = true;
                replaceCode({
                    range: [node.start, node.declaration.start]
                }, 'module.exports.default = ');
                break;
            case 'ExportNamedDeclaration':
                isModule = true;
                // Convert named exports to `module.exports.NAME = NAME;`
                // statements both for new declarations and existing specifiers:
                var declaration = node.declaration;
                var specifiers = node.specifiers;
                if (declaration) {
                    // Declare variables, functions and classes as they are,
                    // and export the declared names after:
                    var names = [];
                    if (declaration.declarations) {
                        declaration.declarations.forEach(function(dec) {
                            collectNames(dec.id, names);
                        });
                    } else {
                        names.push(declaration.id.name);
                    }
                    // Variable declarations may end without a semicolon,
                    // which the exports added after them need:
                    var code = getCode(declaration);
                    if (declaration.declarations && !/;\s*$/.test(code))
                        code += ';';
                    replaceCode(node, code + names.map(
                        function(name) {
                            return ' module.exports.' + name + ' = ' + name
                                    + ';';
                        }).join(''));
                } else if (specifiers) {
                    // `export { a, b as c }` exports the local names under
                    // the exported ones, and `export { a } from 'm'` those
                    // of another module:
                    var source = node.source && getImport(node) + '.';
                    var exports = specifiers.map(function(specifier) {
                        var local = specifier.local.name,
                            exported = specifier.exported.name;
                        return 'module.exports.' + exported + ' = '
                                + (source || '') + local + '; ';
                    }).join('');
                    if (exports) {
                        replaceCode(node, exports);
                    }
                }
                break;
            }
        }

        // The number of functions that walkAST() is inside of, to find
        // top-level `await`, which makes the whole script an async function:
        var functions = 0,
            isAsync = false;

        // Recursively walks the AST and replaces the code of certain nodes
        function walkAST(node, parent, paperFeatures) {
            if (node) {
                var isFunction = /Function/.test(node.type);
                if (isFunction)
                    functions++;
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
                if (isFunction)
                    functions--;
                if (!functions && (node.type === 'AwaitExpression'
                        || node.type === 'ForOfStatement' && node.await)) {
                    isAsync = true;
                }
                if (paperFeatures.operatorOverloading !== false) {
                    handleOverloading(node, parent);
                }
                if (paperFeatures.moduleExports !== false) {
                    handleModules(node);
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
                var html = document.getElementsByTagName('html')[0].innerHTML,
                    index = html.indexOf(code);
                // Count the amount of line breaks in the html before this code
                // to determine the offset, unless the script isn't in the html.
                if (index >= 0) {
                    offset = html.substr(0, index + 1).match(
                            lineBreaks).length + 1;
                }
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
            // Mark ES modules like Babel and TypeScript do, so importers can
            // tell their default export from CommonJS-style exports. Added on
            // a new line at the end, so the lines before keep their numbers:
            if (isModule) {
                code += '\nObject.defineProperty(module.exports, '
                        + '"__esModule", { value: true });';
            }
        }
        if (map) {
            if (offsetCode) {
                // Adjust the line offset of the resulting code if required.
                // This is part of a browser hack, see above.
                code = new Array(offset + 1).join('\n') + code;
            }
            if (/^(inline|both)$/.test(sourceMaps)) {
                // Split the string so tools don't take it for the source map
                // comment of this file:
                code += "\n//# " + "sourceMappingURL="
                        + "data:application/json;base64,"
                        + self.btoa(unescape(encodeURIComponent(
                            JSON.stringify(map))));
            }
            code += "\n//# sourceURL=" + (url || 'paperscript');
        }
        return {
            url: url,
            source: source,
            code: code,
            map: map,
            async: isAsync
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
     * @option options.handlers {String[]} the names of further global
     *     handlers to export next to `onFrame`, `onResize` and the tool's
     *     handlers, for hosts that call them themselves
     * @option options.load {Function} the loader for static `import`
     *     statements, called with the specifier as written, the `options.url`
     *     of the importing script, and the import attributes as an object,
     *     e.g. `{ type: 'paperscript' }` for `import x from 'm' with { type:
     *     'paperscript' }`, or `undefined` without them, and returning the
     *     module's exports, e.g. the result of executing it. Modules with ES
     *     `export` statements have their default export as `default` and are
     *     marked with `__esModule`, so `import x` receives the default export,
     *     and for CommonJS-style exports the whole exports. `import * as x`
     *     receives all exports, and for CommonJS-style exports, these as
     *     `default` too. Dynamic `import(specifier)` resolves to that
     *     namespace as a Promise, and its loader may return a Promise as well.
     *     `import(specifier, options)` passes on `options.with` as the
     *     attributes. The loader runs each module once and handles cycles.
     *     Parsing `import` requires a current Acorn as `self.acorn`
     *
     * Code with top-level `await` runs as an async function. `execute()` then
     * returns a Promise of the exports, and installs the global handlers once
     * it resolves. Parsing it requires a current Acorn as `self.acorn`.
     *
     * @param {String} code the PaperScript code
     * @param {PaperScope} scope the scope for which the code is executed
     * @param {Object} [options] the compilation options
     * @return {Object|Promise} the exports defined in the executed code, or
     *     with top-level `await`, a Promise of them
     */
    function execute(code, scope, options) {
        // Set currently active scope.
        paper = scope;
        var view = scope.getView(),
            // Only create a tool if the tool object is accessed or something
            // resembling a global tool handler is contained in the code, but
            // no tool objects are actually created.
            tool = new RegExp('\\btool\\.\\w+|\\s+(?:'
                    + Tool.prototype._events.join('|') + ')\\b').test(code)
                    && !/\bnew\s+Tool\b/.test(code)
                        ? new Tool() : null,
            toolHandlers = tool ? tool._events : [],
            // Compile a list of all handlers that can be defined globally
            // inside the PaperScript. These are passed on to the function as
            // undefined arguments, so that their name exists, rather than
            // injecting a code line that defines them as variables. They are
            // exported again at the end of the function.
            handlers = ['onFrame', 'onResize'].concat(toolHandlers,
                    options && options.handlers || []),
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
            // The inherited classes don't shadow existing globals, such as the
            // native Event, MouseEvent and Symbol, as PaperScope#install()
            // doesn't either, but fields set on the scope itself do, e.g. a
            // console that a host provides:
            for (var key in scope) {
                // Next to \b well also need to match \s and \W in the beginning
                // of $__, since $ is not part of \w. And that causes \b to not
                // match ^ longer, so include that specifically too.
                if ((hidden || !/^_/.test(key)
                        && (!(key in self) || scope.hasOwnProperty(key)))
                        && new RegExp('([\\b\\s\\W]|^)'
                        + key.replace(/\$/g, '\\$') + '\\b').test(code)) {
                    params.push(key);
                    args.push(scope[key]);
                }
            }
        }
        // Static imports call the loader that the host passes, see
        // handleModules():
        var load = options && options.load,
            url = options && options.url;
        function __$import__(specifier, as, attributes) {
            if (!load) {
                throw new Error('Unable to import \'' + specifier + '\': no '
                        + 'loader was passed to PaperScript.execute().');
            }
            var exports = load(specifier, url, attributes);
            // Dynamic imports may receive a Promise from the loader:
            return as === 'dynamic'
                    ? Promise.resolve(exports).then(function(exports) {
                        return getImported(exports, 'namespace');
                    })
                    : getImported(exports, as);
        }

        // ES modules have their default export as `default`, and their exports
        // as their namespace. CommonJS-style exports are the default export,
        // and also appear in the namespace, as in Node:
        function getImported(exports, as) {
            var isModule = exports && exports.__esModule;
            return as === 'default'
                    ? isModule ? exports.default : exports
                    : as === 'namespace' && !isModule
                        ? Base.set({ default: exports }, exports)
                        : exports;
        }
        expose({ __$__: __$__, $__: $__, __$assign__: __$assign__,
                __$import__: __$import__,
                paper: scope, tool: tool }, true);
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
        // Top-level `await` requires an async function:
        var signature = (compiled.async ? 'async ' : '') + 'function('
                + params + ') {',
            agent = paper.agent;
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
                'document.__paperscript__ = ' + signature + code + '\n}'
            ));
            head.appendChild(script);
            func = document.__paperscript__;
            delete document.__paperscript__;
            head.removeChild(script);
        } else {
            // Return the function from a wrapper, as Function() can't create
            // async functions. The code stays on the same line as with
            // Function(params, code), for the line numbers of source maps:
            func = Function('return ' + signature + code + '\n}')();
        }

        // Install the 'global' tool and view handlers, and we're done!
        function install(exports) {
            var obj = exports || {};
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
                // Automatically request an update at the end. This is only
                // needed if the script does not actually produce anything yet,
                // and the used canvas contains previous content.
                view.requestUpdate();
            }
            return exports;
        }

        var exports = func && func.apply(scope, args);
        // Async functions return a Promise of the exports:
        return compiled.async ? exports.then(install) : install(exports);
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
                        execute(code, scope, {
                            url: src,
                            sourceMaps: 'inline'
                        });
                    }
                });
            } else {
                // We can simply get the code form the script tag.
                execute(script.innerHTML, scope, {
                    url: script.baseURI,
                    sourceMaps: 'inline'
                });
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
}();

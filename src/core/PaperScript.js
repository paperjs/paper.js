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
 * @name PaperScript
 * @namespace
 */
var PaperScript = Base.exports.PaperScript = (function() {
	// Locally turn of exports and define for inlined acorn / esprima.
	// Just declaring the local vars is enough, as they will be undefined.
	var exports, define,
		// The scope into which the library is loaded.
		scope = this;
/*#*/ if (__options.parser == 'acorn') {
/*#*/ include('../../bower_components/acorn/acorn.min.js', { exports: false });
/*#*/ } else if (__options.parser == 'esprima') {
/*#*/ include('../../bower_components/esprima/esprima.min.js', { exports: false });
/*#*/ }

	// Operators to overload

	var binaryOperators = {
		// The hidden math methods are to be injected specifically, see below.
		'+': '__add',
		'-': '__subtract',
		'*': '__multiply',
		'/': '__divide',
		'%': '__modulo',
		// Use the real equals.
		'==': 'equals',
		'!=': 'equals'
	};

	var unaryOperators = {
		'-': '__negate',
		'+': null
	};

	// Inject underscored math methods as aliases to Point, Size and Color.
	var fields = Base.each(
		['add', 'subtract', 'multiply', 'divide', 'modulo', 'negate'],
		function(name) {
			// Create an alias for each math method to be injected into the
			// classes using Straps.js' #inject() 
			this['__' + name] = '#' + name;
		}, 
		{}
	);
	Point.inject(fields);
	Size.inject(fields);
	Color.inject(fields);

	// Use very short name for the binary operator (_$_) as well as the
	// unary operator ($_), as operations will be replaced with then.
	// The underscores stands for the values, and the $ for the operators.

	// Binary Operator Handler
	function _$_(left, operator, right) {
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
	function $_(operator, value) {
		var handler = unaryOperators[operator];
		if (handler && value && value[handler])
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
	 * @param {String} code The PaperScript code
	 * @return {String} the compiled PaperScript as JavaScript code
	 */
	function compile(code) {
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

		// Replaces the node's code with a new version and keeps insertions
		// information up-to-date.
		function replaceCode(node, str) {
			var start = getOffset(node.range[0]),
				end = getOffset(node.range[1]),
				insert = 0;
			// Sort insertions by their offset, so getOffest() can do its thing
			for (var i = insertions.length - 1; i >= 0; i--) {
				if (start > insertions[i][0]) {
					insert = i + 1;
					break;
				}
			}
			insertions.splice(insert, 0, [start, str.length - end + start]);
			code = code.substring(0, start) + str + code.substring(end);
		}

		// Recursively walks the AST and replaces the code of certain nodes
		function walkAST(node, parent) {
			if (!node)
				return;
			for (var key in node) {
				if (key === 'range')
					continue;
				var value = node[key];
				if (Array.isArray(value)) {
					for (var i = 0, l = value.length; i < l; i++)
						walkAST(value[i], node);
				} else if (value && typeof value === 'object') {
					// We cannot use Base.isPlainObject() for these since
					// Acorn.js uses its own internal prototypes now.
					walkAST(value, node);
				}
			}
			switch (node && node.type) {
			case 'UnaryExpression':
				// -a
				if (node.operator in unaryOperators
						&& node.argument.type !== 'Literal') {
					var arg = getCode(node.argument);
					replaceCode(node, '$_("' + node.operator + '", '
							+ arg + ')');
				}
				break;
			case 'BinaryExpression':
				// a + b, a - b, a / b, a * b, a == b, a % b, ...
				if (node.operator in binaryOperators
						&& node.left.type !== 'Literal') {
					var left = getCode(node.left),
						right = getCode(node.right);
					replaceCode(node, '_$_(' + left + ', "' + node.operator
							+ '", ' + right + ')');
				}
				break;
			case 'UpdateExpression':
				// a++, a--
				if (!node.prefix && !(parent && (
						// Filter out for statements to allow loop increments
						// to perform well
						parent.type === 'ForStatement'
						// We need to filter out parents that are comparison
						// operators, e.g. for situations like if (++i < 1),
						// as we can't replace that with if (_$_(i, "+", 1) < 1)
						// Match any operator beginning with =, !, < and >.
						|| parent.type === 'BinaryExpression'
							&& /^[=!<>]/.test(parent.operator)
						// array[i++] is a MemberExpression with computed = true
						// We can't replace that with array[_$_(i, "+", 1)].
						|| parent.type === 'MemberExpression'
							&& parent.computed))) {
					var arg = getCode(node.argument);
					replaceCode(node, arg + ' = _$_(' + arg + ', "'
							+ node.operator[0] + '", 1)');
				}
				break;
			case 'AssignmentExpression':
				/// a += b, a -= b
				if (/^.=$/.test(node.operator)
						&& node.left.type !== 'Literal'
						&& !(parent && parent.type === 'ForStatement')) {
					var left = getCode(node.left),
						right = getCode(node.right);
					replaceCode(node, left + ' = _$_(' + left + ', "'
							+ node.operator[0] + '", ' + right + ')');
				}
				break;
			}
		}
		// Now do the parsing magic
/*#*/ if (__options.parser == 'acorn') {
		walkAST(scope.acorn.parse(code, { ranges: true }));
/*#*/ } else if (__options.parser == 'esprima') {
		walkAST(scope.esprima.parse(code, { range: true }));
/*#*/ }
		return code;
	}

	/**
	 * Executes the parsed PaperScript code in a compiled function that receives
	 * all properties of the passed {@link PaperScope} as arguments, to emulate
	 * a global scope with unaffected performance. It also installs global view
	 * and tool handlers automatically for you.
	 *
	 * @name PaperScript.execute
	 * @function
	 * @param {String} code The PaperScript code
	 * @param {PaperScript} scope The scope for which the code is executed
	 */
	function execute(code, scope) {
		// Set currently active scope.
		paper = scope;
		var view = scope.getView(),
			// Only create a tool object if something resembling a tool handler
			// definition is contained in the code.
			tool = /\s+on(?:Key|Mouse)(?:Up|Down|Move|Drag)\b/.test(code)
					? new Tool()
					: null,
			toolHandlers = tool ? tool._events : [],
			// Compile a list of all handlers that can be defined globally
			// inside the PaperScript. These are passed on to the function as
			// undefined arguments, so that their name exists, rather than
			// injecting a code line that defines them as variables.
			// They are exported again at the end of the function.
			handlers = ['onFrame', 'onResize'].concat(toolHandlers),
			// compile a list of paramter names for all variables that need to
			// appear as globals inside the script. At the same time, also
			// collect their values, so we can pass them on as arguments in the
			// function call. 
			params = [],
			args = [],
			func;
		code = compile(code);
		function expose(scope, hidden) {
			// Look through all enumerable properties on the scope and expose
			// these too as pseudo-globals, but only if they seem to be in use.
			for (var key in scope) {
				if ((hidden || !/^_/.test(key)) && new RegExp(
						'\\b' + key.replace(/\$/g, '\\$') + '\\b').test(code)) {
					params.push(key);
					args.push(scope[key]);
				}
			}
		}
		expose({ _$_: _$_, $_: $_, view: view, tool: tool }, true);
		expose(scope);
		// Finally define the handler variable names as parameters and compose
		// the string describing the properties for the returned object at the
		// end of the code execution, so we can retrieve their values from the
		// function call.
		handlers = Base.each(handlers, function(key) {
			// Check for each handler explicitely and only return them if they
			// seem to exist.
			if (new RegExp('\\s+' + key + '\\b').test(code)) {
				params.push(key);
				this.push(key + ': ' + key);
			}
		}, []).join(', ');
		// We need an additional line that returns the handlers in one object.
		if (handlers)
			code += '\nreturn { ' + handlers + ' };';
/*#*/ if (__options.environment == 'browser') {
		if (window.InstallTrigger || window.chrome) { // Firefox and Chrome
			// On Firefox, all error numbers inside dynamically compiled code
			// are relative to the line where the eval / compilation happened.
			// To fix this issue, we're temporarily inserting a new script
			// tag. We also use this on Chrome to fix an issue with compiled
			// functions:
			// https://code.google.com/p/chromium/issues/detail?id=331655
			var script = document.createElement('script'),
				head = document.head;
			// Do not add a new-line before the code on Chrome since the error
			// messages are shifted by one line there...
			if (!window.chrome)
				code = '\n' + code;
			script.appendChild(document.createTextNode(
				'paper._execute = function(' + params + ') {' + code + '\n}'
			));
			head.appendChild(script);
			func = paper._execute;
			head.removeChild(script);
		} else {
			func = Function(params, code);
		}
/*#*/ } else { // !__options.environment == 'browser'
		func = Function(params, code);
/*#*/ } // !__options.environment == 'browser'
		var res = func.apply(scope, args) || {};
		// Now install the 'global' tool and view handlers, and we're done!
		Base.each(toolHandlers, function(key) {
			var value = res[key];
			if (value)
				tool[key] = value;
		});
		if (view) {
			if (res.onResize)
				view.setOnResize(res.onResize);
			// Fire resize event directly, so any user
			// defined resize handlers are called.
			view.fire('resize', {
				size: view.size,
				delta: new Point()
			});
			if (res.onFrame)
				view.setOnFrame(res.onFrame);
			// Automatically update view at the end.
			view.update();
		}
	}

/*#*/ if (__options.environment == 'browser') {

	function load() {
		Base.each(document.getElementsByTagName('script'), function(script) {
			// Only load this script if it not loaded already.
			// Support both text/paperscript and text/x-paperscript:
			if (/^text\/(?:x-|)paperscript$/.test(script.type)
					&& !script.getAttribute('data-paper-ignore')) {
				// Produce a new PaperScope for this script now. Scopes are
				// cheap so let's not worry about the initial one that was
				// already created.
				// Define an id for each PaperScript, so its scope can be
				// retrieved through PaperScope.get().
				// If a canvas id is provided, pass it on to the PaperScope
				// so a project is created for it now.
				var canvas = PaperScope.getAttribute(script, 'canvas'),
					// See if there already is a scope for this canvas and reuse
					// it, to support multiple scripts per canvas. Otherwise
					// create a new one.
					scope = PaperScope.get(canvas)
							|| new PaperScope(script).setup(canvas),
					src = script.src;
				if (src) {
					// If we're loading from a source, request that first and
					// then run later.
					Http.request('get', src, function(code) {
						execute(code, scope);
					});
				} else {
					// We can simply get the code form the script tag.
					execute(script.innerHTML, scope);
				}
				// Mark script as loaded now.
				script.setAttribute('data-paper-ignore', true);
			}
		}, this);
	}

	// Catch cases where paper.js is loaded after the browser event has already
	// occurred.
	if (document.readyState === 'complete') {
		// Handle it asynchronously
		setTimeout(load);
	} else {
		DomEvent.add(window, { load: load });
	}

	return {
		compile: compile,
		execute: execute,
		load: load,
		lineNumberBase: 0
	};

/*#*/ } else { // !__options.environment == 'browser'
/*#*/ if (__options.environment == 'node') {

	// Register the .pjs extension for automatic compilation as PaperScript
	var fs = require('fs'),
		path = require('path');

	require.extensions['.pjs'] = function(module, uri) {
		// Requiring a PaperScript on Node.js returns an initialize method which
		// needs to receive a Canvas object when called and returns the
		// PaperScope.
		module.exports = function(canvas) {
			var source = compile(fs.readFileSync(uri, 'utf8')),
				scope = new PaperScope();
			scope.setup(canvas);
			scope.__filename = uri;
			scope.__dirname = path.dirname(uri);
			// Expose core methods and values
			scope.require = require;
			scope.console = console;
			execute(source, scope);
			return scope;
		};
	};

/*#*/ } // __options.environment == 'node'

	return {
		compile: compile,
		execute: execute
	};

/*#*/ } // !__options.environment == 'browser'
// Pass on `this` as the binding object, so we can reference Acorn both in 
// development and in the built library.
}).call(this);

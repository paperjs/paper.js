/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name PaperScript
 * @namespace
 */
// Note that due to the use of with(), PaperScript gets compiled outside the
// main paper scope, and is added to the PaperScope class. This allows for
// better minification and the future use of strict mode once it makes sense
// in terms of performance.
paper.PaperScope.prototype.PaperScript = (function(root) {
	var Base = paper.Base,
		PaperScope = paper.PaperScope,
		// For local reference, for now only when setting lineNumberBase on
		// Firefox.
		PaperScript,
		// Locally turn of exports and define for inlined acorn / esprima.
		// Just declaring the local vars is enough, as they will be undefined.
		exports, define,
		// The scope into which the library is loaded.
		scope = this;
/*#*/ if (options.version == 'dev') {
	// As the above inclusion loads code into the root scope during dev,
	// set scope to root, so we can find the library.
	scope = root;
/*#*/ } // options.version == 'dev'
/*#*/ if (options.parser == 'acorn') {
/*#*/ include('../../bower_components/acorn/acorn.min.js', { exports: false });
/*#*/ } else if (options.parser == 'esprima') {
/*#*/ include('../../bower_components/esprima/esprima.min.js', { exports: false });
/*#*/ }

	// Operators to overload

	var binaryOperators = {
		// The hidden math functions are to be injected specifically, see below.
		'+': '_add',
		'-': '_subtract',
		'*': '_multiply',
		'/': '_divide',
		'%': '_modulo',
		// Use the real equals.
		'==': 'equals',
		'!=': 'equals'
	};

	var unaryOperators = {
		'-': '_negate',
		'+': null
	};

	// Inject underscored math functions as aliases to Point, Size and Color.
	var fields = Base.each(
		['add', 'subtract', 'multiply', 'divide', 'modulo', 'negate'],
		function(name) {
			this['_' + name] = '#' + name;
		}, 
		{}
	);
	paper.Point.inject(fields);
	paper.Size.inject(fields);
	paper.Color.inject(fields);

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
		// which is then walked and parsed for operators to overload.
		// Instead of modifying the AST and converting back to code, we directly
		// change the source code based on the parser's range information, so we
		// can preserve line-numbers in syntax errors and remove the need for
		// Escodegen.

		// Tracks code insertions so we can add their differences to the
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
				end = getOffset(node.range[1]);
			var insert = 0;
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
			case 'BinaryExpression':
				if (node.operator in binaryOperators
						&& node.left.type !== 'Literal') {
					var left = getCode(node.left),
						right = getCode(node.right);
					replaceCode(node, '_$_(' + left + ', "' + node.operator
							+ '", ' + right + ')');
				}
				break;
			case 'AssignmentExpression':
				if (/^.=$/.test(node.operator)
						&& node.left.type !== 'Literal') {
					var left = getCode(node.left),
						right = getCode(node.right);
					replaceCode(node, left + ' = _$_(' + left + ', "'
							+ node.operator[0] + '", ' + right + ')');
				}
				break;
			case 'UpdateExpression':
				if (!node.prefix && !(parent && (
						// We need to filter out parents that are comparison
						// operators, e.g. for situations like if (++i < 1),
						// as we can't replace that with if (_$_(i, "+", 1) < 1)
						// Match any operator beginning with =, !, < and >.
						parent.type === 'BinaryExpression'
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
			case 'UnaryExpression':
				if (node.operator in unaryOperators
						&& node.argument.type !== 'Literal') {
					var arg = getCode(node.argument);
					replaceCode(node, '$_("' + node.operator + '", '
							+ arg + ')');
				}
				break;
			}
		}
		// Now do the parsing magic
/*#*/ if (options.parser == 'acorn') {
		walkAST(scope.acorn.parse(code, { ranges: true }));
/*#*/ } else if (options.parser == 'esprima') {
		walkAST(scope.esprima.parse(code, { range: true }));
/*#*/ }
		return code;
	}

	/**
	 * Evaluates parsed PaperScript code in the passed {@link PaperScope}
	 * object. It also installs handlers automatically for us.
	 *
	 * @name PaperScript.evaluate
	 * @function
	 * @param {String} code The PaperScript code
	 * @param {PaperScript} scope The scope in which the code is executed
	 * @return {Object} the result of the code evaluation
	 */
	function evaluate(code, scope) {
		// Set currently active scope.
		paper = scope;
		var view = scope.project && scope.project.view,
			res;
		// Define variables for potential handlers, so eval() calls below to
		// fetch their values do not require try-catch around them.
		// Use with(){} in order to make the scope the current 'global' scope
		// instead of window.
		with (scope) {
			// Within this, use a function scope, so local variables to not try
			// and set themselves on the scope object.
			(function() {
				var onActivate, onDeactivate, onEditOptions,
					onMouseDown, onMouseUp, onMouseDrag, onMouseMove,
					onKeyDown, onKeyUp, onFrame, onResize;
				code = compile(code);
				if (root.InstallTrigger) { // Firefox
					// Add a semi-colon at the start so Firefox doesn't swallow
					// empty lines and shift error messages. 
					code = ';' + code;
					// On Firefox, all error numbers inside evaled code are
					// relative to the line where the eval happened. Totally
					// silly, but that's how it is. So we're exposing it through
					// PaperScript.lineNumberBase, to remove it again from
					// reported errors:
					PaperScript.lineNumberBase = new Error().lineNumber + 1;
				}
				res = eval(code);
				// Only look for tool handlers if something resembling their
				// name is contained in the code.
				if (/on(?:Key|Mouse)(?:Up|Down|Move|Drag)/.test(code)) {
					Base.each(paper.Tool.prototype._events, function(key) {
						var value = eval(key);
						if (value) {
							// Use the getTool accessor that handles auto tool
							// creation for us:
							scope.getTool()[key] = value;
						}
					});
				}
				if (view) {
					view.setOnResize(onResize);
					// Fire resize event directly, so any user
					// defined resize handlers are called.
					view.fire('resize', {
						size: view.size,
						delta: new Point()
					});
					view.setOnFrame(onFrame);
					// Automatically draw view at the end.
					view.draw();
				}
			}).call(scope);
		}
		return res;
	}

/*#*/ if (options.environment == 'browser') {

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
					paper.Http.request('get', src, function(code) {
						evaluate(code, scope);
					});
				} else {
					// We can simply get the code form the script tag.
					evaluate(script.innerHTML, scope);
				}
				// Mark script as loaded now.
				script.setAttribute('data-paper-ignore', true);
			}
		}, this, true); // Pass true for asArray to handle HTMLCollection
	}

	// Catch cases where paper.js is loaded after the browser event has already
	// occurred.
	if (document.readyState === 'complete') {
		// Handle it asynchronously
		setTimeout(load);
	} else {
		paper.DomEvent.add(window, { load: load });
	}

	return PaperScript = {
		compile: compile,
		evaluate: evaluate,
		load: load,
		lineNumberBase: 0
	};

/*#*/ } else { // !options.environment == 'browser'
/*#*/ if (options.environment == 'node') {

	// Register the .pjs extension for automatic compilation as PaperScript
	var fs = require('fs'),
		path = require('path');

	require.extensions['.pjs'] = function(module, uri) {
		var source = compile(fs.readFileSync(uri, 'utf8')),
			scope = new PaperScope();
		scope.__filename = uri;
		scope.__dirname = path.dirname(uri);
		// Expose core methods and values
		scope.require = require;
		scope.console = console;
		evaluate(source, scope);
		module.exports = scope;
	};

/*#*/ } // options.environment == 'node'

	return PaperScript = {
		compile: compile,
		evaluate: evaluate
	};

/*#*/ } // !options.environment == 'browser'
})(this);

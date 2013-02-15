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

/*#*/ if (options.parser == 'acorn') {
/*#*/ include('../../lib/acorn-min.js');
/*#*/ } else if (options.parser == 'esprima') {
/*#*/ include('../../lib/esprima-min.js');
/*#*/ }

var PaperScript = this.PaperScript = new function() {
	// Operators to overload

	var binaryOperators = {
		'+': 'add',
		'-': 'subtract',
		'*': 'multiply',
		'/': 'divide',
		'%': 'modulo',
		'==': 'equals',
		'!=': 'equals'
	};

	var unaryOperators = {
		'-': 'negate',
		'+': null
	};

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
	 * @param {String} code The PaperScript code.
	 * @return {String} The compiled PaperScript as JavaScript code.
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
			var start = offset;
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
		function walkAst(node) {
			for (var key in node) {
				if (key === 'range')
					continue;
				var value = node[key];
				if (Array.isArray(value)) {
					for (var i = 0, l = value.length; i < l; i++)
						walkAst(value[i]);
				} else if (Base.isPlainObject(value)) {
					walkAst(value);
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
				if (!node.prefix) {
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
		walkAst(acorn.parse(code, { ranges: true }));
/*#*/ } else if (options.parser == 'esprima') {
		walkAst(esprima.parse(code, { range: true }));
/*#*/ }
		return code;
	}

	/**
	 * Evaluates parsed PaperScript code in the passed {@link PaperScope}
	 * object. It also installs handlers automatically for us.
	 *
	 * @name PaperScript.evaluate
	 * @function
	 * @param {String} code The PaperScript code.
	 * @param {PaperScript} scope The scope in which the code is executed.
	 * @return {Object} The result of the code evaluation.
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
				res = eval(compile(code));
				// Only look for tool handlers if something resembling their
				// name is contained in the code.
				if (/on(?:Key|Mouse)(?:Up|Down|Move|Drag)/.test(code)) {
					Base.each(Tool.prototype._events, function(key) {
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

/*#*/ if (options.browser) {
	// Code borrowed from Coffee Script:
	function request(url, scope) {
		var xhr = new (window.ActiveXObject || XMLHttpRequest)(
				'Microsoft.XMLHTTP');
		xhr.open('GET', url, true);
		if (xhr.overrideMimeType)
			xhr.overrideMimeType('text/plain');
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				return evaluate(xhr.responseText, scope);
			}
		};
		return xhr.send(null);
	}

	function load() {
		var scripts = document.getElementsByTagName('script');
		// Scopes stores a mapping of canvas name to associated scope in order to
		// reuse scopes for multiple scripts.
		var scopes = {};
		for (var i = 0, l = scripts.length; i < l; i++) {
			var script = scripts[i];
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
				var canvas = PaperScript.getAttribute(script, 'canvas');
				var scope;
				if (scopes.hasOwnProperty(canvas)) {
					scope = scopes[canvas];
				} else {
					scope = new PaperScope(script);
					scope.setup(canvas);
					scopes[canvas] = scope;
				}
				if (script.src) {
					// If we're loading from a source, request that first and then
					// run later.
					request(script.src, scope);
				} else {
					// We can simply get the code form the script tag.
					evaluate(script.innerHTML, scope);
				}
				// Mark script as loaded now.
				script.setAttribute('data-paper-ignore', true);
			}
		}
	}

	// Catch cases where paper.js is loaded after the browser event has already
	// occurred.
	if (document.readyState === 'complete') {
		// Handle it asynchronously
		setTimeout(load);
	} else {
		DomEvent.add(window, { load: load });
	}

	// Produces helpers to e.g. check for both 'canvas' and 'data-paper-canvas'
	// attributes:
	function handleAttribute(name) {
		name += 'Attribute';
		return function(el, attr) {
			return el[name](attr) || el[name]('data-paper-' + attr);
		};
	}

	return {
		compile: compile,
		evaluate: evaluate,
		load: load,
		getAttribute: handleAttribute('get'),
		hasAttribute: handleAttribute('has')
	};

/*#*/ } else { // !options.browser

	return {
		compile: compile,
		evaluate: evaluate
	};

/*#*/ } // !options.browser
};

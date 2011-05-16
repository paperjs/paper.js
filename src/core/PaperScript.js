/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * All rights reserved.
 */

var PaperScript = this.PaperScript = new function() {
//TODO: Make sure there are all the correct copyrights for the inlined parse-js:
//#include "../../lib/parse-js-min.js"

	// Math Operators

	var operators = {
		'+': 'add',
		'-': 'subtract',
		'*': 'multiply',
		'/': 'divide',
		'%': 'modulo',
		'==': 'equals',
		'!=': 'equals'
	};

	function $eval(left, operator, right) {
		var handler = operators[operator];
		if (left && left[handler]) {
			var res = left[handler](right);
			return operator == '!=' ? !res : res;
		}
		switch (operator) {
		case '+': return left + right;
		case '-': return left - right;
		case '*': return left * right;
		case '/': return left / right;
		case '%': return left % right;
		case '==': return left == right;
		case '!=': return left != right;
		default:
			throw new Error('Implement Operator: ' + operator);
		}
	};

	// Sign Operators

	var signOperators = {
		'-': 'negate'
	};

	function $sign(operator, value) {
		var handler = signOperators[operator];
		if (value && value[handler]) {
			return value[handler]();
		}
		switch (operator) {
		case '+': return +value;
		case '-': return -value;
		default:
			throw new Error('Implement Sign Operator: ' + operator);
		}
	}

	// AST Helpers

	function isDynamic(exp) {
		var type = exp[0];
		return type != 'num' && type != 'string';
	}

	function handleOperator(operator, left, right) {
		// Only replace operators with calls to $operator if the left hand side
		// is potentially an object.
		if (operators[operator] && isDynamic(left)) {
			// Replace with call to $operator(left, operator, right):
			return ['call', ['name', '$eval'],
					[left, ['string', operator], right]];
		}
	}

	function compile(code) {
		// Use parse-js to translate the code into a AST structure which is then
		// walked and parsed for operators to overload. The resulting AST is
		// translated back to code and evaluated.
		var ast = parse_js.parse(code),
			walker = parse_js.walker(),
			walk = walker.walk;

		ast = walker.with_walkers({
			'binary': function(operator, left, right) {
				// Handle simple mathematical operators here:
				return handleOperator(operator, left = walk(left),
						right = walk(right))
						// Always return something since we're walking left and
						// right for the handleOperator() call already.
						|| [this[0], operator, left, right];
			},

			'assign': function(operator, left, right) {
				// Handle assignments like +=, -=, etc:
				// Check if the assignment operator needs to be handled by paper
				// if so, convert the assignment to a simple = and use result of
				// of handleOperator on the right hand side.
				var res = handleOperator(operator, left = walk(left),
						right = walk(right));
				if (res)
					return [this[0], true, left, res];
				// Always return something for the same reason as in binary
				return [this[0], operator, left, right];
			},

			'unary-prefix': function(operator, exp) {
				if (signOperators[operator] && isDynamic(exp)) {
					return ['call', ['name', '$sign'],
							[['string', operator], walk(exp)]];
				}
			}
		}, function() {
			return walk(ast);
		});

		return parse_js.stringify(ast, true);
	}

	function evaluate(code, scope) {
//#ifdef BROWSER
		// See if it's a script tag or a string
		if (typeof code !== 'string') {
			// If a canvas id is provided, create a project for it now,
			// so the active project is defined.
			var canvas = code.getAttribute('canvas');
			if (canvas = canvas && document.getElementById(canvas)) {
				// Create a Project for this canvas, using the right scope
				paper = scope;
				// XXX: Do not pass canvas to Project.
				// Create ProjectView here instead.
				new Project(canvas);
			}
			if (code.src) {
				// If we're loading from a source, request that first and then
				// run later.
				return request(code.src, scope);
			} else {
				// We can simply get the code form the script tag.
				code = code.innerHTML;
			}
		}
//#endif // BROWSER
		var proj = scope.project,
			view = proj.activeView,
			// TODO: Add support for multiple tools
			tool = scope.tool = /on(?:Key|Mouse)(?:Up|Down|Move|Drag)/.test(code)
					&& new Tool(null, scope),
			res;
		// Define variables for potential handlers, so eval() calls below to 
		// fetch their values do not require try-catch around them.
		// Set currently active scope.
		paper = scope;
		// Use with(){} in order to make the scope the current 'global' scope
		// instead of window.
		with (scope) {
			// Within this, use a function scope, so local variables to not try
			// and set themselves on the scope object.
			(function() {
				var onEditOptions, onSelect, onDeselect, onReselect, onMouseDown,
					onMouseUp, onMouseDrag, onMouseMove, onKeyDown, onKeyUp,
					onFrame, onResize,
					handlers = [ 'onEditOptions', 'onSelect', 'onDeselect',
						'onReselect', 'onMouseDown', 'onMouseUp', 'onMouseDrag',
						'onMouseMove', 'onKeyDown', 'onKeyUp'];
				res = eval(compile(code));
				if (tool) {
					// We could do this instead to avoid eval(), but it's longer
					// tool.onEditOptions = onEditOptions;
					// tool.onSelect = onSelect;
					// tool.onDeselect = onDeselect;
					// tool.onReselect = onReselect;
					// tool.onMouseDown = onMouseDown;
					// tool.onMouseUp = onMouseUp;
					// tool.onMouseDrag = onMouseDrag;
					// tool.onMouseMove = onMouseMove;
					// tool.onKeyDown = onKeyDown;
					// tool.onKeyUp = onKeyUp;
					Base.each(handlers, function(key) {
						tool[key] = eval(key);
					});
				}
				if (view) {
					view.onResize = onResize;
					if (onFrame) {
						view.setOnFrame(onFrame);
					} else {
						// Automatically draw view at the end.
						view.draw();
					}
				}
			}).call(scope);
		}
		return res;
	}

//#ifdef BROWSER
	// Code borrowed from Coffee Script:
	function request(url, scope) {
		var xhr = new (window.ActiveXObject || XMLHttpRequest)(
				'Microsoft.XMLHTTP');
		xhr.open('GET', url, true);
		if (xhr.overrideMimeType) {
			xhr.overrideMimeType('text/plain');
		}
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				return evaluate(xhr.responseText, scope);
			}
		};
		return xhr.send(null);
	}

	function load() {
		var scripts = document.getElementsByTagName('script'),
			count = 0;
		for (var i = 0, l = scripts.length; i < l; i++) {
			var script = scripts[i];
			// Only load this script if it not loaded already.
			if (script.type === 'text/paperscript'
					&& !script.getAttribute('loaded')) {
				// Produce a new PaperScope for this script now. Scopes are
				// cheap so let's not worry about the initial one that was
				// already created.
				// Define an id for each paperscript, so its scope can be
				// retrieved through PaperScope.get().
				var scope = new PaperScope(script.getAttribute('id')
						|| script.src || ('paperscript-' + (count++)));
				// Make sure the tag also has this id now. If it already had an
				// id, we're not changing it, since it's the first option we're
				// trying to get an id from above.
				script.setAttribute('id', scope.id);
				evaluate(script, scope);
				// Mark script as loaded now.
				script.setAttribute('loaded', true);
			}
		}
	}

	DomEvent.add(window, { load: load });

	return {
		compile: compile,
		evaluate: evaluate,
		load: load
	};

//#else // !BROWSER

	return {
		compile: compile,
		evaluate: evaluate
	};

//#endif // !BROWSER
};

// Export load directly:
this.load = PaperScript.load;

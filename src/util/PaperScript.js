var PaperScript = new function() {
	//TODO: Make sure there are all the correct copyrights for the inlined
	//parse-js:
	//#include "../../lib/parse-js-min.js"

	// Handle Math Operators

	var operators = {
		'+': 'add',
		'-': 'subtract',
		'*': 'multiply',
		'/': 'divide',
		'%': 'modulo',
		'==': 'equals',
		'!=': 'equals'
	};

	paper.handleOperator = function(operator, left, right) {
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

	// Handle Sign Operators

	var signOperator = {
		'-': 'negate'
	};

	paper.handleSignOperator = function(operator, exp) {
		var handler = signOperator[operator];
		if (exp && exp[handler]) {
			return exp[handler]();
		}
		switch (operator) {
		case '+': return +exp;
		case '-': return -exp;
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
		// Only replace operators with calls to paper.handleOperator if
		// the left hand side is potentially an object.
		if (operators[operator] && isDynamic(left)) {
			// Replace with paper.handleOperator(operator, left, right):
			return ['call', ['dot', ['name', 'paper'], 'handleOperator'],
					[['string', operator], left, right]];
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
				if (signOperator[operator] && isDynamic(exp)) {
					return ['call', ['dot', ['name', 'paper'],
							'handleSignOperator'],
							[['string', operator], walk(exp)]];
				}
			}
		}, function() {
			return walk(ast);
		});

		return parse_js.stringify(ast, true);
	}

	function run(code) {
		// Use paper.extend() to create a paper scope within which the code is
		// evaluated.
		with (paper.extend()) {
			// TODO: Only create tool if code contains reference to tool scripts!
			var tool = new Tool();
			var res = eval(compile(code));
			// TODO: Again, only do this if we actually detected a tool script:
			Base.each(['onEditOptions', 'onOptions', 'onSelect', 'onDeselect',
				'onReselect', 'onMouseDown', 'onMouseUp', 'onMouseDrag',
				'onMouseMove'], function(key) {
				try {
					tool[key] = eval(key);
				} catch (e) {
				}
			});
			return res;
		}
	}

//#ifdef BROWSER
	// Code borrowed from Coffee Script:
	function load(url) {
		var xhr = new (window.ActiveXObject || XMLHttpRequest)('Microsoft.XMLHTTP');
		xhr.open('GET', url, true);
		if ('overrideMimeType' in xhr) {
			xhr.overrideMimeType('text/plain');
		}
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				return run(xhr.responseText);
			}
		};
		return xhr.send(null);
	}

	function runScripts() {
		var scripts = document.getElementsByTagName('script');
		for (var i = 0, l = scripts.length; i < l; i++) {
			var script = scripts[i];
			if (script.type === 'text/paperscript') {
				// If a canvas id is provided, create a document for it now, so
				// the active document is defined.
				var canvas = script.getAttribute('canvas');
				if (canvas && (canvas = document.getElementById(canvas))) {
					new Document(canvas);
				}
				if (script.src) {
					load(script.src);
				} else {
					run(script.innerHTML);
				}
			}
		}
		return null;
	}

	if (window.addEventListener) {
		addEventListener('load', runScripts, false);
	} else {
		attachEvent('onload', runScripts);
	}
//#endif // BROWSER

	return {
		compile: compile,
		run: run
	};
};

$.extend($.fn, {
	modifyClass: function(className, add) {
		return this[add ? 'addClass' : 'removeClass'](className);
	},

	orNull: function() {
		return this.length > 0 ? this : null;
	}
});

function createCodeMirror(place, options, source) {
	return new CodeMirror(place, $.extend({
		lineNumbers: true,
		matchBrackets: true,
		indentUnit: 4,
		tabMode: 'shift',
		value: source.html().replace(/\t/gi, '    ').match(
			// Remove first & last empty line
			/^\s*?[\n\r]?([\u0000-\uffff]*?)[\n\r]?\s*?$/)[1]
	}, options));
}

function createPaperScript(element) {
	var scriptName = 'paperjs_' + document.documentURI.match(/\/([^\/]*)$/)[1],
		script = $('script', element).orNull(),
		runButton = $('.button.run', element).orNull();
	if (!script || !runButton)
		return;
	var canvas = $('canvas', element),
		hasResize = canvas.attr('resize'),
		showSplit = element.hasClass('split'),
		sourceFirst = element.hasClass('source'),
		width, height,
		editor = null,
		hasBorders = true,
		tools = $('.tools', element),
		inspectorButton = $('.tools .button.inspector', element),
		inspectorInfo = $('.tools .info', element),
		source = $('.source', element),
		console = $('.console', element);
	script.html(localStorage[scriptName] || '');

	function showSource(show) {
		source.modifyClass('hidden', !show);
		runButton.text(show ? 'Run' : 'Source');
		if (tools && !showSplit)
			tools.modifyClass('hidden', show);
		if (show && !editor) {
			editor = createCodeMirror(source[0], {
				onKeyEvent: function(editor, event) {
					localStorage[scriptName] = editor.getValue();
					/*
					event = new DomEvent(event);
					if (event.type == 'keydown') {
						var pos = editor.getCursor();
						pos.ch += 4;
						editor.setCursor(pos);
						event.stop();
					}
					*/
				}
			}, script);
		}
	}

	var inspectorTool,
		previousTool,
		toggleInspector = false;

	function createInspector() {
		if (!inspectorButton)
			return;
		var scope = paper.PaperScope.get(script[0]);
		previousTool = scope.tools[0];
		inspectorTool = new paper.Tool();
		prevItem = null;
		inspectorTool.onMouseDown = function(event) {
			if (prevItem) {
				prevItem.selected = false;
			}
			var item = event.item;
			if (item) {
				var handle = item.hitTest(event.point, {
					segments: true,
					tolerance: 4
				});
				if (handle) {
					item = handle.segment;
				}
				item.selected = true;
			}
			inspectorInfo.modifyClass('hidden', !item);
			if (item) {
				var text;
				if (item instanceof paper.Segment) {
					text = 'Segment';
					text += '<br />point: ' + item.point;
					if (!item.handleIn.isZero())
						text += '<br />handleIn: ' + item.handleIn;
					if (!item.handleOut.isZero())
						text += '<br />handleOut: ' + item.handleOut;
				} else {
					text = item.constructor._name;
					text += '<br />position: ' + item.position;
					text += '<br />bounds: ' + item.bounds;
				}
				inspectorInfo.html(text);
			}
			prevItem = item;
		};
		inspectorTool.onSelect = function() {
			console.log('select');
		};
		// reactivate previous tool for now
		if (previousTool)
			previousTool.activate();
	}

	inspectorButton.click(function(event) {
		if (inspectorTool) {
			(toggleInspector && previousTool ? previousTool : inspectorTool).activate();
			if (toggleInspector) {
				if (prevItem)
					prevItem.selected = false;
				prevItem = null;
			}
			toggleInspector = !toggleInspector;
		}
	});

	// In order to be able to install our own error handlers first, we are
	// not relying on automatic script loading, which is disabled by the use
	// of data-paper-ignore="true". So we need to create a new paperscope
	// or re

	function runScript() {
		// Update script to edited version
		var code = editor.getValue();
		script.html(code);
		var scope = new paper.PaperScope(script[0]);
		installConsole(scope);
		handleInclude(scope, code, function() {
			scope.setup(paper.PaperScript.getAttribute(script[0], 'canvas'));
			scope.evaluate(code);
			createInspector();
		});
	}

	// Run the script once the window is loaded
	$(window).load(runScript);

	function installConsole(scope) {
		// Override the console object with one that logs to our new
		// console
		function print(className, args) {
			$('<div />')
				.addClass(className)
				.text(paper.Base.each(args, function(arg) {
									this.push(arg + '');
								}, []).join(' '))
				.appendTo(console);
			console.scrollTop(console.prop('scrollHeight'));
		}

		$.extend(scope, {
			console: {
				log: function() {
					print('line', arguments);
				},

				error: function() {
					print('line error', arguments);
				}
			}
		});

		// Install an error handler to log the errors in our log too:
		window.onerror = function(error, url, lineNumber) {
			scope.console.error('Line ' + lineNumber + ': ' + error);
			paper.view.draw();
		};
	}

	function handleInclude(scope, code, run) {
		var includes = [];
		// Parse code for includes, and load them asynchronously if present
		code.replace(/\binclude\(['"]([^)]*)['"]\)/g, function(all, url) {
			includes.push(url);
		});

		// Install empty include() function, so code can execute include()
		// statements, which we process separately here.
		scope.include = function(url) {
		};

		function load() {
			var url = includes.shift();
			if (url) {
				$.getScript(url, load);
			} else {
				run();
			}
		}

		load();
	}

	function resize() {
		if (!canvas.hasClass('hidden')) {
			width = canvas.getWidth();
			height = canvas.getHeight();
		} else if (hasResize) {
			// Can't get correct dimensions from hidden canvas,
			// so calculate again.
			var size = $window.getScrollSize();
			var offset = source.getOffset();
			width = size.width - offset.x;
			height = size.height - offset.y;
		}
		// Resize the main element as well, so that the float:right button
		// is always positioned correctly.
		element.attr({ width: width, height: height });
		source.attr({
			width: width - (hasBorders ? 2 : 1),
			height: height - (hasBorders ? 2 : 0)
		});
	}

	function toggleView() {
		var show = source.hasClass('hidden');
		resize();
		canvas.modifyClass('hidden', show);
		showSource(show);
		if (!show)
			runScript();
		// Add extra margin if there is scrolling
		runButton.css('margin-right',
			$('.CodeMirror', source).getScrollSize().height > height
				? 23 : 8);
	}

	if (hasResize) {
		// Install the resize event only after paper.js installs its own,
		// which happens on the load event. This is needed because we rely
		// on paper.js performing the actual resize magic.
		$(window).load(function() {
			$window.resize(resize);
		});
		hasBorders = false;
		source.css('border-width', '0 0 0 1px');
	}

	if (showSplit) {
		showSource(true);
	} else if (sourceFirst) {
		toggleView();
	}

	runButton
		.click(function(event) {
			if (showSplit) {
				runScript();
			} else {
				toggleView();
			}
			return false;
		})
		.mousedown(function(event) {
			return false;
		});
}

$(function() {
	$('.paperscript').each(function() {
		createPaperScript($(this));
	});
	$(document).keydown(function(event) {
		if ((event.metaKey || event.ctrlKey) && event.which == 69) {
			$('.paperscript .button').trigger('click', event);
			return false;
		}
	});
});

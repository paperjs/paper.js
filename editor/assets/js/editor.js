// Install some useful jQuery extensions that we use a lot

$.extend($.fn, {
	modifyClass: function(className, add) {
		return this[add ? 'addClass' : 'removeClass'](className);
	},

	orNull: function() {
		return this.length > 0 ? this : null;
	},

	findAndSelf: function(selector) {
		return this.find(selector).add(this.filter(selector));
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
		hasResize = canvas.attr('resize') !== undefined,
		showSplit = element.hasClass('split'),
		sourceFirst = element.hasClass('source'),
		consoleContainer = $('.console', element).orNull(),
		editor = null,
		tools = $('.tools', element),
		inspectorButton = $('.tools .button.inspector', element).orNull(),
		inspectorInfo = $('.tools .info', element),
		source = $('.source', element),
		code = localStorage[scriptName] || '',
		scope;

	script.html(code);

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

	function evaluateCode() {
		scope.setup(canvas[0]);
		scope.evaluate(code);
		createInspector();
	}

	function runCode() {
		// Update script to edited version
		code = editor.getValue();
		script.html(code);
		// In order to be able to install our own error handlers first, we are
		// not relying on automatic script loading, which is disabled by the use
		// of data-paper-ignore="true". So we need to create a new paperscope
		// each time.
		if (scope)
			scope.remove();
		scope = new paper.PaperScope(script[0]);
		createConsole();
		// parseInclude() triggers evaluateCode() in the right moment for us.
		parseInclude();
	}

	// Run the script once the window is loaded
	$(window).load(runCode);

	if (consoleContainer) {
		// Append to a container inside the console, so css can use :first-child
		consoleContainer = $('<div class="lines"/>').appendTo(consoleContainer);
	}

	function createConsole() {
		if (!consoleContainer)
			return;
		// Override the console object with one that logs to our new
		// console
		function print(className, args) {
			$('<div/>')
				.addClass(className)
				.text(paper.Base.each(args, function(arg) {
									this.push(arg + '');
								}, []).join(' '))
				.appendTo(consoleContainer);
			consoleContainer.scrollTop(consoleContainer.prop('scrollHeight'));
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
	}

	// Install an error handler to log the errors in our log too:
	window.onerror = function(error, url, lineNumber) {
		scope.console.error('Line ' + lineNumber + ': ' + error);
		paper.view.draw();
	};

	function parseInclude() {
		var includes = [];
		// Parse code for includes, and load them synchronously, if present
		code.replace(/\binclude\(['"]([^)]*)['"]\)/g, function(all, url) {
			includes.push(url);
		});

		// Install empty include() function, so code can execute include()
		// statements, which we process separately above.
		scope.include = function(url) {
		};

		// Load all includes sequentially, and finally evaluate code, since 
		// the code will probably be interdependent.
		function load() {
			var url = includes.shift();
			if (url) {
				$.getScript(url, load);
			} else {
				evaluateCode();
			}
		}

		load();
	}

	var inspectorTool,
		previousTool,
		toggleInspector = false;

	function createInspector() {
		if (!inspectorButton)
			return;
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
		previousTool._name = 'normal';
		inspectorTool._name = 'inspector';
		// reactivate previous tool for now
		if (previousTool) {
			previousTool.activate();
		}
	}

	if (inspectorButton) {
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
	}

	element.findAndSelf('.pane-hor').split({
		orientation:'vertical',
		limit: 100,
		position:'50%'
	});
	element.findAndSelf('.pane-ver').split({
		orientation:'horizontal',
		limit: 100,
		position:'50%'
	});
	// Refresh editor if parent gets resized
	$('.editor', element).parents('.splitter_panel').on('splitter.resize', function() {
		editor.refresh();
	});

	function resize() {
		editor.refresh();
		$('.splitter_panel', element).trigger('splitter.resize');
	}

	function toggleView() {
		var show = source.hasClass('hidden');
		canvas.modifyClass('hidden', show);
		showSource(show);
		if (!show)
			runCode();
	}

	if (hasResize) {
		// Install the resize event only after paper.js installs its own,
		// which happens on the load event. This is needed because we rely
		// on paper.js performing the actual resize magic.
		$(window).load(function() {
			$(window).resize(resize);
		});
	}

	if (showSplit) {
		showSource(true);
	} else if (sourceFirst) {
		toggleView();
	}

	$('.button', element).mousedown(function(event) {
		return false;
	});

	runButton.click(function() {
		if (showSplit) {
			runCode();
		} else {
			toggleView();
		}
		return false;
	});

	$('.button.clear-console', element).click(function() {
		consoleContainer.children().remove();
	})
}

$(function() {
	$('.paperscript').each(function() {
		createPaperScript($(this));
	});
	$(document).keydown(function(event) {
		if ((event.metaKey || event.ctrlKey) && event.which == 69) {
			$('.paperscript .button.run').trigger('click', event);
			return false;
		}
	});
});

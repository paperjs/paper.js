ContentEnd = HtmlElement.extend({
	_class: 'content-end',

	initialize: function() {
		var anchor = $$('a[name]').getLast(),
			that = this;
		if (anchor) {
			function resize() {
				var bottom = $window.getScrollSize().height
					- anchor.getOffset().y - $window.getSize().height;
				that.setHeight(that.getHeight() - bottom);
			}
			$window.addEvents({
				load: resize,
				resize: resize
			});
			// Not sure why these are required twice, in addition to load()..
			resize();
			resize();
		}
	}
});

function createCodeMirror(place, options, source) {
	return new CodeMirror(place, Hash.create({}, {
		lineNumbers: true,
		matchBrackets: true,
		indentUnit: 4,
		tabMode: 'shift',
		value: source.getText().replace(/\t/gi, '    ').match(
			// Remove first & last empty line
			/^\s*?[\n\r]?([\u0000-\uffff]*?)[\n\r]?\s*?$/)[1]
	}, options));
}

Code = HtmlElement.extend({
	_class: 'code',

	initialize: function() {
		// Only format this element if it is visible, otherwise wait until
		// it is made visible and then call initialize() manually.
		if (this.initialized || this.getBounds().height == 0)
			return;
		var that = this;
		var start = this.getProperty('start');
		var highlight = this.getProperty('highlight');
		var editor = createCodeMirror(function(el) {
			that.replaceWith(el);
		}, {
			lineNumbers: !this.hasParent('.resource-text'),
			firstLineNumber: (start || 1).toInt(),
			readOnly: true
		}, this);
		if (highlight) {
			var highlights = highlight.split(',');
			for (var i = 0, l = highlights.length; i < l; i++) {
				var highlight = highlights[i].split('-');
				var hlStart = highlight[0].toInt() - 1;
				var hlEnd = highlight.length == 2
						? highlight[1].toInt() - 1 : hlStart;
				if (start) {
					hlStart -= start - 1;
					hlEnd -= start - 1;
				}
				for (var j = hlStart; j <= hlEnd; j++) {
					editor.setLineClass(j, 'highlight');
				}
			}
		}
		this.initialized = true;
	}
});

PaperScript = HtmlElement.extend({
	_class: 'paperscript',

	initialize: function() {
		// Only format this element if it is visible, otherwise wait until
		// it is made visible and then call initialize() manually.
		if (this.initialized || this.getBounds().height == 0)
			return;
		var script = $('script', this),
			button = $('.button', this);
		if (!script || !button)
			return;
		var source = button.injectAfter('div', {
			className: 'source hidden'
		});
		var that = this,
			canvas = $('canvas', this),
			hasResize = canvas.getProperty('resize'),
			showSplit = this.hasClass('split'),
			sourceFirst = this.hasClass('source'),
			width, height,
			editor = null,
			hasBorders = true;

		function showSource(show) {
			source.modifyClass('hidden', !show);
			button.setText(show ? 'Run' : 'Source');
			if (show && !editor) {
				editor = createCodeMirror(source.$, {
					/*
					onKeyEvent: function(editor, event) {
						event = new DomEvent(event);
						if (event.type == 'keydown') {
							var pos = editor.getCursor();
							pos.ch += 4;
							editor.setCursor(pos);
							event.stop();
						}
					},
					*/
				}, script);
			}
		}

		function runScript() {
			var scope = paper.PaperScope.get(script.$);
			if (scope) {
				// Update script to edited version
				var code = editor.getValue();
				script.setText(code);
				// Keep a reference to the used canvas, since we're going to
				// fully clear the scope and initialize again with this canvas.
				var canvas = scope.view.canvas;
				// Clear scope first, then evaluate a new script.
				scope.clear();
				scope.initialize(canvas);
				scope.evaluate(code);
			}
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
			that.set({ width: width, height: height });
			source.set({
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
			// Remove padding
			button.setStyle('right',
				$('.CodeMirror', source).getScrollSize().height > height
					? 24 : 8);
		}

		if (hasResize) {
			// Delay the installing of the resize event, so paper.js installs
			// its own before us.
			(function() {
				$window.addEvents({
					resize: resize
				});
			}).delay(1);
			hasBorders = false;
			source.setStyles({
				borderWidth: '0 0 0 1px'
			});
		}

		if (showSplit) {
			showSource(true);
		} else if (sourceFirst) {
			toggleView();
		}

		button.addEvents({
			click: function(event) {
				if (showSplit) {
					runScript();
				} else {
					toggleView();
				}
				event.stop();
			},

			mousedown: function(event) {
				event.stop();
			}
		});
		this.initialized = true;
	}
});

var lastMemberId = null;
function toggleMember(id, scrollTo, dontScroll) {
	var link = $('#' + id + '-link');
	if (!link)
		return true;
	var desc = $('#' + id + '-description');
	var v = !link.hasClass('hidden');
	// Retrieve y-offset before any changes, so we can correct scrolling after
	var offset = (v ? link : desc).getOffset().y;
	if (lastMemberId && lastMemberId != id) {
		var prevId = lastMemberId;
		lastMemberId = null;
		toggleMember(prevId, false, true);
	}
	lastMemberId = v && id;
	link.modifyClass('hidden', v);
	desc.modifyClass('hidden', !v);
	if (!dontScroll) {
		// Correct scrolling relatively to where we are, by checking the amount
		// the element has shifted due to the above toggleMember call, and
		// correcting by 11px offset, caused by 1px border and 10px padding.
		var scroll = $window.getScrollOffset();
		$window.setScrollOffset(scroll.x, scroll.y
				+ (v ? desc : link).getOffset().y - offset + 11 * (v ? 1 : -1));
	}
	if (!desc.editor && v) {
		desc.editor = $$('pre.code, .paperscript', desc).each(function(code) {
			code.initialize();
		});
	}
	if (scrollTo)
		scrollToMember(id);
	return false;
}

function scrollToElement(id) {
	var e = $('#' + id + '-member');
	if (e) {
		if (e.hasClass('member'))
			toggleMember(id);
		var offs = e.getOffset();
		$window.setScrollOffset(offs);
	} else {
		window.location.hash = id;
	}
}

$document.addEvent('domready', function() {
	var h = unescape(window.location.hash);
	if (h) scrollToElement(h.substring(1));
	if (window.paper)
		paper.load();
});

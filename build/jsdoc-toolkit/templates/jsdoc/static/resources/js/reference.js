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
		// it is made visible and then call format() manually.
		if (this.getBounds().height != 0) {
			this.format();
		}
	},

	format: function() {
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
		return editor;
	}
});

PaperScript = HtmlElement.extend({
	_class: 'paperscript',

	initialize: function() {
		// Only format this element if it is visible, otherwise wait until
		// it is made visible and then call format() manually.
		if (this.getBounds().height != 0) {
			this.format();
		}
	},

	format: function() {
		var script = $('script', this),
			button = $('.button', this);
		if (!script || !button)
			return;
		var source = button.injectAfter('div', {
			className: 'source hidden'
		});
		var canvas = $('canvas', this),
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
				script.setText(editor.getValue());
				// Clear scope first, then evaluate a new script.
				scope.clear();
				scope.evaluate(script.$);
			}
		}

		function resize() {
			if (canvas.hasClass('hidden')) {
				// Can't get correct dimensions from hidden canvas,
				// so calculate again.
				var size = $window.getScrollSize();
				var offset = source.getOffset();
				width = size.width - offset.x;
				height = size.height - offset.y;
			} else {
				width = canvas.getWidth();
				height = canvas.getHeight();
			}
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

		if (canvas.getProperty('resize')) {
			$window.addEvents({
				resize: resize
			});
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
	}
});

$document.addEvent('domready', function() {
	var h = unescape(document.location.hash);
	if (h) scrollToElement(h.substring(1));
});

var lastMemberId = null;
function toggleMember(id, scrollTo) {
	if (lastMemberId && lastMemberId != id) {
		var prevId = lastMemberId;
		lastMemberId = null;
		toggleMember(prevId);
	}
	var link = $('#' + id + '-link');
	if (link) {
		var desc = $('#' + id + '-description');
		var v = !link.hasClass('hidden');
		lastMemberId = v && id;
		link.modifyClass('hidden', v);
		desc.modifyClass('hidden', !v);
		if (!desc.editor && v) {
			desc.editor = $$('pre.code, .paperscript', desc).each(function(code) {
				code.format();
			});
		}
		if (scrollTo)
			scrollToMember(id);
		return false;
	}
	return true;
}

function scrollToElement(id) {
	var e = $('#' + id);
	if (e) {
		var offs = e.getOffset();
		$window.setScrollOffset(offs);
		if (e.hasClass('member'))
			toggleMember(id);
	} else {
		document.location.hash = id;
	}
}

function togglePackage(id, def) {
	var e = $('#package-' + id);
	if (e) {
		var v = !e.hasClass('hidden');
		e.modifyClass('hidden', v);
		var img = document.images['arrow-' + id];
		if (img) img.src = img.src.replace(/open|close/, v ? 'close' : 'open');
	}
	return false;
}

function toggleThumbnail(id, over) {
	$('#' + id).modifyClass('hidden', over);
	$('#' + id + '_over').modifyClass('hidden', !over);
}

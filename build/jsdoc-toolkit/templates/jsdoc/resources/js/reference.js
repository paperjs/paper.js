// This is identical with server sided code
var lighterSettings = {
	altLines: 'hover',
	indent: 4,
	mode: 'ol',
	fuel: 'js',
	jsStyles: false
};

$document.addEvent('domready', function() {
	var h = unescape(document.location.hash);
	if (h) scrollToElement(h.substring(1));
	var code = $$('.text pre, .reference-class pre');
	if (code.length) {
		code.light(lighterSettings).each(function(obj, i) {
			var start =code[i].getProperty('start');
			if (start)
				obj.element.setProperty('start', start);
		});
	}
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
		if (!desc.code && v)
			desc.code = $$('pre', desc).light(lighterSettings);
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

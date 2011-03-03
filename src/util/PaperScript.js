var PaperScript = new function() {
	function compile(code) {
		return code;
	}

	function run(code) {
		// Use paper.extend() to create a paper scope within which the code is
		// evaluated.
		with (paper.extend()) {
			return eval(compile(code));
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
		addEventListener('DOMContentLoaded', runScripts, false);
	} else {
		attachEvent('onload', runScripts);
	}
//#endif // BROWSER

	return {
		compile: compile,
		run: run
	};
};

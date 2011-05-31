/** Called automatically by JsDoc Toolkit. */
function publish(symbolSet) {
	publish.conf = {  // trailing slash expected for dirs
		ext: '.html',
		outDir: JSDOC.opt.d || SYS.pwd + '../out/jsdoc/',
		templateDir: JSDOC.opt.t || SYS.pwd + '../templates/jsdoc/',
		staticDir: (JSDOC.opt.t || SYS.pwd + '../templates/jsdoc/') + 'static/',
		symbolsDir: 'packages/',
		srcDir: 'symbols/src/'
	};
	publish.conf.packagesDir = publish.conf.outDir + 'packages/';
	var templatesDir = publish.conf.templateDir + 'templates/';
	publish.templates = {
		_class: 'class.tmpl',
		method: 'method.tmpl',
		property: 'property.tmpl',
		parameters: 'parameters.tmpl',
		operators: 'operators.tmpl',
		returns: 'returns.tmpl',
		seeAlsos: 'see-alsos.tmpl',
		example: 'example.tmpl',
		constructor: 'constructor.tmpl',
		html: 'html.tmpl',
		allClasses: 'allClasses.tmpl',
		menu: 'packages.tmpl'
	};

	for (var i in publish.templates) {
		publish.templates[i] = new JSDOC.JsPlate(templatesDir +
				publish.templates[i]);
	}

	// Copy over the static files
	Utils.copyDirectory(
		new java.io.File(publish.conf.staticDir),
		new java.io.File(publish.conf.outDir)
	);

	// used to allow Link to check the details of things being linked to
	Link.symbolSet = symbolSet;

	// get an array version of the symbolset, useful for filtering
	var symbols = symbolSet.toArray(),
		files = JSDOC.opt.srcFiles,
		aliasSort = Utils.makeSortby('alias'),
 		classes = symbols.filter(Utils.isaClass).sort(aliasSort);
	
	// create a filemap in which outfiles must be to be named uniquely, ignoring case
	if (JSDOC.opt.u) {
		var filemapCounts = {};
		Link.filemap = {};
		for (var i = 0, l = classes.length; i < l; i++) {
			var lcAlias = classes[i].alias.toLowerCase();
			
			if (!filemapCounts[lcAlias]) {
				filemapCounts[lcAlias] = 1;
			} else {
				filemapCounts[lcAlias]++;
			}
			
			Link.filemap[classes[i].alias] =  (filemapCounts[lcAlias] > 1) ?
				lcAlias + '_' + filemapCounts[lcAlias] : lcAlias;
		}
	}
	
	Link.base = '../';

	// create each of the class pages
	for (var i = 0, l = classes.length; i < l; i++) {
		var symbol = classes[i];
		
		symbol.events = symbol.getEvents();   // 1 order matters
		symbol.methods = symbol.getMethods(); // 2
		for (var j = 0; j < symbol.methods.length; j++) {
			var method = symbol.methods[j];
			method.isOperator = Operator.isOperator(method);
		}
		
		Link.currentSymbol= symbol;
		var html = publish.templates.html.process({
			content: publish.templates._class.process(symbol),
			title: symbol.alias
		});
		var name = ((JSDOC.opt.u)? Link.filemap[symbol.alias] : symbol.alias)
				+ publish.conf.ext;
		IO.saveFile(publish.conf.packagesDir, name, html);
	}
	
	Utils.publishMenu();
}

var Operator = new function() {
	var operators = {
		add: '+', subtract: '-', multiply: '*', divide: '/', equals: '==',
		modulo: '%'
	};
	var operatorNames = {
		add: 'Addition', subtract: 'Subtraction', multiply: 'Multiplication',
		divide: 'Division', equals: 'Comparison', modulo: 'Modulo'
	};
	
	return {
		isOperator: function(symbol) {
			// As a convention, only add non static bean properties to
			// the documentation. static properties are all supposed to
			// be uppercase and constants.
			return symbol.params.length == 1 && !symbol.isStatic && (
					/^(add|subtract|multiply|divide|modulo)(\^[0-9])*$/.test(symbol.name)
					&& (symbol.operator != 'none')
				) || ( // equals
					symbol.name == 'equals'
					&& symbol.returns.length && symbol.returns[0].type == 'boolean'
				);
		},

		getOperator: function(symbol) {
			return operators[symbol.name.replace(/\^[0-9]$/,'')];
		}
	};
};

var Utils = {
	getSymbolId: function(symbol) {
		var id = [symbol.name.toLowerCase().replace(/[\^][0-9]/g, '')];
		if (symbol.params) {
			for (var i = 0, l = symbol.params.length; i < l; i++) {
				var param = symbol.params[i];
				if (!param.isOptional)
					id.push(param.name);
			}
		}
		return id.join('-');
	},
	
	getConstructorId: function(symbol) {
		var id = [symbol.alias.replace(/([#].+$|[\^][0-9])/g, '').toLowerCase()
				.replace(/[.]/, '-')];
		if (symbol.params) {
			for (var i = 0, l = symbol.params.length; i < l; i++) {
				var param = symbol.params[i];
				if (!param.isOptional)
					id.push(param.name);
			}
		}
		return id.join('-');
	},
	
	isaClass: function(symbol) {
		return symbol.is('CONSTRUCTOR') || symbol.isNamespace;
	},
	
	parseExamples: function(symbol) {
		var out = [],
			examples = symbol.example;
		for (var i = 0, l = examples.length; i < l; i++) {
			var example = examples[i],
				lines = example.toString().split('\n'),
				description = [];
			// The description is the first commented lines:
			while (/^[\/]{2}/.test(lines[0])) {
				description.push(lines.shift().replace('// ', ''));
			}
			out.push(publish.templates.example.process({
				description: description.join(' ').trim(),
				code: lines.join('\n').trim()
			}));
		}
		return out.join('\n');
	},
	
	stripTags: function(str, tag) {
		var tag = tag || '.*?'; // Default: all tags
		return str.replace(new RegExp('<' + tag + '>|</' + tag + '>', 'g'), '');
	},
	
	copyDirectory: function(sourceLocation, targetLocation) {
		if (sourceLocation.isDirectory()) {
			if (!targetLocation.exists()) {
				targetLocation.mkdir();
			}

			var children = sourceLocation.list();
			for (var i = 0; i < children.length; i++) {
				Utils.copyDirectory(new File(sourceLocation, children[i]),
						new File(targetLocation, children[i]));
			}
		} else {
			// Copy the file with FileChannels:
			targetLocation.createNewFile();
			var src = new java.io.FileInputStream(sourceLocation).getChannel();
			var dst = new java.io.FileOutputStream(targetLocation).getChannel();
			var amount = dst.transferFrom(src, 0, src.size());
			src.close();
			dst.close();
		}
	},

	processGroupTitle: function(str, symbol) {
		var groupTitle = str.match(/\{@grouptitle ([^}]+)\}/);
		if (groupTitle) {
			symbol.groupTitle = groupTitle[1];
			str = str.replace(/\{@grouptitle ([^}]+)\}/, '');
		}
		return str;
	},

	publishMenu: function() {
		load(JSDOC.opt.t + 'classLayout.js');
		function parseClassNames(classNames) {
			var out = '';
			for (var i = 0, l = classNames.length; i < l; i++) {
				if (typeof classNames[i] == 'string') {
					var name = classNames[i];
					out += (name == 'ruler') ? getRuler() : getLink(name);
				} else {
					for (var j in classNames[i]) {
						out += getHeading(j);
						out += parseClassNames(classNames[i][j]);
					}
				}
			}
			return out;
		}
		function getLink(name) {
			var link = name;
			if (name.indexOf(':') > 0) {
				var names = name.split(':');
				name = names[0];
				link = names[1];
			}
			return '<li><a href="' + link + '.html">' + name + '</a></li>';
		}

		function getRuler() {
			return '<li><hr /></li>';
		}

		function getHeading(title) {
			return '<li><h3>' + title + '</h3></li>';
		}
		var first = true,
			out = '<ul class="package-classes">';
		for (var i in classLayout) {
			out += '<li' + (first ? ' class="first">' : '>');
			out += '<h2>' + i + '</h2></li>';
			out += parseClassNames(classLayout[i]);
			first = false;
		}
		out += '</ul>';

		var classesIndex = publish.templates.menu.process(out);
		IO.saveFile(publish.conf.packagesDir, 'packages.html', classesIndex);
	},

	makeSortby: function(attribute) {
		return function(a, b) {
			if (a[attribute] != undefined && b[attribute] != undefined) {
				a = a[attribute].toLowerCase();
				b = b[attribute].toLowerCase();
				if (a < b) return -1;
				if (a > b) return 1;
				return 0;
			}
		};
	},

	/** Pull in the contents of an external file at the given path. */
	include: function(path) {
		var path = publish.conf.templateDir + path;
		return IO.readFile(path);
	},

	processInlineTags: function(str, param) {
		if (!param)
			param = {};
		// <code>..</code> -> <pre>..</pre>
		str = str.replace(/<(\/)*(code)>/g, '<$1pre>');

		// <pre> -> <pre class="code">
		str = str.replace(/<pre>/g, '<pre class="code">');

		// {@link ...} -> html links
		str = str.replace(/\{@link ([^} ]+) ?\}/gi,
			function(match, symbolName) {
				return new Link().toSymbol(symbolName.replace(/[\^]/g, '-'));
			}
		);
		// {@code ...} -> code blocks
		str = str.replace(/\{@code[\s]([^}]+)\}/gi,
			function(match, code) {
				return '<tt>' + code + '</tt>';
			}
		);

		// {@true ...} -> true if.. false otherwise..
		str = str.replace(/\{@true[\s]([^}]+)\}/gi,
			function(match, text) {
				return '<tt>true</tt> ' + text + ', <tt>false</tt> otherwise';
			}
		);

		var lineBreak = java.lang.System.getProperty('line.separator');

		// Convert any type of lineBreak to the one we're using now:
		str = str.replace(/(\r\n|\n|\r)/g, function(match, lineBreak) {
			return lineBreak;
		});

		// Replace inline <code></code> with <tt></tt>
		str = str.replace(/<code>[ \t]*([^\n\r]*?)[ \t]*<\/code>/g, function(match, content) {
			return '<tt>' + content + '</tt>';
		});

		// Put code and pre tags on the same line as the content, as white-space: pre is set:
		str = str.replace(/(<(?:code|pre)>)\s*([\u0000-\uffff]*?)\s*(<\/(?:code|pre)>)/g, function(match, open, content, close) {
			// Filter out the first white space at the beginning of each line, since
			// that stems from the space after the * in the comment and replace <code>
			// with <pre>, to fix a IE problem where lighter.js does not receive
			// linebreaks from code tags weven when white-space: pre is set.
			return '<pre>' + content.replace(/(\r\n|\n|\r) /mg, function(match, lineBreak) {
				return lineBreak;
			}) + '</pre>';
		});
		// Empty lines -> Paragraphs
		if (!param.stripParagraphs) {
			if (param.wrapInParagraphs === undefined || param.wrapInParagraphs)
				str = '<p>' + str.trim() + '</p>';
			str = str.trim().replace(/(\r\n|\n|\r)\s*(\r\n|\n|\r)/g, function(match, lineBreak) {
				return '</p>' + lineBreak + '<p>';
			});
			// Automatically put </p><p> at the end of sentences with line breaks.
			// Match following </p> and <p> tags and swallow them. This happens when
			// the original content contains these.
			str = str.trim().replace(/([.:?!;])\s*(\r\n|\n|\r)(\s*)(<\/p>|<p>|)/g, function(match, before, lineBreak, whiteSpace, after) {
				// Include following whiteSpace as well, since for code blocks they are relevant (e.g. indentation on new line)
				return before + '</p>' + lineBreak + whiteSpace + '<p>';
			});
			// Filter out <p> tags within and around <code> and <pre> blocks again
			str = str.replace(/((?:<p>\s*|)<(?:code|pre)[^>]*>[\u0000-\uffff]*<\/(?:code|pre)>(?:\s*<\/p>|))/g, function(match, code) {
				return Utils.stripTags(code, 'p');
			});
			// Filter out empty paragraphs
			str = str.replace(/<p><\/p>/g, '');
		}

		return str;
	},

	/** Build output for displaying function parameters. */
	makeSignature: function(params) {
		if (!params) return '()';
		var postString = '';
		var first = true;
		params = params.filter(
			function($) {
				return $.name.indexOf('.') == -1; // don't show config params in signature
			}
		);
		var signature = '';
		var postSignature = '';
		for (var i = 0, l = params.length; i < l; i++) {
			var param = params[i];
			if (param.isOptional) {
				signature += '[';
				postSignature += ']';
			}
			if (i > 0)
				signature += ', ';
			signature += param.name;
		}
		return '(' + signature + postSignature + ')';
	}
};
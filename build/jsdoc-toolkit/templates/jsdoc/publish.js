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
	}
}

var Helpers = {
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
		return symbol.is('CONSTRUCTOR') || symbol.isNamespace
	}
};

/** Called automatically by JsDoc Toolkit. */
function publish(symbolSet) {
	publish.conf = {  // trailing slash expected for dirs
		ext: '.html',
		outDir:	  JSDOC.opt.d || SYS.pwd + '../out/jsdoc/',
		templateDir: JSDOC.opt.t || SYS.pwd + '../templates/jsdoc/',
		resourcesDir:  (JSDOC.opt.t || SYS.pwd + '../templates/jsdoc/') + 'resources/',
		symbolsDir:  'symbols/',
		srcDir:	  'symbols/src/'
	};

	var templatesDir = publish.conf.templateDir + 'templates/';
	publish.templates = {
		_class: 'class.tmpl',
		method: 'method.tmpl',
		property: 'property.tmpl',
		parameters: 'parameters.tmpl',
		operators: 'operators.tmpl',
		examples: 'examples.tmpl',
		constructor: 'constructor.tmpl',
		html: 'html.tmpl',
		allClasses: 'allClasses.tmpl',
		classesIndex: 'index.tmpl'
	};

	for (var i in publish.templates) {
		publish.templates[i] = new JSDOC.JsPlate(templatesDir +
				publish.templates[i]);
	}

	// Copy over the static files
	copyDirectory(
		new java.io.File(publish.conf.resourcesDir),
		new java.io.File(publish.conf.outDir + 'resources/')
	);

	// used to allow Link to check the details of things being linked to
	Link.symbolSet = symbolSet;

	// get an array version of the symbolset, useful for filtering
	var symbols = symbolSet.toArray(),
		files = JSDOC.opt.srcFiles,
 		classes = symbols.filter(Helpers.isaClass).sort(makeSortby('alias'));
	
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
	
	// create a class index, displayed in the left-hand column of every class page
	Link.base = '../';
 	publish.conf.classesIndex = publish.templates.allClasses.process(classes); // kept in memory
	
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
		})
		var name = ((JSDOC.opt.u)? Link.filemap[symbol.alias] : symbol.alias)
				+ publish.conf.ext;
		IO.saveFile(publish.conf.outDir + 'symbols/', name, html);
	}
	
	// regenerate the index with different relative links, used in the index pages
	Link.base = '';
	publish.conf.classesIndex = publish.templates.allClasses.process(classes);
	
	var classesIndex = publish.templates.classesIndex.process(classes);
	IO.saveFile(publish.conf.outDir, 'index' + publish.conf.ext, classesIndex);
}

/** Make a symbol sorter by some attribute. */
function makeSortby(attribute) {
	return function(a, b) {
		if (a[attribute] != undefined && b[attribute] != undefined) {
			a = a[attribute].toLowerCase();
			b = b[attribute].toLowerCase();
			if (a < b) return -1;
			if (a > b) return 1;
			return 0;
		}
	}
}

/** Pull in the contents of an external file at the given path. */
function include(path) {
	var path = publish.conf.templateDir + path;
	return IO.readFile(path);
}

/** Build output for displaying function parameters. */
function makeSignature(params) {
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

function processGroupTitle(str, symbol) {
	var groupTitle = str.match(/\{@grouptitle ([^}]+)\}/);
	if (groupTitle) {
		symbol.groupTitle = groupTitle[1];
		str = str.replace(/\{@grouptitle ([^}]+)\}/, '');
	}
	return str;
}

function processInlineTags(str, param) {
	if (!param)
		param = {};
	// <code>..</code> -> <pre>..</pre>
	str = str.replace(/<(\/)*(code)>/g, '<$1pre>');

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
			return stripTags(code, 'p');
		});
		// Filter out empty paragraphs
		str = str.replace(/<p><\/p>/g, '');
	}
	
	return str;
}

function stripTags(str, tag) {
	var tag = tag || '.*?'; // Default: all tags
	return str.replace(new RegExp('<' + tag + '>|</' + tag + '>', 'g'), '');
}

function copyDirectory(sourceLocation, targetLocation) {
	if (sourceLocation.isDirectory()) {
		if (!targetLocation.exists()) {
			targetLocation.mkdir();
		}
		
		var children = sourceLocation.list();
		for (var i = 0; i < children.length; i++) {
			copyDirectory(new File(sourceLocation, children[i]),
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
}
var templates;

var Operator = new function() {
	var operators = {
		add: '+', subtract: '-', multiply: '*', divide: '/', equals: '==',
		modulo: '%'
	};
	var operatorNames = {
		add: 'Addition', subtract: 'Subtraction', multiply: 'Multiplication',
		divide: 'Division', equals: 'Comparison', modulo: 'Modulo'
	};
	
	var operatorClasses = {
		Point: true,
		Size: true
	};
	
	return {
		isOperator: function(symbol) {
			// As a convention, only add non static bean properties to
			// the documentation. static properties are all supposed to
			// be uppercae and constants.
			if (symbol.operator == 'none')
				print(!(symbol.operator && symbol.operator != 'none'));
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
	}
};

/** Called automatically by JsDoc Toolkit. */
function publish(symbolSet) {
	publish.conf = {  // trailing slash expected for dirs
		ext:		 ".html",
		outDir:	  JSDOC.opt.d || SYS.pwd+"../out/jsdoc/",
		templatesDir: JSDOC.opt.t || SYS.pwd+"../templates/jsdoc/",
		symbolsDir:  "symbols/",
		srcDir:	  "symbols/src/"
	};
	
	templates = {
		_class: new JSDOC.JsPlate(publish.conf.templatesDir + "class.tmpl"),
		method: new JSDOC.JsPlate(publish.conf.templatesDir + "method.tmpl"),
		property: new JSDOC.JsPlate(publish.conf.templatesDir + "property.tmpl"),
		parameters: new JSDOC.JsPlate(publish.conf.templatesDir + "parameters.tmpl"),
		operators: new JSDOC.JsPlate(publish.conf.templatesDir + "operators.tmpl"),
		examples: new JSDOC.JsPlate(publish.conf.templatesDir + "examples.tmpl")
	};
	
	// is source output is suppressed, just display the links to the source file
	if (JSDOC.opt.s && defined(Link) && Link.prototype._makeSrcLink) {
		Link.prototype._makeSrcLink = function(srcFilePath) {
			return "&lt;"+srcFilePath+"&gt;";
		}
	}

	// Copy over the static files
	copyDirectory(
		new java.io.File(publish.conf.templatesDir + 'resources/'),
		new java.io.File(publish.conf.outDir + 'resources/')
	);
	
	// used to allow Link to check the details of things being linked to
	Link.symbolSet = symbolSet;

	// create the required templates
	try {
		var classTemplate = new JSDOC.JsPlate(publish.conf.templatesDir+"class.tmpl");
		var classesTemplate = new JSDOC.JsPlate(publish.conf.templatesDir+"allclasses.tmpl");
	}
	catch(e) {
		print("Couldn't create the required templates: "+e);
		quit();
	}
	
	// some ustility filters
	function hasNoParent($) {return ($.memberOf == "")}
	function isaFile($) {return ($.is("FILE"))}
	function isaClass($) {return ($.is("CONSTRUCTOR") || $.isNamespace)}
	
	// get an array version of the symbolset, useful for filtering
	var symbols = symbolSet.toArray();
	
	// create the hilited source code files
	var files = JSDOC.opt.srcFiles;
	 	for (var i = 0, l = files.length; i < l; i++) {
	 		var file = files[i];
	 		var srcDir = publish.conf.outDir + "symbols/src/";
		makeSrcFile(file, srcDir);
	 	}
 	
 	// get a list of all the classes in the symbolset
 	var classes = symbols.filter(isaClass).sort(makeSortby("alias"));
	
	// create a filemap in which outfiles must be to be named uniquely, ignoring case
	if (JSDOC.opt.u) {
		var filemapCounts = {};
		Link.filemap = {};
		for (var i = 0, l = classes.length; i < l; i++) {
			var lcAlias = classes[i].alias.toLowerCase();
			
			if (!filemapCounts[lcAlias]) filemapCounts[lcAlias] = 1;
			else filemapCounts[lcAlias]++;
			
			Link.filemap[classes[i].alias] = 
				(filemapCounts[lcAlias] > 1)?
				lcAlias+"_"+filemapCounts[lcAlias] : lcAlias;
		}
	}
	
	// create a class index, displayed in the left-hand column of every class page
	Link.base = "../";
 	publish.classesIndex = classesTemplate.process(classes); // kept in memory
	
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
		var output = "";
		output = classTemplate.process(symbol);
		
		IO.saveFile(publish.conf.outDir+"symbols/", ((JSDOC.opt.u)? Link.filemap[symbol.alias] : symbol.alias) + publish.conf.ext, output);
	}
	
	// regenerate the index with different relative links, used in the index pages
	Link.base = "";
	publish.classesIndex = classesTemplate.process(classes);
	
	// create the class index page
	try {
		var classesindexTemplate = new JSDOC.JsPlate(publish.conf.templatesDir+"index.tmpl");
	}
	catch(e) { print(e.message); quit(); }
	
	var classesIndex = classesindexTemplate.process(classes);
	IO.saveFile(publish.conf.outDir, "index"+publish.conf.ext, classesIndex);
	classesindexTemplate = classesIndex = classes = null;
	
	// create the file index page
	try {
		var fileindexTemplate = new JSDOC.JsPlate(publish.conf.templatesDir+"allfiles.tmpl");
	}
	catch(e) { print(e.message); quit(); }
	
	var documentedFiles = symbols.filter(isaFile); // files that have file-level docs
	var allFiles = []; // not all files have file-level docs, but we need to list every one
	
	for (var i = 0; i < files.length; i++) {
		allFiles.push(new JSDOC.Symbol(files[i], [], "FILE", new JSDOC.DocComment("/** */")));
	}
	
	for (var i = 0; i < documentedFiles.length; i++) {
		var offset = files.indexOf(documentedFiles[i].alias);
		allFiles[offset] = documentedFiles[i];
	}
		
	allFiles = allFiles.sort(makeSortby("name"));

	// output the file index page
	var filesIndex = fileindexTemplate.process(allFiles);
	IO.saveFile(publish.conf.outDir, "files"+publish.conf.ext, filesIndex);
	fileindexTemplate = filesIndex = files = null;
}


/** Just the first sentence (up to a full stop). Should not break on dotted variable names. */
function summarize(desc) {
	if (typeof desc != "undefined")
		return desc.match(/([\w\W]+?\.)[^a-z0-9_$]/i)? RegExp.$1 : desc;
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
	var path = publish.conf.templatesDir+path;
	return IO.readFile(path);
}

/** Turn a raw source file into a code-hilited page in the docs. */
function makeSrcFile(path, srcDir, name) {
	if (JSDOC.opt.s) return;
	
	if (!name) {
		name = path.replace(/\.\.?[\\\/]/g, "").replace(/[\\\/]/g, "_");
		name = name.replace(/\:/g, "_");
	}
	
	var src = {path: path, name:name, charset: IO.encoding, hilited: ""};
	
	if (defined(JSDOC.PluginManager)) {
		JSDOC.PluginManager.run("onPublishSrc", src);
	}

	if (src.hilited) {
		IO.saveFile(srcDir, name+publish.conf.ext, src.hilited);
	}
}

/** Build output for displaying function parameters. */
function makeSignature(params) {
	if (!params) return "()";
	var postString = '';
	var first = true;
	params = params.filter(
		function($) {
			return $.name.indexOf(".") == -1; // don't show config params in signature
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
	// if (/grouptitle/.test(str))
	// 	print('yeah');
	// print(str);
	var groupTitle = str.match(/\{@grouptitle ([^}]+)\}/);
	if (groupTitle) {
		symbol.groupTitle = groupTitle[1];
		str = str.replace(/\{@grouptitle ([^}]+)\}/, '');
	}
	return str;
}

function processInlineTags(str) {

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
	return str;
}

function copyStatic(dir) {
	var dir = publish.conf.templatesDir + 'resources/';
	
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
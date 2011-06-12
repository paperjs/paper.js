/** Called automatically by JsDoc Toolkit. */
load(JSDOC.opt.t + 'src/Symbol.js');
load(JSDOC.opt.t + 'src/Utils.js');
load(JSDOC.opt.t + 'src/Operator.js');
load(JSDOC.opt.t + 'src/Render.js');

function publish(symbolSet) {
	var renderMode = JSDOC.opt.D.renderMode;
	var templates = renderMode == 'templates';
	var extension = '.html';
	var templateDir = JSDOC.opt.t || SYS.pwd + '../templates/jsdoc/';
	var outDir = JSDOC.opt.d || SYS.pwd + '../dist/docs/';

	publish.conf = {  // trailing slash expected for dirs
		// Use no extensions in links for templates
		ext: templates ? '' : extension,
		outDir: outDir,
		templateDir: templateDir,
		staticDir: templateDir + 'static/',
		classesDir: outDir + 'classes/',
		symbolsDir: templates ? 'reference/' : 'classes/',
		srcDir: 'symbols/src/',
		renderMode: renderMode,
		globalName: 'Global Scope'
	};
	
	Link.base = templates ? '/' : '../';

	if (renderMode == 'docs') {
		// Copy over the static files
		Utils.copyDirectory(
			new java.io.File(publish.conf.staticDir),
			new java.io.File(publish.conf.outDir)
		);
	} else {
		Utils.deleteFiles(new File(publish.conf.outDir));
	}
	// Create the classes directory
	new java.io.File(publish.conf.classesDir).mkdirs();

	// used to allow Link to check the details of things being linked to
	Link.symbolSet = symbolSet;

	// get an array version of the symbolset, useful for filtering
	var symbols = symbolSet.toArray(),
		files = JSDOC.opt.srcFiles,
		aliasSort = Utils.makeSortby('alias'),
 		classes = symbols.filter(Utils.isaClass).sort(aliasSort);
	
	// create a filemap in which outfiles must be to be named uniquely, ignoring case
	// Since we want lowercase links in templates, we always use this
	var filemapCounts = {};
	Link.filemap = {};
	for (var i = 0, l = classes.length; i < l; i++) {
		var alias = classes[i].alias,
			lcAlias = alias.toLowerCase();
		
		if (!filemapCounts[lcAlias]) {
			filemapCounts[lcAlias] = 1;
		} else {
			filemapCounts[lcAlias]++;
		}
		// Use lowercase links for templates
		var linkAlias = templates ? lcAlias : alias;
		// Rename _global_.html to global.html
		if (linkAlias == '_global_')
			linkAlias = 'global';
		Link.filemap[alias] = filemapCounts[lcAlias] > 1
				? linkAlias + '_' + filemapCounts[lcAlias] : linkAlias;
	}

	// create each of the class pages
	for (var i = 0, l = classes.length; i < l; i++) {
		var symbol = classes[i];
		
		symbol.events = symbol.getEvents();   // 1 order matters
		symbol.methods = symbol.getMethods(); // 2
		for (var j = 0; j < symbol.methods.length; j++) {
			var method = symbol.methods[j];
			method.isOperator = Operator.isOperator(method);
		}
		
		Link.currentSymbol = symbol;
		var html = Render._class(symbol);
		var name = Link.filemap[symbol.alias] + extension;
		if (renderMode == 'docs') {
			html = Render.html({
				content: html,
				title: symbol.alias
			});
		}
		IO.saveFile(publish.conf.classesDir, name, html);
	}
	if (templates) {
		IO.saveFile(publish.conf.outDir, 'packages.js', Render.packages());
	} else {
		IO.saveFile(publish.conf.classesDir, 'index.html', Render.index());
	}
}
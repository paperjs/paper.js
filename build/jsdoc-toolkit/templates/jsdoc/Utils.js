var Utils = {
	isaClass: function(symbol) {
		return symbol.is('CONSTRUCTOR') || symbol.isNamespace;
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

	deleteFiles: function(path) {
		if (path.isDirectory()) {
			var files = path.listFiles();
			for (var i = 0, l = files.length; i < l; i++) {
				Utils.deleteFiles(files[i]);
			}
		}
		if (!path['delete']())
			throw Error('Could not delete ' + path);
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
			return '<li><a href="' + link + '.html">' + name + '</a></li>\n';
		}

		function getRuler() {
			return '<li><hr /></li>\n';
		}

		function getHeading(title) {
			return '<li><h3>' + title + '</h3></li>\n';
		}
		var first = true,
			out = '<ul class="package-classes">';
		for (var i in classLayout) {
			out += '<li' + (first ? ' class="first">' : '>');
			out += '<h2>' + i + '</h2></li>\n';
			out += parseClassNames(classLayout[i]);
			first = false;
		}
		out += '</ul>';

		var classesIndex = Render.menu(out);
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
	}
};
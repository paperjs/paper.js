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
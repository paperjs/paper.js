var context = require('vm').createContext({
	options: {
		server: true,
		version: 'dev'
	},
	Canvas: require('canvas'),
    console: console,
	require: require,
	include: function(uri) {
		var source = require('fs').readFileSync(__dirname + '/' + uri);
		// For relative includes, we save the current directory and then add
		// the uri directory to __dirname:
		var oldDirname = __dirname;
		__dirname = __dirname + '/' + uri.replace(/[^/]+$/, '');
		require('vm').runInContext(source, context, uri);
		__dirname = oldDirname;
	}
});

context.include('paper.js');

context.Base.each(context, function(val, key) {
	if (val && val.prototype instanceof context.Base) {
		val._name = key;
		// Export all classes through PaperScope:
		context.PaperScope.prototype[key] = val;
	}
});
context.PaperScope.prototype['Canvas'] = context.Canvas;

module.exports = new context.PaperScope();
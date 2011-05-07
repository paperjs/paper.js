module('Compound Path');

test('moveTo / lineTo', function() {
	var doc = new Document(canvas);
	var path = new CompoundPath();

	var lists = [
		[new Point(279, 151), new Point(149, 151), new Point(149, 281), new Point(279, 281)],
		[new Point(319, 321), new Point(109, 321), new Point(109, 111), new Point(319, 111)]
	];

	for (var i = 0; i < lists.length; i++) {
		var list = lists[i];
		for (var j = 0; j < list.length; j++) {
			path[j == 0 ? 'moveTo' : 'lineTo'](list[j]);
		}
	}

	path.fillColor = 'black';
	
	equals(function() {
		return path.children.length;
	}, 2));
});
module('Path Style');

test('currentStyle', function() {
	var doc = new Doc();
	doc.currentStyle.fillColor = 'black';
	var path = new Path();
	compareRGBColors(path.fillColor, 'black');
	
	// When changing the current style of the document, the style of
	// paths created using document.currentStyle should not change.
	doc.currentStyle.fillColor = 'red';
	compareRGBColors(path.fillColor, 'black');
});

test('setting currentStyle to an object', function() {
	var doc = new Doc();
	doc.currentStyle = {
		fillColor: 'red',
		strokeColor: 'green'
	};
	var path = new Path();
	compareRGBColors(path.fillColor, 'red');
	compareRGBColors(path.strokeColor, 'green');
});

test('setting path styles to an object', function() {
	var doc = new Doc();
	var path = new Path();
	path.style = {
		fillColor: 'red',
		strokeColor: 'green'
	};
	compareRGBColors(path.fillColor, 'red');
	compareRGBColors(path.strokeColor, 'green');
});

test('setting group styles to an object', function() {
	var doc = new Doc();
	var group = new Group();
	var path = new Path();
	group.appendTop(path);
	group.style = {
		fillColor: 'red',
		strokeColor: 'green'
	};
	compareRGBColors(path.fillColor, 'red');
	compareRGBColors(path.strokeColor, 'green');
});

test('getting group styles', function() {
	var doc = new Doc();
	var group = new Group();
	var path = new Path();
	path.fillColor = 'red';
	group.appendTop(path);

	compareRGBColors(group.fillColor, 'red');
	
	var secondPath = new Path();
	secondPath.fillColor = 'black';
	group.appendTop(secondPath);
	
	// the group now contains two paths with different fillColors and therefore
	// should return null:
	equals(group.fillColor, null);
	
	//If we remove the first path, it should now return 'black':
	group.children[0].remove();
	compareRGBColors(group.fillColor, 'black');
});

test('setting group styles', function() {
	var doc = new Doc();
	var group = new Group();
	var path = new Path();
	path.fillColor = 'red';
	group.appendTop(path);

	var secondPath = new Path();
	secondPath.fillColor = 'blue';
	secondPath.strokeColor = 'red';
	group.appendTop(secondPath);
	
	// Change the fill color of the group:
	group.fillColor = 'black';
	
	// the paths contained in the group should now both have their fillColor
	// set to black:
	compareRGBColors(path.fillColor, 'black');
	compareRGBColors(secondPath.fillColor, 'black');
	
	// The second path still has its strokeColor set to red:
	compareRGBColors(secondPath.strokeColor, 'red');
});

test('setting group styles 2', function() {
	var doc = new Doc();
	var group = new Group();
	var path = new Path();
	path.fillColor = 'red';
	group.appendTop(path);
	
	compareRGBColors(group.fillColor, 'red');
	
	var secondPath = new Path();
	secondPath.fillColor = 'blue';
	secondPath.strokeColor = 'red';
	group.appendTop(secondPath);
	
	compareRGBColors(secondPath.fillColor, 'blue');
	compareRGBColors(secondPath.strokeColor, 'red');

	// By appending a path with a different fillcolor,
	// the group's fillColor should return null:
	equals(group.fillColor, null);
	
	// But, both paths have a red strokeColor, so:
	compareRGBColors(group.strokeColor, 'red');
	
	// Change the fill color of the group's style:
	group.style.fillColor = 'black';
	
	// the paths contained in the group should now both have their fillColor
	// set to black:
	compareRGBColors(path.fillColor, 'black');
	compareRGBColors(secondPath.fillColor, 'black');
	
	// The second path still has its strokeColor set to red:
	compareRGBColors(secondPath.strokeColor, 'red');
});
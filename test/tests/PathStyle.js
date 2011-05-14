module('Path Style');

test('currentStyle', function() {
	paper.document.currentStyle.fillColor = 'black';
	var path = new Path();
	compareRGBColors(path.fillColor, 'black', 'path.fillColor');
	
	// When changing the current style of the document, the style of
	// paths created using document.currentStyle should not change.
	paper.document.currentStyle.fillColor = 'red';
	compareRGBColors(path.fillColor, 'black', 'path.fillColor');
});

test('setting currentStyle to an object', function() {
	paper.document.currentStyle = {
		fillColor: 'red',
		strokeColor: 'green'
	};
	var path = new Path();
	compareRGBColors(path.fillColor, 'red', 'path.fillColor');
	compareRGBColors(path.strokeColor, 'green', 'path.strokeColor');
});

test('setting path styles to an object', function() {
	var path = new Path();
	path.style = {
		fillColor: 'red',
		strokeColor: 'green'
	};
	compareRGBColors(path.fillColor, 'red', 'path.fillColor');
	compareRGBColors(path.strokeColor, 'green', 'path.strokeColor');
});

test('setting group styles to an object', function() {
	var group = new Group();
	var path = new Path();
	group.appendTop(path);
	group.style = {
		fillColor: 'red',
		strokeColor: 'green'
	};
	compareRGBColors(path.fillColor, 'red', 'path.fillColor');
	compareRGBColors(path.strokeColor, 'green', 'path.strokeColor');
});

test('getting group styles', function() {
	var group = new Group();
	var path = new Path();
	path.fillColor = 'red';
	group.appendTop(path);

	compareRGBColors(group.fillColor, 'red', 'group.fillColor');
	
	var secondPath = new Path();
	secondPath.fillColor = 'black';
	group.appendTop(secondPath);
	
	// the group now contains two paths with different fillColors and therefore
	// should return undefined:
	equals(function() {
		return group.fillColor;
	}, undefined);
	
	//If we remove the first path, it should now return 'black':
	group.children[0].remove();
	compareRGBColors(group.fillColor, 'black', 'group.fillColor');
});

test('setting group styles', function() {
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
	compareRGBColors(path.fillColor, 'black', 'path.fillColor');
	compareRGBColors(secondPath.fillColor, 'black', 'secondPath.fillColor');
	
	// The second path still has its strokeColor set to red:
	compareRGBColors(secondPath.strokeColor, 'red', 'secondPath.strokeColor');
});

test('setting group styles 2', function() {
	var group = new Group();
	var path = new Path();
	path.fillColor = 'red';
	group.appendTop(path);
	
	compareRGBColors(group.fillColor, 'red', 'group.fillColor');
	
	var secondPath = new Path();
	secondPath.fillColor = 'blue';
	secondPath.strokeColor = 'red';
	group.appendTop(secondPath);
	
	compareRGBColors(secondPath.fillColor, 'blue', 'secondPath.fillColor');
	compareRGBColors(secondPath.strokeColor, 'red', 'secondPath.strokeColor');

	// By appending a path with a different fillcolor,
	// the group's fillColor should return undefined:
	equals(function() {
		return group.fillColor;
	}, undefined);
	
	// But, both paths have a red strokeColor, so:
	compareRGBColors(group.strokeColor, 'red', 'group.strokeColor');
	
	// Change the fill color of the group's style:
	group.style.fillColor = 'black';
	
	// the paths contained in the group should now both have their fillColor
	// set to black:
	compareRGBColors(path.fillColor, 'black', 'path.fillColor');
	compareRGBColors(secondPath.fillColor, 'black', 'secondPath.fillColor');
	
	// The second path still has its strokeColor set to red:
	compareRGBColors(secondPath.strokeColor, 'red', 'secondPath.strokeColor');
});
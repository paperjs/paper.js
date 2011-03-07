var id = '?' + Math.random();
load(
	'lib/bootstrap.js' + id,
	'lib/parse-js.js' + id
).then(
	'src/paper.js' + id
).then(
	'src/basic/Point.js' + id,
	'src/basic/Size.js' + id,
	'src/basic/Rectangle.js' + id,
	'src/basic/Matrix.js' + id,
	'src/basic/Line.js' + id
).then(
	'src/document/DocumentView.js' + id,
	'src/document/Document.js' + id,
	'src/document/Symbol.js' + id
).then(
	'src/item/Item.js' + id
).then(
	'src/item/Group.js' + id,
	'src/item/Raster.js' + id,
	'src/item/PlacedSymbol.js' + id,
	'src/item/PathStyle.js' + id,
	'src/path/PathItem.js' + id,
	'src/path/Segment.js' + id,
	'src/path/Curve.js' + id
).then(
	// Needs Group
	'src/item/Layer.js' + id,
	// Needs PathItem
	'src/path/Path.js' + id,
	'src/path/CompoundPath.js' + id
).then(
	'src/path/Path.Constructors.js' + id,
	'src/color/Color.js' + id
).then(
	'src/color/RGBColor.js' + id,
	'src/color/GrayColor.js' + id,
	'src/color/GradientColor.js' + id,
	'src/color/Gradient.js' + id,
	'src/color/GradientStop.js' + id
).then(
	'src/tool/ToolEvent.js' + id,
	'src/tool/ToolHandler.js' + id
).then(
	// Requires ToolHandler
	'src/tool/Tool.js' + id,
	'src/util/BlendMode.js' + id,
	'src/util/CanvasProvider.js' + id,
	'src/util/Numerical.js' + id,
	'src/util/Events.js' + id
).then(
	'src/util/PaperScript.js' + id
).thenRun(
	function() {
		PaperScript.install();
	}
);

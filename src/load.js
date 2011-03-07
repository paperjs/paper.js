var id = '?' + Math.random(),
	base = loadBase || '';
load(
	base + 'lib/bootstrap.js' + id,
	base + 'lib/parse-js.js' + id
).then(
	base + 'src/paper.js' + id
).then(
	base + 'src/basic/Point.js' + id,
	base + 'src/basic/Size.js' + id,
	base + 'src/basic/Rectangle.js' + id,
	base + 'src/basic/Matrix.js' + id,
	base + 'src/basic/Line.js' + id
).then(
	base + 'src/document/DocumentView.js' + id,
	base + 'src/document/Document.js' + id,
	base + 'src/document/Symbol.js' + id
).then(
	base + 'src/item/Item.js' + id
).then(
	base + 'src/item/Group.js' + id,
	base + 'src/item/Raster.js' + id,
	base + 'src/item/PlacedSymbol.js' + id,
	base + 'src/item/PathStyle.js' + id,
	base + 'src/path/PathItem.js' + id,
	base + 'src/path/Segment.js' + id,
	base + 'src/path/Curve.js' + id
).then(
	// Needs Group
	base + 'src/item/Layer.js' + id,
	// Needs PathItem
	base + 'src/path/Path.js' + id,
	base + 'src/path/CompoundPath.js' + id
).then(
	base + 'src/path/Path.Constructors.js' + id,
	base + 'src/color/Color.js' + id
).then(
	base + 'src/color/RGBColor.js' + id,
	base + 'src/color/GrayColor.js' + id,
	base + 'src/color/GradientColor.js' + id,
	base + 'src/color/Gradient.js' + id,
	base + 'src/color/GradientStop.js' + id
).then(
	base + 'src/tool/ToolEvent.js' + id,
	base + 'src/tool/ToolHandler.js' + id
).then(
	// Requires ToolHandler
	base + 'src/tool/Tool.js' + id,
	base + 'src/util/BlendMode.js' + id,
	base + 'src/util/CanvasProvider.js' + id,
	base + 'src/util/Numerical.js' + id,
	base + 'src/util/Events.js' + id
).then(
	base + 'src/util/PaperScript.js' + id
).thenRun(
	function() {
		PaperScript.install();
	}
);

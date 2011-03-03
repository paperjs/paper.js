var paper = new function() {

//#include "paper.js"

//#include "basic/Point.js"
//#include "basic/Size.js"
//#include "basic/Rectangle.js"
//#include "basic/Matrix.js"

//#include "document/DocumentView.js"
//#include "document/Document.js"
//#include "document/Symbol.js"

//#include "item/Item.js"
//#include "item/Group.js"
//#include "item/Layer.js"
//#include "item/Raster.js"
//#include "item/PlacedSymbol.js"
//#include "item/PathStyle.js"

//#include "path/Segment.js"
//#include "path/Curve.js"
//#include "path/PathItem.js"
//#include "path/Path.js"
//#include "path/CompoundPath.js"
//#include "path/Path.Constructors.js"

//#include "color/Color.js"
//#include "color/RGBColor.js"
//#include "color/GrayColor.js"
//#include "color/GradientColor.js"
//#include "color/Gradient.js"
//#include "color/GradientStop.js"

//#include "tool/ToolEvent.js"
//#include "tool/ToolHandler.js"
//#include "tool/Tool.js"

//#include "util/CanvasProvider.js"
//#include "util/MathUtils.js"
//#include "util/PaperScript.js"

// Inject all prototypes from the paper scope into the paper object.
return Base.each(['Point', 'Size', 'Rectangle', 'Matrix', 'DocumentView',
	'Document', 'Symbol', 'Item', 'Group', 'Layer', 'Raster', 'PlacedSymbol',
	'PathStyle', 'Segment', 'Curve', 'PathItem', 'Path', 'CompoundPath',
	'Color', 'RGBColor', 'GrayColor', 'GradientColor', 'Gradient',
	'GradientStop', 'ToolEvent', 'ToolHandler', 'Tool'],
	function(name) {
		this[name] = eval(name);
	}, paper);

};

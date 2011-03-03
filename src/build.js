(function(scope) {

#include "paper.js"

#include "basic/Point.js"
#include "basic/Size.js"
#include "basic/Rectangle.js"
#include "basic/Matrix.js"

#include "document/DocumentView.js"
#include "document/Doc.js"
#include "document/Symbol.js"

#include "item/Item.js"
#include "item/Group.js"
#include "item/Layer.js"
#include "item/Raster.js"
#include "item/PlacedSymbol.js"
#include "item/PathStyle.js"

#include "path/Segment.js"
#include "path/Curve.js"
#include "path/PathItem.js"
#include "path/Path.js"
#include "path/CompoundPath.js"
#include "path/Path.Constructors.js"

#include "color/Color.js"
#include "color/RGBColor.js"
#include "color/GrayColor.js"
#include "color/GradientColor.js"
#include "color/Gradient.js"
#include "color/GradientStop.js"

#include "tool/ToolEvent.js"
#include "tool/ToolHandler.js"
#include "tool/Tool.js"

paper.populate();
paper.install(scope);

})(this);

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2020, Jürg Lehni & Jonathan Puckey
 * http://juerglehni.com/ & https://puckey.studio/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/*#*/ include('Point.js');
/*#*/ include('Size.js');
/*#*/ include('Rectangle.js');
/*#*/ include('Matrix.js');

/*#*/ include('Color.js');

/*#*/ include('Emitter.js');

/*#*/ include('Project.js');

/*#*/ include('Item.js');
/*#*/ include('Item_Cloning.js');
/*#*/ include('Item_Order.js');
/*#*/ include('Item_Bounds.js');
/*#*/ include('Item_Getting.js');

/*#*/ include('Layer.js');
/*#*/ include('Group.js');
/*#*/ include('Segment.js');

/*#*/ include('Path.js');
/*#*/ include('Path_Constructors.js');
/*#*/ include('Path_Intersections.js');
/*#*/ include('Path_Boolean.js');

/*#*/ include('CompoundPath.js');

/*#*/ include('PathItem.js');
/*#*/ include('PathItem_Contains.js');

/*#*/ include('Shape.js');

/*#*/ include('Curve.js');
/*#*/ include('CurveLocation.js');

/*#*/ include('Style.js');

/*#*/ include('SymbolItem.js');

/*#*/ include('Raster.js');

/*#*/ include('TextItem.js');

/*#*/ include('HitResult.js');

/*#*/ include('JSON.js');

/*#*/ include('SvgImport.js');
/*#*/ include('SvgExport.js');

/*#*/ include('Numerical.js');

/*#*/ include('PaperScript.js');

// There is no need to test interactions in node context.
if (!isNodeContext) {
    /*#*/ include('Interactions.js');
}

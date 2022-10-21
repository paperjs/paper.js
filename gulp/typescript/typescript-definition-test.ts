/// <reference path="../../dist/paper.d.ts" />

/**
 * This file is used as a way to test auto-generated typescript definition
 * validity. For now, this only check that calling methods as they are defined
 * in online documentation does not throw error in typescript compilation.
 *
 * Todo: add more advanced type checking by using either:
 * - typescript compiler check: `let result:type = methodCall()`
 * - dedicated testing library like: https://github.com/Microsoft/dtslint
 */

import * as paper from 'paper';


//
// Utility variables
//

let point            = {} as paper.Point;
let pointLike        = {} as paper.PointLike;
let size             = {} as paper.Size;
let sizeLike         = {} as paper.SizeLike;
let rectangle        = {} as paper.Rectangle;
let rectangleLike    = {} as paper.RectangleLike;
let matrix           = {} as paper.Matrix;
let project          = {} as paper.Project;
let item             = {} as paper.Item;
let layer            = {} as paper.Layer;
let group            = {} as paper.Group;
let shape            = {} as paper.Shape;
let raster           = {} as paper.Raster;
let pathItem         = {} as paper.PathItem;
let path             = {} as paper.Path;
let compoundPath     = {} as paper.CompoundPath;
let segment          = {} as paper.Segment;
let curve            = {} as paper.Curve;
let curveLocation    = {} as paper.CurveLocation;
let symbolDefinition = {} as paper.SymbolDefinition;
let symbolItem       = {} as paper.SymbolItem;
let style            = {} as paper.Style;
let color            = {} as paper.Color;
let gradient         = {} as paper.Gradient;
let gradientStop     = {} as paper.GradientStop;
let textItem         = {} as paper.TextItem;
let pointText        = {} as paper.PointText;
let view             = {} as paper.View;
let event            = {} as paper.Event;
let mouseEvent       = {} as paper.MouseEvent;
let tool             = {} as paper.Tool;
let toolEvent        = {} as paper.ToolEvent;
let keyEvent         = {} as paper.KeyEvent;
let paperScope       = {} as paper.PaperScope;
let callback         = {} as () => {};
let hitResult        = {} as paper.HitResult;
let object           = {} as object;


//
// Classes
//

//
// Point
//

new paper.Point(0, 0);
new paper.Point([ 0, 0 ]);
new paper.Point({ x: 0, y: 0 });
new paper.Point(sizeLike);
new paper.Point(pointLike);
point.x;
point.y;
point.length;
point.angle;
point.angleInRadians;
point.quadrant;
point.selected;
point.set(0, 0);
point.set([ 0, 0 ]);
point.set({ x: 0, y: 0 });
point.set(sizeLike);
point.set(pointLike);
point.equals(pointLike);
point.clone();
point.toString();
point.getAngle(pointLike);
point.getAngleInRadians(pointLike);
point.getDirectedAngle(pointLike);
point.getDistance(pointLike, true);
point.normalize();
point.normalize(0);
point.rotate(0, pointLike);
point.transform(matrix);
point.isInside(rectangleLike);
point.isClose(pointLike, 0);
point.isCollinear(pointLike);
point.isOrthogonal(pointLike);
point.isZero();
point.isNaN();
point.isInQuadrant(0);
point.dot(pointLike);
point.cross(pointLike);
point.project(pointLike);
point.round();
point.ceil();
point.floor();
point.abs();
point.add(0);
point.add(pointLike);
point.subtract(0);
point.subtract(pointLike);
point.multiply(0);
point.multiply(pointLike);
point.divide(0);
point.divide(pointLike);
point.modulo(0);
point.modulo(pointLike);
paper.Point.min(pointLike, pointLike);
paper.Point.max(pointLike, pointLike);
paper.Point.random();


//
// Size
//


new paper.Size(0, 0);
new paper.Size([ 0, 0 ]);
new paper.Size({ width: 0, height: 0 });
new paper.Size(sizeLike);
new paper.Size(pointLike);
size.width;
size.height;
size.set(0, 0);
size.set([ 0, 0 ]);
size.set({ x: 0, y: 0 });
size.set(sizeLike);
size.set(pointLike);
size.equals(sizeLike);
size.clone();
size.toString();
size.isZero();
size.isNaN();
size.round();
size.ceil();
size.floor();
size.abs();
size.add(0);
size.add(sizeLike);
size.subtract(0);
size.subtract(sizeLike);
size.multiply(0);
size.multiply(sizeLike);
size.divide(0);
size.divide(sizeLike);
size.modulo(0);
size.modulo(sizeLike);
paper.Size.min(sizeLike, sizeLike);
paper.Size.max(sizeLike, sizeLike);
paper.Size.random();


//
// Rectangle
//


new paper.Rectangle(pointLike, sizeLike);
new paper.Rectangle({ point: pointLike, size: sizeLike });
new paper.Rectangle(0, 0, 0, 0);
new paper.Rectangle(pointLike, pointLike);
new paper.Rectangle(rectangleLike);
rectangle.x;
rectangle.y;
rectangle.width;
rectangle.height;
rectangle.point;
rectangle.size;
rectangle.left;
rectangle.top;
rectangle.right;
rectangle.bottom;
rectangle.center;
rectangle.topLeft;
rectangle.topRight;
rectangle.bottomLeft;
rectangle.bottomRight;
rectangle.leftCenter;
rectangle.topCenter;
rectangle.rightCenter;
rectangle.bottomCenter;
rectangle.area;
rectangle.selected;
rectangle.set(pointLike, sizeLike);
rectangle.set({ point: pointLike, size: sizeLike });
rectangle.set(0, 0, 0, 0);
rectangle.set(pointLike, pointLike);
rectangle.set(rectangleLike);
rectangle.clone();
rectangle.equals(rectangleLike);
rectangle.toString();
rectangle.isEmpty();
rectangle.contains(pointLike);
rectangle.contains(rectangleLike);
rectangle.intersects(rectangleLike);
rectangle.intersects(rectangleLike, 0);
rectangle.intersect(rectangleLike);
rectangle.unite(rectangleLike);
rectangle.include(pointLike);
rectangle.expand(0);
rectangle.expand(0, 0);
rectangle.scale(0);
rectangle.scale(0, 0);


//
// Matrix
//

new paper.Matrix();
new paper.Matrix(0, 0, 0, 0, 0, 0);
new paper.Matrix([ 0, 0, 0, 0, 0, 0 ]);
new paper.Matrix(matrix);
matrix.a;
matrix.b;
matrix.c;
matrix.d;
matrix.tx;
matrix.ty;
matrix.values;
matrix.translation;
matrix.scaling;
matrix.rotation;
matrix.set(0, 0, 0, 0, 0, 0);
matrix.set([ 0, 0, 0, 0, 0, 0 ]);
matrix.set(matrix);
matrix.clone();
matrix.equals(matrix);
matrix.toString();
matrix.reset();
matrix.apply();
matrix.apply(true);
matrix.translate(pointLike);
matrix.translate(0, 0);
matrix.scale(0);
matrix.scale(0, pointLike);
matrix.scale(0, 0);
matrix.scale(0, 0, pointLike);
matrix.rotate(0, pointLike);
matrix.rotate(0, 0, 0);
matrix.shear(pointLike);
matrix.shear(pointLike, pointLike);
matrix.shear(0, 0);
matrix.shear(0, 0, pointLike);
matrix.skew(pointLike);
matrix.skew(pointLike, pointLike);
matrix.skew(0, 0);
matrix.skew(0, 0, pointLike);
matrix.append(matrix);
matrix.prepend(matrix);
matrix.appended(matrix);
matrix.prepended(matrix);
matrix.invert();
matrix.inverted();
matrix.isIdentity();
matrix.isInvertible();
matrix.isSingular();
matrix.transform(pointLike);
matrix.transform([ 0, 0 ], [ 0, 0 ], 0);
matrix.inverseTransform(pointLike);
matrix.decompose();
matrix.applyToContext({} as CanvasRenderingContext2D);


//
// Project
//

new paper.Project({} as HTMLCanvasElement);
new paper.Project('');
new paper.Project(sizeLike);
project.view;
project.currentStyle;
project.index;
project.layers;
project.activeLayer;
project.symbolDefinitions;
project.selectedItems;
project.activate();
project.clear();
project.isEmpty();
project.remove();
project.selectAll();
project.deselectAll();
project.addLayer(layer);
project.insertLayer(0, layer);
project.hitTest(pointLike);
project.hitTest(pointLike, {});
project.hitTestAll(pointLike);
project.hitTestAll(pointLike, {});
project.getItems({});
project.getItems(callback);
project.getItem({});
project.getItem(callback);
project.exportJSON();
project.exportJSON({});
project.importJSON('');
project.exportSVG();
project.exportSVG({});
project.importSVG('');
project.importSVG({} as SVGElement);
project.importSVG('', {});
project.importSVG('', callback);


//
// Item
//

item.id;
item.className;
item.name;
item.style;
item.locked;
item.visible;
item.blendMode;
item.opacity;
item.selected;
item.clipMask;
item.data;
item.position;
item.pivot;
item.bounds;
item.strokeBounds;
item.handleBounds;
item.rotation;
item.scaling;
item.matrix;
item.globalMatrix;
item.viewMatrix;
item.applyMatrix;
item.project;
item.view;
item.layer;
item.parent;
item.children;
item.firstChild;
item.lastChild;
item.nextSibling;
item.previousSibling;
item.index;
item.strokeColor;
item.strokeWidth;
item.strokeCap;
item.strokeJoin;
item.dashOffset;
item.strokeScaling;
item.dashArray;
item.miterLimit;
item.fillColor;
item.fillColor && item.fillColor.red;
item.fillRule;
item.shadowColor;
item.shadowBlur;
item.shadowOffset;
item.selectedColor;
item.onFrame;
item.onMouseDown;
item.onMouseDrag;
item.onMouseUp;
item.onClick;
item.onDoubleClick;
item.onMouseMove;
item.onMouseEnter;
item.onMouseLeave;
item.set({});
item.clone();
item.clone({});
item.copyContent(item);
item.copyAttributes(item, true);
item.rasterize();
item.rasterize({});
item.contains(pointLike);
item.isInside(rectangleLike);
item.intersects(item);
item.hitTest(pointLike);
item.hitTest(pointLike, {});
item.hitTestAll(pointLike);
item.hitTestAll(pointLike, {});
item.matches({});
item.matches(callback);
item.matches(name, {});
item.getItems({});
item.getItems(callback);
item.getItem({});
item.getItem(callback);
item.exportJSON();
item.exportJSON({});
item.importJSON('');
item.exportSVG();
item.exportSVG({});
item.importSVG('');
item.importSVG({} as SVGElement);
item.importSVG('', {});
item.importSVG('', callback);
item.addChild(item);
item.insertChild(0, item);
item.addChildren([ item ]);
item.insertChildren(0, [ item ]);
item.insertAbove(item);
item.insertBelow(item);
item.sendToBack();
item.bringToFront();
item.addTo(group);
item.copyTo(group);
item.reduce({});
item.remove();
item.replaceWith(item);
item.removeChildren();
item.removeChildren(0);
item.removeChildren(0, 0);
item.reverseChildren();
item.isEmpty();
item.hasFill();
item.hasStroke();
item.hasShadow();
item.hasChildren();
item.isInserted();
item.isAbove(item);
item.isBelow(item);
item.isParent(item);
item.isChild(item);
item.isDescendant(item);
item.isAncestor(item);
item.isSibling(item);
item.isGroupedWith(item);
item.translate(pointLike);
item.rotate(0);
item.rotate(0, pointLike);
item.scale(0);
item.scale(0, pointLike);
item.scale(0, 0);
item.scale(0, 0, pointLike);
item.shear(pointLike);
item.shear(pointLike, pointLike);
item.shear(0, 0);
item.shear(0, 0, pointLike);
item.skew(pointLike);
item.skew(pointLike, pointLike);
item.skew(0, 0);
item.skew(0, 0, pointLike);
item.transform(matrix);
item.globalToLocal(pointLike);
item.localToGlobal(pointLike);
item.parentToLocal(pointLike);
item.localToParent(pointLike);
item.fitBounds(rectangleLike);
item.fitBounds(rectangleLike, true);
item.on('', callback);
item.on({});
item.off('', callback);
item.off({});
item.emit('', event);
item.responds('');
item.removeOn({});
item.removeOnMove();
item.removeOnDown();
item.removeOnDrag();
item.removeOnUp();


//
// Layer
//

new paper.Layer([ item ]);
new paper.Layer({});
layer.activate();


//
// Group
//

new paper.Group([ item ]);
new paper.Group({});
group.clipped;


//
// Shape
//

new paper.Shape.Circle(pointLike, 0);
new paper.Shape.Circle({});
new paper.Shape.Rectangle(rectangleLike);
new paper.Shape.Rectangle(rectangleLike, sizeLike);
new paper.Shape.Rectangle(pointLike, sizeLike);
new paper.Shape.Rectangle(pointLike, pointLike);
new paper.Shape.Rectangle({});
new paper.Shape.Ellipse(rectangleLike);
new paper.Shape.Ellipse({});
shape.type;
shape.size;
shape.radius;
shape.toPath();
shape.toPath(true);


//
// Raster
//

new paper.Raster();
new paper.Raster({} as HTMLImageElement);
new paper.Raster({} as HTMLCanvasElement);
new paper.Raster('');
new paper.Raster('', pointLike);
raster.size;
raster.width;
raster.height;
raster.loaded;
raster.resolution;
raster.image;
raster.canvas;
raster.context;
raster.source;
raster.crossOrigin;
raster.smoothing;
raster.onLoad;
raster.onLoad = () => {};
raster.onLoad = null;
raster.onError;
raster.getSubCanvas(rectangleLike);
raster.getSubRaster(rectangleLike);
raster.toDataURL();
raster.drawImage({} as HTMLImageElement, pointLike);
raster.getAverageColor(path);
raster.getAverageColor(rectangleLike);
raster.getAverageColor(pointLike);
raster.getPixel(0, 0);
raster.getPixel(pointLike);
raster.setPixel(0, 0, color);
raster.setPixel(pointLike, color);
raster.createImageData(sizeLike);
raster.getImageData(rectangleLike);
raster.putImageData({} as ImageData, pointLike);
raster.setImageData({} as ImageData);


//
// HitResult
//

hitResult.type;
hitResult.name;
hitResult.item;
hitResult.location;
hitResult.color;
hitResult.segment;
hitResult.point;


//
// PathItem
//

pathItem.interiorPoint;
pathItem.clockwise;
pathItem.pathData;
pathItem.unite(path);
pathItem.unite(path, {});
pathItem.intersect(path);
pathItem.intersect(path, {});
pathItem.subtract(path);
pathItem.subtract(path, {});
pathItem.exclude(path);
pathItem.exclude(path, {});
pathItem.divide(path);
pathItem.divide(path, {});
pathItem.reorient();
pathItem.reorient(true);
pathItem.reorient(true, true);
pathItem.getIntersections(path);
pathItem.getIntersections(path, callback);
pathItem.getCrossings(path);
pathItem.getNearestLocation(pointLike);
pathItem.getNearestPoint(pointLike);
pathItem.reverse();
pathItem.flatten();
pathItem.flatten(0);
pathItem.smooth();
pathItem.smooth({});
pathItem.simplify();
pathItem.simplify(0);
pathItem.interpolate(path, path, 0);
pathItem.compare(path);
pathItem.moveTo(pointLike);
pathItem.lineTo(pointLike);
pathItem.arcTo(pointLike, pointLike);
pathItem.arcTo(pointLike);
pathItem.arcTo(pointLike, true);
pathItem.curveTo(pointLike, pointLike);
pathItem.curveTo(pointLike, pointLike, 0);
pathItem.cubicCurveTo(pointLike, pointLike, pointLike);
pathItem.quadraticCurveTo(pointLike, pointLike);
pathItem.closePath();
pathItem.moveBy(pointLike);
pathItem.lineBy(pointLike);
pathItem.arcBy(pointLike, pointLike);
pathItem.arcBy(pointLike);
pathItem.arcBy(pointLike, true);
pathItem.curveBy(pointLike, pointLike);
pathItem.curveBy(pointLike, pointLike, 0);
pathItem.cubicCurveBy(pointLike, pointLike, pointLike);
pathItem.quadraticCurveBy(pointLike, pointLike);
paper.PathItem.create('');
paper.PathItem.create([ [ 0 ] ]);
paper.PathItem.create({});


//
// Path
//

new paper.Path();
new paper.Path([ segment ]);
new paper.Path(object);
new paper.Path('');
new paper.Path.Line(pointLike, pointLike);
new paper.Path.Line(object);
new paper.Path.Circle(pointLike, 0);
new paper.Path.Circle(object);
new paper.Path.Rectangle(rectangleLike);
new paper.Path.Rectangle(rectangleLike, sizeLike);
new paper.Path.Rectangle(pointLike, sizeLike);
new paper.Path.Rectangle(pointLike, pointLike);
new paper.Path.Rectangle(object);
new paper.Path.Ellipse(rectangleLike);
new paper.Path.Ellipse(object);
new paper.Path.Arc(pointLike, pointLike, pointLike);
new paper.Path.Arc(object);
new paper.Path.RegularPolygon(pointLike, 0, 0);
new paper.Path.RegularPolygon(object);
new paper.Path.Star(pointLike, 0, 0, 0);
new paper.Path.Star(object);
path.segments;
path.firstSegment;
path.lastSegment;
path.curves;
path.firstCurve;
path.lastCurve;
path.closed;
path.length;
path.area;
path.fullySelected;
path.add(segment);
path.add(pointLike);
path.add([ 0, 0 ]);
path.add(segment, pointLike, [ 0, 0 ]);
path.insert(0, segment);
path.addSegments([ segment ]);
path.insertSegments(0, [ segment ]);
path.removeSegment(0);
path.removeSegments();
path.removeSegments(0);
path.removeSegments(0, 0);
path.hasHandles();
path.clearHandles();
path.divideAt(curveLocation);
path.splitAt(curveLocation);
path.join(path);
path.join(path, 0);
path.reduce(object);
path.toShape();
path.toShape(true);
path.getLocationOf(pointLike);
path.getOffsetOf(pointLike);
path.getLocationAt(0);
path.getPointAt(0);
path.getTangentAt(0);
path.getNormalAt(0);
path.getWeightedTangentAt(0);
path.getWeightedNormalAt(0);
path.getCurvatureAt(0);
path.getOffsetsWithTangent(pointLike);
path = path.set(object);
path = path.clone();
path = path.addTo(group);
path = path.copyTo(group);
path = path.on('', callback);
path = path.on({});
path = path.off('', callback);
path = path.off({});


//
// CompoundPath
//

new paper.CompoundPath(object);
new paper.CompoundPath('');
compoundPath.closed;
compoundPath.firstSegment;
compoundPath.lastSegment;
compoundPath.curves;
compoundPath.firstCurve;
compoundPath.lastCurve;
compoundPath.area;
compoundPath.length;


//
// Segment
//

new paper.Segment();
new paper.Segment(pointLike);
new paper.Segment(pointLike, pointLike);
new paper.Segment(pointLike, pointLike, pointLike);
new paper.Segment(object);
segment.point;
segment.handleIn;
segment.handleOut;
segment.selected;
segment.index;
segment.path;
segment.curve;
segment.location;
segment.next;
segment.previous;
segment.hasHandles();
segment.isSmooth();
segment.clearHandles();
segment.smooth();
segment.smooth(object);
segment.isFirst();
segment.isLast();
segment.reverse();
segment.reversed();
segment.remove();
segment.toString();
segment.transform(matrix);
segment.interpolate(segment, segment, 0);


//
// Curve
//

new paper.Curve(segment, segment);
new paper.Curve(pointLike, pointLike, pointLike, pointLike);
curve.point1;
curve.point2;
curve.handle1;
curve.handle2;
curve.segment1;
curve.segment2;
curve.path;
curve.index;
curve.next;
curve.previous;
curve.selected;
curve.values;
curve.points;
curve.length;
curve.area;
curve.bounds;
curve.strokeBounds;
curve.handleBounds;
curve.clone();
curve.toString();
curve.classify();
curve.remove();
curve.isFirst();
curve.isLast();
curve.getPart(0, 0);
curve.divideAt(curveLocation);
curve.divideAtTime(0);
curve.splitAt(curveLocation);
curve.splitAtTime(0);
curve.reversed();
curve.clearHandles();
curve.hasHandles();
curve.hasLength();
curve.hasLength(0);
curve.isStraight();
curve.isLinear();
curve.isCollinear(curve);
curve.isHorizontal();
curve.isVertical();
curve.getLocationAt(0);
curve.getLocationAtTime(0);
curve.getTimeAt(0);
curve.getTimeAt(0, 0);
curve.getTimesWithTangent(pointLike);
curve.getOffsetAtTime(0);
curve.getLocationOf(pointLike);
curve.getOffsetOf(pointLike);
curve.getTimeOf(pointLike);
curve.getNearestLocation(pointLike);
curve.getNearestPoint(pointLike);
curve.getPointAt(curveLocation);
curve.getTangentAt(curveLocation);
curve.getNormalAt(curveLocation);
curve.getWeightedTangentAt(curveLocation);
curve.getWeightedNormalAt(curveLocation);
curve.getCurvatureAt(curveLocation);
curve.getPointAtTime(0);
curve.getTangentAtTime(0);
curve.getNormalAtTime(0);
curve.getWeightedTangentAtTime(0);
curve.getWeightedNormalAtTime(0);
curve.getCurvatureAtTime(0);
curve.getIntersections(curve);


//
// CurveLocation
//

new paper.CurveLocation(curve, 0);
new paper.CurveLocation(curve, 0, pointLike);
curveLocation.segment;
curveLocation.curve;
curveLocation.path;
curveLocation.index;
curveLocation.time;
curveLocation.point;
curveLocation.offset;
curveLocation.curveOffset;
curveLocation.intersection;
curveLocation.tangent;
curveLocation.normal;
curveLocation.curvature;
curveLocation.distance;
curveLocation.equals(curveLocation);
curveLocation.toString();
curveLocation.isTouching();
curveLocation.isCrossing();
curveLocation.hasOverlap();


//
// SymbolDefinition
//

new paper.SymbolDefinition(item);
new paper.SymbolDefinition(item, true);
symbolDefinition.project;
symbolDefinition.item;
symbolDefinition.place();
symbolDefinition.place(pointLike);
symbolDefinition.clone();
symbolDefinition.equals(symbolDefinition);


//
// SymbolItem
//

new paper.SymbolItem(symbolDefinition);
new paper.SymbolItem(item);
new paper.SymbolItem(symbolDefinition, pointLike);
symbolItem.definition;


//
// Style
//

new paper.Style(object);
style.view;
style.strokeColor;
style.strokeWidth;
style.strokeCap;
style.strokeJoin;
style.strokeScaling;
style.dashOffset;
style.dashArray;
style.miterLimit;
style.fillColor;
style.fillRule;
style.shadowColor;
style.shadowBlur;
style.shadowOffset;
style.selectedColor;
style.fontFamily;
style.fontWeight;
style.fontSize;
style.leading;
style.justification;


//
// Color
//

new paper.Color(0, 0, 0);
new paper.Color(0, 0, 0, 0);
new paper.Color(0);
new paper.Color(0, 0);
new paper.Color(object);
new paper.Color('');
new paper.Color(gradient, pointLike, pointLike);
new paper.Color(gradient, pointLike, pointLike, pointLike);
color.type;
color.components;
color.alpha;
color.red;
color.green;
color.blue;
color.gray;
color.hue;
color.saturation;
color.brightness;
color.lightness;
color.gradient;
color.highlight;
color.set(0, 0, 0);
color.set(0, 0, 0, 0);
color.set(0);
color.set(0, 0);
color.set(object);
color.set(color);
color.set(gradient, pointLike, pointLike);
color.set(gradient, pointLike, pointLike, pointLike);
color.convert('');
color.hasAlpha();
color.equals(color);
color.clone();
color.toString();
color.toCSS(true);
color.transform(matrix);
color.add(0);
color.add(color);
color.subtract(0);
color.subtract(color);
color.multiply(0);
color.multiply(color);
color.divide(0);
color.divide(color);
paper.Color.random();


//
// Gradient
//

gradient.stops;
gradient.radial;
gradient.clone();
gradient.equals(gradient);


//
// GradientStop
//

new paper.GradientStop();
new paper.GradientStop(color);
new paper.GradientStop(color, 0);
gradientStop.offset;
gradientStop.color;
gradientStop.clone();


//
// TextItem
//

textItem.content;
textItem.fontFamily;
textItem.fontWeight;
textItem.fontSize;
textItem.leading;
textItem.justification;


//
// PointText
//

new paper.PointText(pointLike);
new paper.PointText(object);
pointText.point;


//
// View
//

view.autoUpdate;
view.element;
view.pixelRatio;
view.resolution;
view.viewSize;
view.bounds;
view.size;
view.center;
view.zoom;
view.rotation;
view.scaling;
view.matrix;
view.onFrame;
view.onResize;
view.onMouseDown;
view.onMouseDrag;
view.onMouseUp;
view.onClick;
view.onDoubleClick;
view.onMouseMove;
view.onMouseEnter;
view.onMouseLeave;
view.remove();
view.update();
view.requestUpdate();
view.play();
view.pause();
view.isVisible();
view.isInserted();
view.translate(pointLike);
view.rotate(0);
view.rotate(0, pointLike);
view.scale(0);
view.scale(0, pointLike);
view.scale(0, 0);
view.scale(0, 0, pointLike);
view.shear(pointLike);
view.shear(pointLike, pointLike);
view.shear(0, 0);
view.shear(0, 0, pointLike);
view.skew(pointLike);
view.skew(pointLike, pointLike);
view.skew(0, 0);
view.skew(0, 0, pointLike);
view.transform(matrix);
view.projectToView(pointLike);
view.viewToProject(pointLike);
view.getEventPoint(event);
view.on('', callback);
view.on(object);
view.off('', callback);
view.off(object);
view.emit('', event);
view.responds('');


//
// Event
//

event.timeStamp;
event.modifiers;
event.modifiers.shift;
event.preventDefault();
event.stopPropagation();
event.stop();


//
// MouseEvent
//

mouseEvent.type;
mouseEvent.point;
mouseEvent.target;
mouseEvent.currentTarget;
mouseEvent.delta;
mouseEvent.toString();


//
// Tool
//

tool.minDistance;
tool.maxDistance;
tool.fixedDistance;
tool.onMouseDown;
tool.onMouseDrag;
tool.onMouseMove;
tool.onMouseUp;
tool.onKeyDown;
tool.onKeyUp;
tool.activate();
tool.remove();
tool.on('', callback);
tool.on(object);
tool.off('', callback);
tool.off(object);
tool.emit('', event);
tool.responds('');


//
// ToolEvent
//

toolEvent.type;
toolEvent.point;
toolEvent.lastPoint;
toolEvent.downPoint;
toolEvent.middlePoint;
toolEvent.delta;
toolEvent.count;
toolEvent.item;
toolEvent.toString();


//
// Key
//

paper.Key.modifiers;
paper.Key.isDown('');


//
// KeyEvent
//

keyEvent.type;
keyEvent.character;
keyEvent.key;
keyEvent.toString();


//
// PaperScope
//

new paper.PaperScope();
paperScope.version;
paperScope.settings;
paperScope.settings = null;
paperScope.project;
paperScope.projects;
paperScope.view;
paperScope.tool;
paperScope.tools;
paperScope.execute('');
paperScope.execute('', object);
paperScope.install(object);
paperScope.setup('');
paperScope.setup({} as HTMLCanvasElement);
paperScope.setup(sizeLike);
paperScope.activate();
paper.PaperScope.get(0);
new paperScope.Color('');
new paperScope.CompoundPath('');
new paperScope.Curve(segment, segment);
new paperScope.CurveLocation(curve, 0);
new paperScope.Event();
new paperScope.Gradient();
new paperScope.GradientStop();
new paperScope.Group();
new paperScope.HitResult();
new paperScope.Item();
new paperScope.Key();
new paperScope.KeyEvent();
new paperScope.Layer();
new paperScope.Matrix();
new paperScope.MouseEvent();
new paperScope.PaperScript();
new paperScope.Path();
new paperScope.PathItem();
new paperScope.Point(0, 0);
new paperScope.PointText(pointLike);
new paperScope.Project(sizeLike);
new paperScope.Raster();
new paperScope.Rectangle(pointLike, sizeLike);
new paperScope.Segment();
new paperScope.Shape();
new paperScope.Size(0, 0);
new paperScope.Style(object);
new paperScope.SymbolDefinition(item);
new paperScope.SymbolItem(symbolDefinition);
new paperScope.TextItem();
new paperScope.Tool();
new paperScope.ToolEvent();
new paperScope.Tween(object, object, object, 0);
new paperScope.View();


//
// Global PaperScope instance
//

paper.version;
paper.settings;
paper.project;
paper.projects;
paper.view;
paper.tool;
paper.tools;
paper.execute('');
paper.execute('', object);
paper.install(object);
paper.setup('');
paper.setup({} as HTMLCanvasElement);
paper.setup(sizeLike);
paper.activate();


//
// PaperScript
//

paper.PaperScript.compile('');
paper.PaperScript.compile('', object);
paper.PaperScript.execute('', paperScope);
paper.PaperScript.execute('', paperScope, object);
paper.PaperScript.load();
paper.PaperScript.load({} as HTMLScriptElement);

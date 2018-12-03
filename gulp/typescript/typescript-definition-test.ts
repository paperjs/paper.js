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
// Global
//

paper.project;
paper.projects;
paper.view;
paper.tool;
paper.tools;


//
// Utility variables
//

let point            = {} as paper.Point;
let size             = {} as paper.Size;
let rectangle        = {} as paper.Rectangle;
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
new paper.Point(size);
new paper.Point(point);
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
point.set(size);
point.set(point);
point.equals(point);
point.clone();
point.toString();
point.getAngle(point);
point.getAngleInRadians(point);
point.getDirectedAngle(point);
point.getDistance(point, true);
point.normalize();
point.normalize(0);
point.rotate(0, point);
point.transform(matrix);
point.isInside(rectangle);
point.isClose(point, 0);
point.isCollinear(point);
point.isOrthogonal(point);
point.isZero();
point.isNaN();
point.isInQuadrant(0);
point.dot(point);
point.cross(point);
point.project(point);
point.round();
point.ceil();
point.floor();
point.abs();
point.add(0);
point.add(point);
point.subtract(0);
point.subtract(point);
point.multiply(0);
point.multiply(point);
point.divide(0);
point.divide(point);
point.modulo(0);
point.modulo(point);
paper.Point.min(point, point);
paper.Point.max(point, point);
paper.Point.random();


//
// Size
//


new paper.Size(0, 0);
new paper.Size([ 0, 0 ]);
new paper.Size({ width: 0, height: 0 });
new paper.Size(size);
new paper.Size(point);
size.width;
size.height;
size.set(0, 0);
size.set([ 0, 0 ]);
size.set({ x: 0, y: 0 });
size.set(size);
size.set(point);
size.equals(size);
size.clone();
size.toString();
size.isZero();
size.isNaN();
size.round();
size.ceil();
size.floor();
size.abs();
size.add(0);
size.add(size);
size.subtract(0);
size.subtract(size);
size.multiply(0);
size.multiply(size);
size.divide(0);
size.divide(size);
size.modulo(0);
size.modulo(size);
paper.Size.min(size, size);
paper.Size.max(size, size);
paper.Size.random();


//
// Rectangle
//


new paper.Rectangle(point, size);
new paper.Rectangle({ point: point, size: size });
new paper.Rectangle(0, 0, 0, 0);
new paper.Rectangle(point, point);
new paper.Rectangle(rectangle);
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
rectangle.set(point, size);
rectangle.set({ point: point, size: size });
rectangle.set(0, 0, 0, 0);
rectangle.set(point, point);
rectangle.set(rectangle);
rectangle.clone();
rectangle.equals(rectangle);
rectangle.toString();
rectangle.isEmpty();
rectangle.contains(point);
rectangle.contains(rectangle);
rectangle.intersects(rectangle);
rectangle.intersects(rectangle, 0);
rectangle.intersect(rectangle);
rectangle.unite(rectangle);
rectangle.include(point);
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
matrix.translate(point);
matrix.translate(0, 0);
matrix.scale(0);
matrix.scale(0, point);
matrix.scale(0, 0);
matrix.scale(0, 0, point);
matrix.rotate(0, point);
matrix.rotate(0, 0, 0);
matrix.shear(point);
matrix.shear(point, point);
matrix.shear(0, 0);
matrix.shear(0, 0, point);
matrix.skew(point);
matrix.skew(point, point);
matrix.skew(0, 0);
matrix.skew(0, 0, point);
matrix.append(matrix);
matrix.prepend(matrix);
matrix.appended(matrix);
matrix.prepended(matrix);
matrix.invert();
matrix.inverted();
matrix.isIdentity();
matrix.isInvertible();
matrix.isSingular();
matrix.transform(point);
matrix.transform([ 0, 0 ], [ 0, 0 ], 0);
matrix.inverseTransform(point);
matrix.decompose();
matrix.applyToContext({} as CanvasRenderingContext2D);


//
// Project
//

new paper.Project({} as HTMLCanvasElement);
new paper.Project('');
new paper.Project(size);
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
project.hitTest(point);
project.hitTest(point, {});
project.hitTestAll(point);
project.hitTestAll(point, {});
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
item.rasterize(0);
item.rasterize(0, true);
item.contains(point);
item.isInside(rectangle);
item.intersects(item);
item.hitTest(point);
item.hitTest(point, {});
item.hitTestAll(point);
item.hitTestAll(point, {});
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
item.translate(point);
item.rotate(0);
item.rotate(0, point);
item.scale(0);
item.scale(0, point);
item.scale(0, 0);
item.scale(0, 0, point);
item.shear(point);
item.shear(point, point);
item.shear(0, 0);
item.shear(0, 0, point);
item.skew(point);
item.skew(point, point);
item.skew(0, 0);
item.skew(0, 0, point);
item.transform(matrix);
item.globalToLocal(point);
item.localToGlobal(point);
item.parentToLocal(point);
item.localToParent(point);
item.fitBounds(rectangle);
item.fitBounds(rectangle, true);
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

new paper.Shape.Circle(point, 0);
new paper.Shape.Circle({});
new paper.Shape.Rectangle(rectangle);
new paper.Shape.Rectangle(rectangle, size);
new paper.Shape.Rectangle(point, size);
new paper.Shape.Rectangle(point, point);
new paper.Shape.Rectangle({});
new paper.Shape.Ellipse(rectangle);
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
new paper.Raster('', point);
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
raster.onError;
raster.getSubCanvas(rectangle);
raster.getSubRaster(rectangle);
raster.toDataURL();
raster.drawImage({} as HTMLImageElement, point);
raster.getAverageColor(path);
raster.getAverageColor(rectangle);
raster.getAverageColor(point);
raster.getPixel(0, 0);
raster.getPixel(point);
raster.setPixel(0, 0, color);
raster.setPixel(point, color);
raster.createImageData(size);
raster.getImageData(rectangle);
raster.setImageData({} as ImageData, point);


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
pathItem.getNearestLocation(point);
pathItem.getNearestPoint(point);
pathItem.reverse();
pathItem.flatten();
pathItem.flatten(0);
pathItem.smooth();
pathItem.smooth({});
pathItem.simplify();
pathItem.simplify(0);
pathItem.interpolate(path, path, 0);
pathItem.compare(path);
pathItem.moveTo(point);
pathItem.lineTo(point);
pathItem.arcTo(point, point);
pathItem.arcTo(point);
pathItem.arcTo(point, true);
pathItem.curveTo(point, point);
pathItem.curveTo(point, point, 0);
pathItem.cubicCurveTo(point, point, point);
pathItem.quadraticCurveTo(point, point);
pathItem.closePath();
pathItem.moveBy(point);
pathItem.lineBy(point);
pathItem.arcBy(point, point);
pathItem.arcBy(point);
pathItem.arcBy(point, true);
pathItem.curveBy(point, point);
pathItem.curveBy(point, point, 0);
pathItem.cubicCurveBy(point, point, point);
pathItem.quadraticCurveBy(point, point);
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
new paper.Path.Line(point, point);
new paper.Path.Line(object);
new paper.Path.Circle(point, 0);
new paper.Path.Circle(object);
new paper.Path.Rectangle(rectangle);
new paper.Path.Rectangle(rectangle, size);
new paper.Path.Rectangle(point, size);
new paper.Path.Rectangle(point, point);
new paper.Path.Rectangle(object);
new paper.Path.Ellipse(rectangle);
new paper.Path.Ellipse(object);
new paper.Path.Arc(point, point, point);
new paper.Path.Arc(object);
new paper.Path.RegularPolygon(point, 0, 0);
new paper.Path.RegularPolygon(object);
new paper.Path.Star(point, 0, 0, 0);
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
path.getLocationOf(point);
path.getOffsetOf(point);
path.getLocationAt(0);
path.getPointAt(0);
path.getTangentAt(0);
path.getNormalAt(0);
path.getWeightedTangentAt(0);
path.getWeightedNormalAt(0);
path.getCurvatureAt(0);
path.getOffsetsWithTangent(point);


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
new paper.Segment(point);
new paper.Segment(point, point);
new paper.Segment(point, point, point);
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
new paper.Curve(point, point, point, point);
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
curve.getTimesWithTangent(point);
curve.getOffsetAtTime(0);
curve.getLocationOf(point);
curve.getOffsetOf(point);
curve.getTimeOf(point);
curve.getNearestLocation(point);
curve.getNearestPoint(point);
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
new paper.CurveLocation(curve, 0, point);
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
symbolDefinition.place(point);
symbolDefinition.clone();
symbolDefinition.equals(symbolDefinition);


//
// SymbolItem
//

new paper.SymbolItem(symbolDefinition);
new paper.SymbolItem(item);
new paper.SymbolItem(symbolDefinition, point);
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
new paper.Color(gradient, point, point);
new paper.Color(gradient, point, point, point);
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
color.set(gradient, point, point);
color.set(gradient, point, point, point);
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

new paper.PointText(point);
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
view.translate(point);
view.rotate(0);
view.rotate(0, point);
view.scale(0);
view.scale(0, point);
view.scale(0, 0);
view.scale(0, 0, point);
view.shear(point);
view.shear(point, point);
view.shear(0, 0);
view.shear(0, 0, point);
view.skew(point);
view.skew(point, point);
view.skew(0, 0);
view.skew(0, 0, point);
view.transform(matrix);
view.projectToView(point);
view.viewToProject(point);
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
paperScope.setup(size);
paperScope.activate();
paper.PaperScope.get(0);


//
// PaperScript
//

paper.PaperScript.compile('');
paper.PaperScript.compile('', object);
paper.PaperScript.execute('', paperScope);
paper.PaperScript.execute('', paperScope, object);
paper.PaperScript.load();
paper.PaperScript.load({} as HTMLScriptElement);

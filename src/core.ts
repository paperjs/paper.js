/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2026, Jürg Lehni & Jonathan Puckey
 * http://juerglehni.com/ & https://puckey.studio/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

// The entry of the core library without side effects: the classes, without a
// scope created at import or the classes as its members, which the `paper`
// entry adds. The first project or item creates the scope they need:
export {
  Point,
  Size,
  Rectangle,
  Matrix,
  Line,
  Project,
  Item,
  Group,
  Layer,
  Shape,
  Raster,
  SymbolItem,
  SymbolDefinition,
  HitResult,
  Effect,
  EffectInstance,
  Segment,
  Curve,
  CurveLocation,
  PathItem,
  Path,
  CompoundPath,
  StrokeProfileStop,
  PathFlattener,
  TextItem,
  PointText,
  PathText,
  AreaText,
  TextStory,
  TextRange,
  Color,
  Gradient,
  GradientStop,
  PatternDefinition,
  Style,
  View,
  CanvasView,
  Event,
  DrawEvent,
  KeyEvent,
  MouseEvent,
  Tool,
  ToolEvent,
  Tween,
  Base,
  ChangeFlag,
  Key,
  Numerical,
  PaperScope,
  registerClasses,
  use,
  effects,
  raster,
  tween
} from './internal.ts'

// The values of the properties that take one of a set of strings:
export type { BlendMode } from './canvas/blendModes.ts'
export type { ColorSpace, ColorType } from './style/Color.ts'
export type {
  BaselinePosition,
  Capitals,
  Composer,
  Direction,
  FontStyle,
  Justification,
  JustifyLast,
  LineWrap,
  PaintOrder
} from './style/Style.ts'
export type { FillRule } from './values/region.ts'
export type { StrokeCap, StrokeJoin } from './values/path.ts'
export type { RasterSmoothing } from './item/Raster.ts'
export type { ShapeType } from './item/Shape.ts'
export type { TextOrientation } from './text/TextItem.ts'
export type { PathTextAlignment } from './text/PathText.ts'
export type { VerticalAlign } from './text/AreaText.ts'

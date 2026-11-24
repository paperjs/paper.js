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
  registerClasses
} from './internal.ts'

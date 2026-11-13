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

// The entry of the core library: the classes, and the first scope, which the
// classes are installed on, as `paper`.
import {
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
  getDocument,
  getWindow,
  inject,
  registerClasses
} from './internal.ts'

const classes = {
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
  Tween
}

// Name the classes for JSON, which keeps their keys through minification:
registerClasses({ ...classes, PaperScope })

// Make the classes and namespaces properties of every scope, enumerable for
// PaperScope#install() and PaperScript, which enumerate them:
const members = {
  ...classes,
  Base,
  PaperScope,
  Numerical,
  ChangeFlag,
  Key,
  get document() {
    return getDocument()
  },
  get window() {
    return getWindow()
  }
}
inject(PaperScope.prototype, members, { enumerable: true })

type Members = typeof members

declare module './scope/PaperScope.ts' {
  interface PaperScope extends Members {}
}

/**
 * The first scope, which is also the active one until another is created or
 * activated, see {@link PaperScope#activate()}.
 */
const paper = new PaperScope()

export default paper
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
}

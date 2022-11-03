/*!
 * Paper.js v0.12.17 - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2020, Jürg Lehni & Jonathan Puckey
 * http://juerglehni.com/ & https://puckey.studio/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 *
 * Date: Thu Nov 3 21:15:36 2022 +0100
 *
 * This is an auto-generated type definition.
 */

declare namespace paper {

    type PointLike = (
        Point
        | [ number, number ]
        | { x: number, y: number }
        | { width: number, height: number }
        | { angle: number, length: number }
    )

    type SizeLike = (
        Size
        | [ number, number ]
        | { x: number, y: number }
        | { width: number, height: number }
    )

    type RectangleLike = (
        Rectangle
        | [ number, number, number, number ]
        | { x: number, y: number, width: number, height: number }
        | { from: PointLike, to: PointLike }
    )

    /** 
     * All properties and functions that expect color values in the form
     * of instances of Color objects, also accept named colors and hex values as
     * strings which are then converted to instances of
     * {@link Color} internally.
     */
    class Color  {
        /** 
         * The type of the color as a string.
         */
        type: string

        /** 
         * The color components that define the color, including the alpha value
         * if defined.
         */
        readonly components: number[]

        /** 
         * The color's alpha value as a number between `0` and `1`.
         * All colors of the different subclasses support alpha values.
         */
        alpha: number

        /** 
         * The amount of red in the color as a value between `0` and `1`.
         */
        red: number

        /** 
         * The amount of green in the color as a value between `0` and `1`.
         */
        green: number

        /** 
         * The amount of blue in the color as a value between `0` and `1`.
         */
        blue: number

        /** 
         * The amount of gray in the color as a value between `0` and `1`.
         */
        gray: number

        /** 
         * The hue of the color as a value in degrees between `0` and `360`.
         */
        hue: number

        /** 
         * The saturation of the color as a value between `0` and `1`.
         */
        saturation: number

        /** 
         * The brightness of the color as a value between `0` and `1`.
         */
        brightness: number

        /** 
         * The lightness of the color as a value between `0` and `1`.
         * 
         * Note that all other components are shared with HSB.
         */
        lightness: number

        /** 
         * The gradient object describing the type of gradient and the stops.
         */
        gradient: Gradient

        /** 
         * The highlight point of the gradient.
         */
        highlight: Point


        /** 
         * Creates a RGB Color object.
         * 
         * @param red - the amount of red in the color as a value between
         *     `0` and `1`
         * @param green - the amount of green in the color as a value
         *     between `0` and `1`
         * @param blue - the amount of blue in the color as a value
         *     between `0` and `1`
         * @param alpha - the alpha of the color as a value between `0`
         *     and `1`
         */
        constructor(red: number, green: number, blue: number, alpha?: number)

        /** 
         * Creates a gray Color object.
         * 
         * @param gray - the amount of gray in the color as a value
         *     between `0` and `1`
         * @param alpha - the alpha of the color as a value between `0`
         *     and `1`
         */
        constructor(gray: number, alpha?: number)

        /** 
         * Creates a Color object from a CSS string. All common CSS color string
         * formats are supported:
         * - Named colors (e.g. `'red'`, `'fuchsia'`, …)
         * - Hex strings (`'#ffff00'`, `'#ff0'`, …)
         * - RGB strings (`'rgb(255, 128, 0)'`, `'rgba(255, 128, 0, 0.5)'`, …)
         * - HSL strings (`'hsl(180deg, 20%, 50%)'`,
         *   `'hsla(3.14rad, 20%, 50%, 0.5)'`, …)
         * 
         * @param color - the color's CSS string representation
         */
        constructor(color: string)

        /** 
         * Creates a gradient Color object.
         */
        constructor(gradient: Gradient, origin: PointLike, destination: PointLike, highlight?: PointLike)

        /** 
         * Creates a HSB, HSL or gradient Color object from the properties of
         * the provided object:
         * 
         * @option hsb.hue {Number} the hue of the color as a value in degrees
         *     between `0` and `360`
         * @option hsb.saturation {Number} the saturation of the color as a
         *     value between `0` and `1`
         * @option hsb.brightness {Number} the brightness of the color as a
         *     value between `0` and `1`
         * @option hsb.alpha {Number} the alpha of the color as a value between
         *     `0` and `1`
         * @option hsl.hue {Number} the hue of the color as a value in degrees
         *     between `0` and `360`
         * @option hsl.saturation {Number} the saturation of the color as a
         *     value between `0` and `1`
         * @option hsl.lightness {Number} the lightness of the color as a value
         *     between `0` and `1`<br>
         * @option hsl.alpha {Number} the alpha of the color as a value between
         *     `0` and `1`
         * @option gradient.gradient {Gradient} the gradient object that
         *     describes the color stops and type of gradient to be used
         * @option gradient.origin {Point} the origin point of the gradient
         * @option gradient.destination {Point} the destination point of the
         *     gradient
         * @option gradient.stops {GradientStop[]} the gradient stops describing
         *     the gradient, as an alternative to providing a gradient object
         * @option gradient.radial {Boolean} controls whether the gradient is
         *     radial, as an alternative to providing a gradient object
         * 
         * @param object - an object describing the components and
         * properties of the color
         */
        constructor(object: object)

        /** 
         * Sets the color to the passed values. Note that any sequence of
         * parameters that is supported by the various {@link Color}
         * constructors also work for calls of `set()`.
         */
        set(...values: any[]): Color

        /** 
         * Converts the color to another type.
         * 
         * @param type - the color type to convert to. Possible values:
         * {@values 'rgb', 'gray', 'hsb', 'hsl'}
         * 
         * @return the converted color as a new instance
         */
        convert(type: string): Color

        /** 
         * Checks if the color has an alpha value.
         * 
         * @return true if the color has an alpha value
         */
        hasAlpha(): boolean

        /** 
         * Checks if the component color values of the color are the
         * same as those of the supplied one.
         * 
         * @param color - the color to compare with
         * 
         * @return true if the colors are the same
         */
        equals(color: Color): boolean

        /** 
         * @return a copy of the color object
         */
        clone(): Color

        /** 
         * @return a string representation of the color
         */
        toString(): string

        /** 
         * Returns the color as a CSS string.
         * 
         * @param hex - whether to return the color in hexadecimal
         * representation or as a CSS RGB / RGBA string.
         * 
         * @return a CSS string representation of the color
         */
        toCSS(hex: boolean): string

        /** 
         * Transform the gradient color by the specified matrix.
         * 
         * @param matrix - the matrix to transform the gradient color by
         */
        transform(matrix: Matrix): void

        /** 
         * Returns a color object with random {@link #red}, {@link #green}
         * and {@link #blue} values between `0` and `1`.
         * 
         * @return the newly created color object
         */
        static random(): Color

        /** 
         * Returns the addition of the supplied value to both coordinates of
         * the color as a new color.
         * The object itself is not modified!
         * 
         * @param number - the number to add
         * 
         * @return the addition of the color and the value as a new
         * color
         */
        add(number: number): Color

        /** 
         * Returns the addition of the supplied color to the color as a new
         * color.
         * The object itself is not modified!
         * 
         * @param color - the color to add
         * 
         * @return the addition of the two colors as a new color
         */
        add(color: Color): Color

        /** 
         * Returns the subtraction of the supplied value to both coordinates of
         * the color as a new color.
         * The object itself is not modified!
         * 
         * @param number - the number to subtract
         * 
         * @return the subtraction of the color and the value as a new
         * color
         */
        subtract(number: number): Color

        /** 
         * Returns the subtraction of the supplied color to the color as a new
         * color.
         * The object itself is not modified!
         * 
         * @param color - the color to subtract
         * 
         * @return the subtraction of the two colors as a new color
         */
        subtract(color: Color): Color

        /** 
         * Returns the multiplication of the supplied value to both coordinates
         * of the color as a new color.
         * The object itself is not modified!
         * 
         * @param number - the number to multiply
         * 
         * @return the multiplication of the color and the value as a
         * new color
         */
        multiply(number: number): Color

        /** 
         * Returns the multiplication of the supplied color to the color as a
         * new color.
         * The object itself is not modified!
         * 
         * @param color - the color to multiply
         * 
         * @return the multiplication of the two colors as a new color
         */
        multiply(color: Color): Color

        /** 
         * Returns the division of the supplied value to both coordinates of
         * the color as a new color.
         * The object itself is not modified!
         * 
         * @param number - the number to divide
         * 
         * @return the division of the color and the value as a new
         * color
         */
        divide(number: number): Color

        /** 
         * Returns the division of the supplied color to the color as a new
         * color.
         * The object itself is not modified!
         * 
         * @param color - the color to divide
         * 
         * @return the division of the two colors as a new color
         */
        divide(color: Color): Color

    }

    /** 
     * A compound path is a complex path that is made up of one or more
     * simple sub-paths. It can have the `nonzero` fill rule, or the `evenodd` rule
     * applied. Both rules use mathematical equations to determine if any region is
     * outside or inside the final shape. The `evenodd` rule is more predictable:
     * Every other region within a such a compound path is a hole, regardless of
     * path direction.
     * 
     * All the paths in a compound path take on the style of the compound path and
     * can be accessed through its {@link Item#children} list.
     */
    class CompoundPath extends PathItem {
        /** 
         * Specifies whether the compound-path is fully closed, meaning all its
         * contained sub-paths are closed path.
         * 
         * @see Path#closed
         */
        closed: boolean

        /** 
         * The first Segment contained within the compound-path, a short-cut to
         * calling {@link Path#firstSegment} on {@link Item#firstChild}.
         */
        readonly firstSegment: Segment

        /** 
         * The last Segment contained within the compound-path, a short-cut to
         * calling {@link Path#lastSegment} on {@link Item#lastChild}.
         */
        readonly lastSegment: Segment

        /** 
         * All the curves contained within the compound-path, from all its child
         * {@link Path} items.
         */
        readonly curves: Curve[]

        /** 
         * The first Curve contained within the compound-path, a short-cut to
         * calling {@link Path#firstCurve} on {@link Item#firstChild}.
         */
        readonly firstCurve: Curve

        /** 
         * The last Curve contained within the compound-path, a short-cut to
         * calling {@link Path#lastCurve} on {@link Item#lastChild}.
         */
        readonly lastCurve: Curve

        /** 
         * The area that the compound-path's geometry is covering, calculated by
         * getting the {@link Path#area} of each sub-path and it adding up.
         * Note that self-intersecting paths and sub-paths of different orientation
         * can result in areas that cancel each other out.
         */
        readonly area: number

        /** 
         * The total length of all sub-paths in this compound-path, calculated by
         * getting the {@link Path#length} of each sub-path and it adding up.
         */
        readonly length: number


        /** 
         * Creates a new compound path item from SVG path-data and places it at the
         * top of the active layer.
         * 
         * @param pathData - the SVG path-data that describes the geometry
         * of this path
         */
        constructor(pathData: string)

        /** 
         * Creates a new compound path item from an object description and places it
         * at the top of the active layer.
         * 
         * @param object - an object containing properties to be set on the
         *     path
         */
        constructor(object: object)

    }

    /** 
     * The Curve object represents the parts of a path that are connected by
     * two following {@link Segment} objects. The curves of a path can be accessed
     * through its {@link Path#curves} array.
     * 
     * While a segment describe the anchor point and its incoming and outgoing
     * handles, a Curve object describes the curve passing between two such
     * segments. Curves and segments represent two different ways of looking at the
     * same thing, but focusing on different aspects. Curves for example offer many
     * convenient ways to work with parts of the path, finding lengths, positions or
     * tangents at given offsets.
     */
    class Curve  {
        /** 
         * The first anchor point of the curve.
         */
        point1: Point

        /** 
         * The second anchor point of the curve.
         */
        point2: Point

        /** 
         * The handle point that describes the tangent in the first anchor point.
         */
        handle1: Point

        /** 
         * The handle point that describes the tangent in the second anchor point.
         */
        handle2: Point

        /** 
         * The first segment of the curve.
         */
        readonly segment1: Segment

        /** 
         * The second segment of the curve.
         */
        readonly segment2: Segment

        /** 
         * The path that the curve belongs to.
         */
        readonly path: Path

        /** 
         * The index of the curve in the {@link Path#curves} array.
         */
        readonly index: number

        /** 
         * The next curve in the {@link Path#curves} array that the curve
         * belongs to.
         */
        readonly next: Curve

        /** 
         * The previous curve in the {@link Path#curves} array that the curve
         * belongs to.
         */
        readonly previous: Curve

        /** 
         * Specifies whether the points and handles of the curve are selected.
         */
        selected: boolean

        /** 
         * An array of 8 float values, describing this curve's geometry in four
         * absolute x/y pairs (point1, handle1, handle2, point2). This format is
         * used internally for efficient processing of curve geometries, e.g. when
         * calculating intersections or bounds.
         * 
         * Note that the handles are converted to absolute coordinates.
         */
        readonly values: number[]

        /** 
         * An array of 4 point objects, describing this curve's geometry in absolute
         * coordinates (point1, handle1, handle2, point2).
         * 
         * Note that the handles are converted to absolute coordinates.
         */
        readonly points: Point[]

        /** 
         * The approximated length of the curve.
         */
        readonly length: number

        /** 
         * The area that the curve's geometry is covering.
         */
        readonly area: number

        /** 
         * The bounding rectangle of the curve excluding stroke width.
         */
        bounds: Rectangle

        /** 
         * The bounding rectangle of the curve including stroke width.
         */
        strokeBounds: Rectangle

        /** 
         * The bounding rectangle of the curve including handles.
         */
        handleBounds: Rectangle


        /** 
         * Creates a new curve object.
         */
        constructor(segment1: Segment, segment2: Segment)

        /** 
         * Creates a new curve object.
         */
        constructor(point1: PointLike, handle1: PointLike, handle2: PointLike, point2: PointLike)

        /** 
         * Returns a copy of the curve.
         */
        clone(): Curve

        /** 
         * @return a string representation of the curve
         */
        toString(): string

        /** 
         * Determines the type of cubic Bézier curve via discriminant
         * classification, as well as the curve-time parameters of the associated
         * points of inflection, loops, cusps, etc.
         * 
         * @return the curve classification information as an object, see
         *     options
         */
        classify(): object

        /** 
         * Removes the curve from the path that it belongs to, by removing its
         * second segment and merging its handle with the first segment.
         * 
         * @return true if the curve was removed
         */
        remove(): boolean

        /** 
         * Checks if the this is the first curve in the {@link Path#curves} array.
         * 
         * @return true if this is the first curve
         */
        isFirst(): boolean

        /** 
         * Checks if the this is the last curve in the {@link Path#curves} array.
         * 
         * @return true if this is the last curve
         */
        isLast(): boolean

        /** 
         * Creates a new curve as a sub-curve from this curve, its range defined by
         * the given curve-time parameters. If `from` is larger than `to`, then
         * the resulting curve will have its direction reversed.
         * 
         * @param from - the curve-time parameter at which the sub-curve
         * starts
         * @param to - the curve-time parameter at which the sub-curve
         * ends
         * 
         * @return the newly create sub-curve
         */
        getPart(from: number, to: number): Curve

        /** 
         * Divides the curve into two curves at the given offset or location. The
         * curve itself is modified and becomes the first part, the second part is
         * returned as a new curve. If the curve belongs to a path item, a new
         * segment is inserted into the path at the given location, and the second
         * part becomes a part of the path as well.
         * 
         * @see #divideAtTime(time)
         * 
         * @param location - the offset or location on the
         *     curve at which to divide
         * 
         * @return the second part of the divided curve if the location is
         *     valid, {code null} otherwise
         */
        divideAt(location: number | CurveLocation): Curve

        /** 
         * Divides the curve into two curves at the given curve-time parameter. The
         * curve itself is modified and becomes the first part, the second part is
         * returned as a new curve. If the modified curve belongs to a path item,
         * the second part is also added to the path.
         * 
         * @see #divideAt(offset)
         * 
         * @param time - the curve-time parameter on the curve at which to
         *     divide
         * 
         * @return the second part of the divided curve, if the offset is
         *     within the valid range, {code null} otherwise.
         */
        divideAtTime(time: number): Curve

        /** 
         * Splits the path this curve belongs to at the given offset. After
         * splitting, the path will be open. If the path was open already, splitting
         * will result in two paths.
         * 
         * @see Path#splitAt(offset)
         * 
         * @param location - the offset or location on the
         *     curve at which to split
         * 
         * @return the newly created path after splitting, if any
         */
        splitAt(location: number | CurveLocation): Path

        /** 
         * Splits the path this curve belongs to at the given offset. After
         * splitting, the path will be open. If the path was open already, splitting
         * will result in two paths.
         * 
         * @see Path#splitAt(offset)
         * 
         * @param time - the curve-time parameter on the curve at which to
         *     split
         * 
         * @return the newly created path after splitting, if any
         */
        splitAtTime(time: number): Path

        /** 
         * Returns a reversed version of the curve, without modifying the curve
         * itself.
         * 
         * @return a reversed version of the curve
         */
        reversed(): Curve

        /** 
         * Clears the curve's handles by setting their coordinates to zero,
         * turning the curve into a straight line.
         */
        clearHandles(): void

        /** 
         * Checks if this curve has any curve handles set.
         * 
         * @see Curve#handle1
         * @see Curve#handle2
         * @see Segment#hasHandles()
         * @see Path#hasHandles()
         * 
         * @return true if the curve has handles set
         */
        hasHandles(): boolean

        /** 
         * Checks if this curve has any length.
         * 
         * @param epsilon - the epsilon against which to compare the
         *     curve's length
         * 
         * @return true if the curve is longer than the given epsilon
         */
        hasLength(epsilon?: number): boolean

        /** 
         * Checks if this curve appears as a straight line. This can mean that
         * it has no handles defined, or that the handles run collinear with the
         * line that connects the curve's start and end point, not falling
         * outside of the line.
         * 
         * @return true if the curve is straight
         */
        isStraight(): boolean

        /** 
         * Checks if this curve is parametrically linear, meaning that it is
         * straight and its handles are positioned at 1/3 and 2/3 of the total
         * length of the curve.
         * 
         * @return true if the curve is parametrically linear
         */
        isLinear(): boolean

        /** 
         * Checks if the the two curves describe straight lines that are
         * collinear, meaning they run in parallel.
         * 
         * @param curve - the other curve to check against
         * 
         * @return true if the two lines are collinear
         */
        isCollinear(curve: Curve): boolean

        /** 
         * Checks if the curve is a straight horizontal line.
         * 
         * @return true if the line is horizontal
         */
        isHorizontal(): boolean

        /** 
         * Checks if the curve is a straight vertical line.
         * 
         * @return true if the line is vertical
         */
        isVertical(): boolean

        /** 
         * Calculates the curve location at the specified offset on the curve.
         * 
         * @param offset - the offset on the curve
         * 
         * @return the curve location at the specified the offset
         */
        getLocationAt(offset: number): CurveLocation

        /** 
         * Calculates the curve location at the specified curve-time parameter on
         * the curve.
         * 
         * @param time - the curve-time parameter on the curve
         * 
         * @return the curve location at the specified the location
         */
        getLocationAtTime(time: number): CurveLocation

        /** 
         * Calculates the curve-time parameter of the specified offset on the path,
         * relative to the provided start parameter. If offset is a negative value,
         * the parameter is searched to the left of the start parameter. If no start
         * parameter is provided, a default of `0` for positive values of `offset`
         * and `1` for negative values of `offset`.
         * 
         * @param offset - the offset at which to find the curve-time, in
         *     curve length units
         * @param start - the curve-time in relation to which the offset is
         *     determined
         * 
         * @return the curve-time parameter at the specified location
         */
        getTimeAt(offset: number, start?: number): number

        /** 
         * Calculates the curve-time parameters where the curve is tangential to
         * provided tangent. Note that tangents at the start or end are included.
         * 
         * @param tangent - the tangent to which the curve must be tangential
         * 
         * @return at most two curve-time parameters, where the curve is
         * tangential to the given tangent
         */
        getTimesWithTangent(tangent: PointLike): number[]

        /** 
         * Calculates the curve offset at the specified curve-time parameter on
         * the curve.
         * 
         * @param time - the curve-time parameter on the curve
         * 
         * @return the curve offset at the specified the location
         */
        getOffsetAtTime(time: number): number

        /** 
         * Returns the curve location of the specified point if it lies on the
         * curve, `null` otherwise.
         * 
         * @param point - the point on the curve
         * 
         * @return the curve location of the specified point
         */
        getLocationOf(point: PointLike): CurveLocation

        /** 
         * Returns the length of the path from its beginning up to up to the
         * specified point if it lies on the path, `null` otherwise.
         * 
         * @param point - the point on the path
         * 
         * @return the length of the path up to the specified point
         */
        getOffsetOf(point: PointLike): number

        /** 
         * Returns the curve-time parameter of the specified point if it lies on the
         * curve, `null` otherwise.
         * Note that if there is more than one possible solution in a
         * self-intersecting curve, the first found result is returned.
         * 
         * @param point - the point on the curve
         * 
         * @return the curve-time parameter of the specified point
         */
        getTimeOf(point: PointLike): number

        /** 
         * Returns the nearest location on the curve to the specified point.
         * 
         * @param point - the point for which we search the nearest location
         * 
         * @return the location on the curve that's the closest to
         * the specified point
         */
        getNearestLocation(point: PointLike): CurveLocation

        /** 
         * Returns the nearest point on the curve to the specified point.
         * 
         * @param point - the point for which we search the nearest point
         * 
         * @return the point on the curve that's the closest to the
         * specified point
         */
        getNearestPoint(point: PointLike): Point

        /** 
         * Calculates the point on the curve at the given location.
         * 
         * @param location - the offset or location on the
         *     curve
         * 
         * @return the point on the curve at the given location
         */
        getPointAt(location: number | CurveLocation): Point

        /** 
         * Calculates the normalized tangent vector of the curve at the given
         * location.
         * 
         * @param location - the offset or location on the
         *     curve
         * 
         * @return the normalized tangent of the curve at the given location
         */
        getTangentAt(location: number | CurveLocation): Point

        /** 
         * Calculates the normal vector of the curve at the given location.
         * 
         * @param location - the offset or location on the
         *     curve
         * 
         * @return the normal of the curve at the given location
         */
        getNormalAt(location: number | CurveLocation): Point

        /** 
         * Calculates the weighted tangent vector of the curve at the given
         * location, its length reflecting the curve velocity at that location.
         * 
         * @param location - the offset or location on the
         *     curve
         * 
         * @return the weighted tangent of the curve at the given location
         */
        getWeightedTangentAt(location: number | CurveLocation): Point

        /** 
         * Calculates the weighted normal vector of the curve at the given location,
         * its length reflecting the curve velocity at that location.
         * 
         * @param location - the offset or location on the
         *     curve
         * 
         * @return the weighted normal of the curve at the given location
         */
        getWeightedNormalAt(location: number | CurveLocation): Point

        /** 
         * Calculates the curvature of the curve at the given location. Curvatures
         * indicate how sharply a curve changes direction. A straight line has zero
         * curvature, where as a circle has a constant curvature. The curve's radius
         * at the given location is the reciprocal value of its curvature.
         * 
         * @param location - the offset or location on the
         *     curve
         * 
         * @return the curvature of the curve at the given location
         */
        getCurvatureAt(location: number | CurveLocation): number

        /** 
         * Calculates the point on the curve at the given location.
         * 
         * @param time - the curve-time parameter on the curve
         * 
         * @return the point on the curve at the given location
         */
        getPointAtTime(time: number): Point

        /** 
         * Calculates the normalized tangent vector of the curve at the given
         * location.
         * 
         * @param time - the curve-time parameter on the curve
         * 
         * @return the normalized tangent of the curve at the given location
         */
        getTangentAtTime(time: number): Point

        /** 
         * Calculates the normal vector of the curve at the given location.
         * 
         * @param time - the curve-time parameter on the curve
         * 
         * @return the normal of the curve at the given location
         */
        getNormalAtTime(time: number): Point

        /** 
         * Calculates the weighted tangent vector of the curve at the given
         * location, its length reflecting the curve velocity at that location.
         * 
         * @param time - the curve-time parameter on the curve
         * 
         * @return the weighted tangent of the curve at the given location
         */
        getWeightedTangentAtTime(time: number): Point

        /** 
         * Calculates the weighted normal vector of the curve at the given location,
         * its length reflecting the curve velocity at that location.
         * 
         * @param time - the curve-time parameter on the curve
         * 
         * @return the weighted normal of the curve at the given location
         */
        getWeightedNormalAtTime(time: number): Point

        /** 
         * Calculates the curvature of the curve at the given location. Curvatures
         * indicate how sharply a curve changes direction. A straight line has zero
         * curvature, where as a circle has a constant curvature. The curve's radius
         * at the given location is the reciprocal value of its curvature.
         * 
         * @param time - the curve-time parameter on the curve
         * 
         * @return the curvature of the curve at the given location
         */
        getCurvatureAtTime(time: number): number

        /** 
         * Returns all intersections between two {@link Curve} objects as an
         * array of {@link CurveLocation} objects.
         * 
         * @param curve - the other curve to find the intersections with
         *     (if the curve itself or `null` is passed, the self intersection
         *     of the curve is returned, if it exists)
         * 
         * @return the locations of all intersections between
         *     the curves
         */
        getIntersections(curve: Curve): CurveLocation[]

    }

    /** 
     * CurveLocation objects describe a location on {@link Curve} objects, as
     *     defined by the curve-time {@link #time}, a value between `0` (beginning
     *     of the curve) and `1` (end of the curve). If the curve is part of a
     *     {@link Path} item, its {@link #index} inside the {@link Path#curves}
     *     array is also provided.
     * 
     * The class is in use in many places, such as
     * {@link Path#getLocationAt},
     * {@link Path#getLocationOf},
     * {@link PathItem#getNearestLocation},
     * {@link PathItem#getIntersections},
     * etc.
     */
    class CurveLocation  {
        /** 
         * The segment of the curve which is closer to the described location.
         */
        readonly segment: Segment

        /** 
         * The curve that this location belongs to.
         */
        readonly curve: Curve

        /** 
         * The path that this locations is situated on.
         */
        readonly path: Path

        /** 
         * The index of the {@link #curve} within the {@link Path#curves} list, if
         * it is part of a {@link Path} item.
         */
        readonly index: number

        /** 
         * The curve-time parameter, as used by various bezier curve calculations.
         * It is value between `0` (beginning of the curve) and `1` (end of the
         * curve).
         */
        readonly time: number

        /** 
         * The point which is defined by the {@link #curve} and
         * {@link #time}.
         */
        readonly point: Point

        /** 
         * The length of the path from its beginning up to the location described
         * by this object. If the curve is not part of a path, then the length
         * within the curve is returned instead.
         */
        readonly offset: number

        /** 
         * The length of the curve from its beginning up to the location described
         * by this object.
         */
        readonly curveOffset: number

        /** 
         * The curve location on the intersecting curve, if this location is the
         * result of a call to {@link PathItem#getIntersections} /
         * {@link Curve#getIntersections}.
         */
        readonly intersection: CurveLocation

        /** 
         * The tangential vector to the {@link #curve} at the given location.
         */
        readonly tangent: Point

        /** 
         * The normal vector to the {@link #curve} at the given location.
         */
        readonly normal: Point

        /** 
         * The curvature of the {@link #curve} at the given location.
         */
        readonly curvature: number

        /** 
         * The distance from the queried point to the returned location.
         * 
         * @see Curve#getNearestLocation(point)
         * @see PathItem#getNearestLocation(point)
         */
        readonly distance: number


        /** 
         * Creates a new CurveLocation object.
         */
        constructor(curve: Curve, time: number, point?: PointLike)

        /** 
         * Checks whether tow CurveLocation objects are describing the same location
         * on a path, by applying the same tolerances as elsewhere when dealing with
         * curve-time parameters.
         * 
         * @return true if the locations are equal
         */
        equals(location: CurveLocation): boolean

        /** 
         * @return a string representation of the curve location
         */
        toString(): string

        /** 
         * Checks if the location is an intersection with another curve and is
         * merely touching the other curve, as opposed to crossing it.
         * 
         * @see #isCrossing()
         * 
         * @return true if the location is an intersection that is
         * merely touching another curve
         */
        isTouching(): boolean

        /** 
         * Checks if the location is an intersection with another curve and is
         * crossing the other curve, as opposed to just touching it.
         * 
         * @see #isTouching()
         * 
         * @return true if the location is an intersection that is
         * crossing another curve
         */
        isCrossing(): boolean

        /** 
         * Checks if the location is an intersection with another curve and is
         * part of an overlap between the two involved paths.
         * 
         * @see #isCrossing()
         * @see #isTouching()
         * 
         * @return true if the location is an intersection that is
         * part of an overlap between the two involved paths
         */
        hasOverlap(): boolean

    }

    /** 
     * The Event object is the base class for any of the other event types,
     * such as {@link MouseEvent}, {@link ToolEvent} and {@link KeyEvent}.
     */
    class Event  {
        /** 
         * The time at which the event was created, in milliseconds since the epoch.
         */
        readonly timeStamp: number

        /** 
         * The current state of the keyboard modifiers.
         * 
         * @see Key.modifiers
         */
        readonly modifiers: any


        /** 
         * Cancels the event if it is cancelable, without stopping further
         * propagation of the event.
         */
        preventDefault(): void

        /** 
         * Prevents further propagation of the current event.
         */
        stopPropagation(): void

        /** 
         * Cancels the event if it is cancelable, and stops stopping further
         * propagation of the event. This is has the same effect as calling both
         * {@link #stopPropagation} and {@link #preventDefault}.
         * 
         * Any handler can also return `false` to indicate that `stop()` should be
         * called right after.
         */
        stop(): void

    }

    /** 
     * The Gradient object.
     */
    class Gradient  {
        /** 
         * The gradient stops on the gradient ramp.
         */
        stops: GradientStop[]

        /** 
         * Specifies whether the gradient is radial or linear.
         */
        radial: boolean


        /** 
         * @return a copy of the gradient
         */
        clone(): Gradient

        /** 
         * Checks whether the gradient is equal to the supplied gradient.
         * 
         * @return true if they are equal
         */
        equals(gradient: Gradient): boolean

    }

    /** 
     * The GradientStop object.
     */
    class GradientStop  {
        /** 
         * The ramp-point of the gradient stop as a value between `0` and `1`.
         */
        offset: number

        /** 
         * The color of the gradient stop.
         */
        color: Color


        /** 
         * Creates a GradientStop object.
         * 
         * @param color - the color of the stop
         * @param offset - the position of the stop on the gradient
         * ramp as a value between `0` and `1`; `null` or `undefined` for automatic
         * assignment.
         */
        constructor(color?: Color, offset?: number)

        /** 
         * @return a copy of the gradient-stop
         */
        clone(): GradientStop

    }

    /** 
     * A Group is a collection of items. When you transform a Group, its
     * children are treated as a single unit without changing their relative
     * positions.
     */
    class Group extends Item {
        /** 
         * Specifies whether the group item is to be clipped. When setting to
         * `true`, the first child in the group is automatically defined as the
         * clipping mask.
         */
        clipped: boolean


        /** 
         * Creates a new Group item and places it at the top of the active layer.
         * 
         * @param children - An array of children that will be added to the
         * newly created group
         */
        constructor(children?: Item[])

        /** 
         * Creates a new Group item and places it at the top of the active layer.
         * 
         * @param object - an object containing the properties to be set on
         *     the group
         */
        constructor(object: object)

    }

    /** 
     * A HitResult object contains information about the results of a hit
     * test. It is returned by {@link Item#hitTest} and
     * {@link Project#hitTest}.
     */
    class HitResult  {
        /** 
         * Describes the type of the hit result. For example, if you hit a segment
         * point, the type would be `'segment'`.
         */
        type: string

        /** 
         * If the HitResult has a {@link HitResult#type} of `'bounds'`, this
         * property describes which corner of the bounding rectangle was hit.
         */
        name: string

        /** 
         * The item that was hit.
         */
        item: Item

        /** 
         * If the HitResult has a type of 'curve' or 'stroke', this property gives
         * more information about the exact position that was hit on the path.
         */
        location: CurveLocation

        /** 
         * If the HitResult has a type of 'pixel', this property refers to the color
         * of the pixel on the {@link Raster} that was hit.
         */
        color: Color | null

        /** 
         * If the HitResult has a type of 'stroke', 'segment', 'handle-in' or
         * 'handle-out', this property refers to the segment that was hit or that
         * is closest to the hitResult.location on the curve.
         */
        segment: Segment

        /** 
         * Describes the actual coordinates of the segment, handle or bounding box
         * corner that was hit.
         */
        point: Point


    }

    /** 
     * The Item type allows you to access and modify the items in
     * Paper.js projects. Its functionality is inherited by different project
     * item types such as {@link Path}, {@link CompoundPath}, {@link Group},
     * {@link Layer} and {@link Raster}. They each add a layer of functionality that
     * is unique to their type, but share the underlying properties and functions
     * that they inherit from Item.
     */
    class Item  {
        /** 
         * The unique id of the item.
         */
        readonly id: number

        /** 
         * The class name of the item as a string.
         */
        className: string

        /** 
         * The name of the item. If the item has a name, it can be accessed by name
         * through its parent's children list.
         */
        name: string

        /** 
         * The path style of the item.
         */
        style: Style

        /** 
         * Specifies whether the item is locked. When set to `true`, item
         * interactions with the mouse are disabled.
         */
        locked: boolean

        /** 
         * Specifies whether the item is visible. When set to `false`, the item
         * won't be drawn.
         */
        visible: boolean

        /** 
         * The blend mode with which the item is composited onto the canvas. Both
         * the standard canvas compositing modes, as well as the new CSS blend modes
         * are supported. If blend-modes cannot be rendered natively, they are
         * emulated. Be aware that emulation can have an impact on performance.
         */
        blendMode: string

        /** 
         * The opacity of the item as a value between `0` and `1`.
         */
        opacity: number

        /** 
         * Specifies whether the item is selected. This will also return `true` for
         * {@link Group} items if they are partially selected, e.g. groups
         * containing selected or partially selected paths.
         * 
         * Paper.js draws the visual outlines of selected items on top of your
         * project. This can be useful for debugging, as it allows you to see the
         * construction of paths, position of path curves, individual segment points
         * and bounding boxes of symbol and raster items.
         * 
         * @see Project#selectedItems
         * @see Segment#selected
         * @see Curve#selected
         * @see Point#selected
         */
        selected: boolean

        /** 
         * Specifies whether the item defines a clip mask. This can only be set on
         * paths and compound paths, and only if the item is already contained
         * within a clipping group.
         */
        clipMask: boolean

        /** 
         * A plain javascript object which can be used to store
         * arbitrary data on the item.
         */
        data: any

        /** 
         * The item's position within the parent item's coordinate system. By
         * default, this is the {@link Rectangle#center} of the item's
         * {@link #bounds} rectangle.
         */
        position: Point

        /** 
         * The item's pivot point specified in the item coordinate system, defining
         * the point around which all transformations are hinging. This is also the
         * reference point for {@link #position}. By default, it is set to `null`,
         * meaning the {@link Rectangle#center} of the item's {@link #bounds}
         * rectangle is used as pivot.
         */
        pivot: Point

        /** 
         * The bounding rectangle of the item excluding stroke width.
         */
        bounds: Rectangle

        /** 
         * The bounding rectangle of the item including stroke width.
         */
        strokeBounds: Rectangle

        /** 
         * The bounding rectangle of the item including handles.
         */
        handleBounds: Rectangle

        /** 
         * The bounding rectangle of the item without any matrix transformations.
         * 
         * Typical use case would be drawing a frame around the object where you
         * want to draw something of the same size, position, rotation, and scaling,
         * like a selection frame.
         */
        internalBounds: Rectangle

        /** 
         * The current rotation angle of the item, as described by its
         * {@link #matrix}.
         * Please note that this only returns meaningful values for items with
         * {@link #applyMatrix} set to `false`, meaning they do not directly bake
         * transformations into their content.
         */
        rotation: number

        /** 
         * The current scale factor of the item, as described by its
         * {@link #matrix}.
         * Please note that this only returns meaningful values for items with
         * {@link #applyMatrix} set to `false`, meaning they do not directly bake
         * transformations into their content.
         */
        scaling: Point

        /** 
         * The item's transformation matrix, defining position and dimensions in
         * relation to its parent item in which it is contained.
         */
        matrix: Matrix

        /** 
         * The item's global transformation matrix in relation to the global project
         * coordinate space. Note that the view's transformations resulting from
         * zooming and panning are not factored in.
         */
        readonly globalMatrix: Matrix

        /** 
         * The item's global matrix in relation to the view coordinate space. This
         * means that the view's transformations resulting from zooming and panning
         * are factored in.
         */
        readonly viewMatrix: Matrix

        /** 
         * Controls whether the transformations applied to the item (e.g. through
         * {@link #transform}, {@link #rotate},
         * {@link #scale}, etc.) are stored in its {@link #matrix} property,
         * or whether they are directly applied to its contents or children (passed
         * on to the segments in {@link Path} items, the children of {@link Group}
         * items, etc.).
         */
        applyMatrix: boolean

        /** 
         * The project that this item belongs to.
         */
        readonly project: Project

        /** 
         * The view that this item belongs to.
         */
        readonly view: View

        /** 
         * The layer that this item is contained within.
         */
        readonly layer: Layer

        /** 
         * The item that this item is contained within.
         */
        parent: Item

        /** 
         * The children items contained within this item. Items that define a
         * {@link #name} can also be accessed by name.
         * 
         * <b>Please note:</b> The children array should not be modified directly
         * using array functions. To remove single items from the children list, use
         * {@link Item#remove}, to remove all items from the children list, use
         * {@link Item#removeChildren}. To add items to the children list, use
         * {@link Item#addChild} or {@link Item#insertChild}.
         */
        children: Item[]

        /** 
         * The first item contained within this item. This is a shortcut for
         * accessing `item.children[0]`.
         */
        readonly firstChild: Item

        /** 
         * The last item contained within this item.This is a shortcut for
         * accessing `item.children[item.children.length - 1]`.
         */
        readonly lastChild: Item

        /** 
         * The next item on the same level as this item.
         */
        readonly nextSibling: Item

        /** 
         * The previous item on the same level as this item.
         */
        readonly previousSibling: Item

        /** 
         * The index of this item within the list of its parent's children.
         */
        readonly index: number

        /** 
         * The color of the stroke.
         */
        strokeColor: Color | null

        /** 
         * The width of the stroke.
         */
        strokeWidth: number

        /** 
         * The shape to be used at the beginning and end of open {@link Path} items,
         * when they have a stroke.
         */
        strokeCap: string

        /** 
         * The shape to be used at the segments and corners of {@link Path} items
         * when they have a stroke.
         */
        strokeJoin: string

        /** 
         * The dash offset of the stroke.
         */
        dashOffset: number

        /** 
         * Specifies whether the stroke is to be drawn taking the current affine
         * transformation into account (the default behavior), or whether it should
         * appear as a non-scaling stroke.
         */
        strokeScaling: boolean

        /** 
         * Specifies an array containing the dash and gap lengths of the stroke.
         */
        dashArray: number[]

        /** 
         * The miter limit of the stroke.
         * When two line segments meet at a sharp angle and miter joins have been
         * specified for {@link Item#strokeJoin}, it is possible for the miter to
         * extend far beyond the {@link Item#strokeWidth} of the path. The
         * miterLimit imposes a limit on the ratio of the miter length to the
         * {@link Item#strokeWidth}.
         */
        miterLimit: number

        /** 
         * The fill color of the item.
         */
        fillColor: Color | null

        /** 
         * The fill-rule with which the shape gets filled. Please note that only
         * modern browsers support fill-rules other than `'nonzero'`.
         */
        fillRule: string

        /** 
         * The shadow color.
         */
        shadowColor: Color | null

        /** 
         * The shadow's blur radius.
         */
        shadowBlur: number

        /** 
         * The shadow's offset.
         */
        shadowOffset: Point

        /** 
         * The color the item is highlighted with when selected. If the item does
         * not specify its own color, the color defined by its layer is used instead.
         */
        selectedColor: Color | null

        /** 
         * Item level handler function to be called on each frame of an animation.
         * The function receives an event object which contains information about
         * the frame event:
         * 
         * @see View#onFrame
         * 
         * @option event.count {Number} the number of times the frame event was
         *     fired
         * @option event.time {Number} the total amount of time passed since the
         *     first frame event in seconds
         * @option event.delta {Number} the time passed in seconds since the last
         *     frame event
         */
        onFrame: Function | null

        /** 
         * The function to be called when the mouse button is pushed down on the
         * item. The function receives a {@link MouseEvent} object which contains
         * information about the mouse event.
         * Note that such mouse events bubble up the scene graph hierarchy and will
         * reach the view, unless they are stopped with {@link
         * Event#stopPropagation()} or by returning `false` from the handler.
         * 
         * @see View#onMouseDown
         */
        onMouseDown: Function | null

        /** 
         * The function to be called when the mouse position changes while the mouse
         * is being dragged over the item. The function receives a {@link
         * MouseEvent} object which contains information about the mouse event.
         * Note that such mouse events bubble up the scene graph hierarchy and will
         * reach the view, unless they are stopped with {@link
         * Event#stopPropagation()} or by returning `false` from the handler.
         * 
         * @see View#onMouseDrag
         */
        onMouseDrag: Function | null

        /** 
         * The function to be called when the mouse button is released over the item.
         * The function receives a {@link MouseEvent} object which contains
         * information about the mouse event.
         * Note that such mouse events bubble up the scene graph hierarchy and will
         * reach the view, unless they are stopped with {@link
         * Event#stopPropagation()} or by returning `false` from the handler.
         * 
         * @see View#onMouseUp
         */
        onMouseUp: Function | null

        /** 
         * The function to be called when the mouse clicks on the item. The function
         * receives a {@link MouseEvent} object which contains information about the
         * mouse event.
         * Note that such mouse events bubble up the scene graph hierarchy and will
         * reach the view, unless they are stopped with {@link
         * Event#stopPropagation()} or by returning `false` from the handler.
         * 
         * @see View#onClick
         */
        onClick: Function | null

        /** 
         * The function to be called when the mouse double clicks on the item. The
         * function receives a {@link MouseEvent} object which contains information
         * about the mouse event.
         * Note that such mouse events bubble up the scene graph hierarchy and will
         * reach the view, unless they are stopped with {@link
         * Event#stopPropagation()} or by returning `false` from the handler.
         * 
         * @see View#onDoubleClick
         */
        onDoubleClick: Function | null

        /** 
         * The function to be called repeatedly while the mouse moves over the item.
         * The function receives a {@link MouseEvent} object which contains
         * information about the mouse event.
         * Note that such mouse events bubble up the scene graph hierarchy and will
         * reach the view, unless they are stopped with {@link
         * Event#stopPropagation()} or by returning `false` from the handler.
         * 
         * @see View#onMouseMove
         */
        onMouseMove: Function | null

        /** 
         * The function to be called when the mouse moves over the item. This
         * function will only be called again, once the mouse moved outside of the
         * item first. The function receives a {@link MouseEvent} object which
         * contains information about the mouse event.
         * Note that such mouse events bubble up the scene graph hierarchy and will
         * reach the view, unless they are stopped with {@link
         * Event#stopPropagation()} or by returning `false` from the handler.
         * 
         * @see View#onMouseEnter
         */
        onMouseEnter: Function | null

        /** 
         * The function to be called when the mouse moves out of the item.
         * The function receives a {@link MouseEvent} object which contains
         * information about the mouse event.
         * Note that such mouse events bubble up the scene graph hierarchy and will
         * reach the view, unless they are stopped with {@link
         * Event#stopPropagation()} or by returning `false` from the handler.
         * 
         * @see View#onMouseLeave
         */
        onMouseLeave: Function | null


        /** 
         * Sets the properties of the passed object literal on this item to the
         * values defined in the object literal, if the item has property of the
         * given name (or a setter defined for it).
         * 
         * @return the item itself
         */
        set(props: object): this

        /** 
         * Clones the item within the same project and places the copy above the
         * item.
         * 
         * @option [insert=true] specifies whether the copy should be
         *     inserted into the scene graph. When set to `true`, it is inserted
         *     above the original
         * @option [deep=true] specifies whether the item's children should also be
         *     cloned
         * 
         * @return the newly cloned item
         */
        clone(options?: object): this

        /** 
         * Copies the content of the specified item over to this item.
         * 
         * @param source - the item to copy the content from
         */
        copyContent(source: Item): void

        /** 
         * Copies all attributes of the specified item over to this item. This
         * includes its style, visibility, matrix, pivot, blend-mode, opacity,
         * selection state, data, name, etc.
         * 
         * @param source - the item to copy the attributes from
         * @param excludeMatrix - whether to exclude the transformation
         * matrix when copying all attributes
         */
        copyAttributes(source: Item, excludeMatrix: boolean): void

        /** 
         * Rasterizes the item into a newly created Raster object. The item itself
         * is not removed after rasterization.
         * 
         * @option [resolution=view.resolution] {Number} the desired resolution to
         *     be used when rasterizing, in pixels per inch (DPI). If not specified,
         *     the value of `view.resolution` is used by default.
         * @option [raster=null] {Raster} specifies a raster to be reused when
         *     rasterizing. If the raster has the desired size already, then the
         *     underlying canvas is reused and no new memory needs to be allocated.
         *     If no raster is provided, a new raster item is created and returned
         *     instead.
         * @option [insert=true] {Boolean} specifies whether the raster should be
         *     inserted into the scene graph. When set to `true`, it is inserted
         *     above the rasterized item.
         * 
         * @param options - the rasterization options
         * 
         * @return the reused raster or the newly created raster item
         */
        rasterize(options?: object): Raster

        /** 
         * Checks whether the item's geometry contains the given point.
         * 
         * @param point - the point to check for
         */
        contains(point: PointLike): boolean

        /** 
         * @param rect - the rectangle to check against
         */
        isInside(rect: RectangleLike): boolean

        /** 
         * @param item - the item to check against
         */
        intersects(item: Item): boolean

        /** 
         * Performs a hit-test on the item and its children (if it is a {@link
         * Group} or {@link Layer}) at the location of the specified point,
         * returning the first found hit.
         * 
         * The options object allows you to control the specifics of the hit-
         * test and may contain a combination of the following values:
         * 
         * @option [options.tolerance={@link PaperScope#settings}.hitTolerance]
         *     {Number} the tolerance of the hit-test
         * @option options.class {Function} only hit-test against a specific item
         *     class, or any of its sub-classes, by providing the constructor
         *     function against which an `instanceof` check is performed:
         *     {@values  Group, Layer, Path, CompoundPath, Shape, Raster,
         *     SymbolItem, PointText, ...}
         * @option options.match {Function} a match function to be called for each
         *     found hit result: Return `true` to return the result, `false` to keep
         *     searching
         * @option [options.fill=true] {Boolean} hit-test the fill of items
         * @option [options.stroke=true] {Boolean} hit-test the stroke of path
         *     items, taking into account the setting of stroke color and width
         * @option [options.segments=true] {Boolean} hit-test for {@link
         *     Segment#point} of {@link Path} items
         * @option options.curves {Boolean} hit-test the curves of path items,
         *     without taking the stroke color or width into account
         * @option options.handles {Boolean} hit-test for the handles ({@link
         *     Segment#handleIn} / {@link Segment#handleOut}) of path segments.
         * @option options.ends {Boolean} only hit-test for the first or last
         *     segment points of open path items
         * @option options.position {Boolean} hit-test the {@link Item#position} of
         *     of items, which depends on the setting of {@link Item#pivot}
         * @option options.center {Boolean} hit-test the {@link Rectangle#center} of
         *     the bounding rectangle of items ({@link Item#bounds})
         * @option options.bounds {Boolean} hit-test the corners and side-centers of
         *     the bounding rectangle of items ({@link Item#bounds})
         * @option options.guides {Boolean} hit-test items that have {@link
         *     Item#guide} set to `true`
         * @option options.selected {Boolean} only hit selected items
         * 
         * @param point - the point where the hit-test should be performed
         *     (in global coordinates system).
         * 
         * @return a hit result object describing what exactly was hit
         *     or `null` if nothing was hit
         */
        hitTest(point: PointLike, options?: object): HitResult

        /** 
         * Performs a hit-test on the item and its children (if it is a {@link
         * Group} or {@link Layer}) at the location of the specified point,
         * returning all found hits.
         * 
         * The options object allows you to control the specifics of the hit-
         * test. See {@link #hitTest} for a list of all options.
         * 
         * @see #hitTest(point[, options]);
         * 
         * @param point - the point where the hit-test should be performed
         *     (in global coordinates system).
         * 
         * @return hit result objects for all hits, describing what
         *     exactly was hit or `null` if nothing was hit
         */
        hitTestAll(point: PointLike, options?: object): HitResult[]

        /** 
         * Checks whether the item matches the criteria described by the given
         * object, by iterating over all of its properties and matching against
         * their values through {@link #matches}.
         * 
         * See {@link Project#getItems} for a selection of illustrated
         * examples.
         * 
         * @see #getItems(options)
         * 
         * @param options - the criteria to match against
         * 
         * @return true if the item matches all the criteria
         */
        matches(options: object | Function): boolean

        /** 
         * Checks whether the item matches the given criteria. Extended matching is
         * possible by providing a compare function or a regular expression.
         * Matching points, colors only work as a comparison of the full object, not
         * partial matching (e.g. only providing the x-coordinate to match all
         * points with that x-value). Partial matching does work for
         * {@link Item#data}.
         * 
         * See {@link Project#getItems} for a selection of illustrated
         * examples.
         * 
         * @see #getItems(options)
         * 
         * @param name - the name of the state to match against
         * @param compare - the value, function or regular expression to
         * compare against
         * 
         * @return true if the item matches the state
         */
        matches(name: string, compare: object): boolean

        /** 
         * Fetch the descendants (children or children of children) of this item
         * that match the properties in the specified object. Extended matching is
         * possible by providing a compare function or regular expression. Matching
         * points, colors only work as a comparison of the full object, not partial
         * matching (e.g. only providing the x- coordinate to match all points with
         * that x-value). Partial matching does work for {@link Item#data}.
         * 
         * Matching items against a rectangular area is also possible, by setting
         * either `options.inside` or `options.overlapping` to a rectangle
         * describing the area in which the items either have to be fully or partly
         * contained.
         * 
         * See {@link Project#getItems} for a selection of illustrated
         * examples.
         * 
         * @see #matches(options)
         * 
         * @option [options.recursive=true] {Boolean} whether to loop recursively
         *     through all children, or stop at the current level
         * @option options.match {Function} a match function to be called for each
         *     item, allowing the definition of more flexible item checks that are
         *     not bound to properties. If no other match properties are defined,
         *     this function can also be passed instead of the `options` object
         * @option options.class {Function} the constructor function of the item
         *     type to match against
         * @option options.inside {Rectangle} the rectangle in which the items need
         *     to be fully contained
         * @option options.overlapping {Rectangle} the rectangle with which the
         *     items need to at least partly overlap
         * 
         * @param options - the criteria to match against
         * 
         * @return the list of matching descendant items
         */
        getItems(options: object | Function): Item[]

        /** 
         * Fetch the first descendant (child or child of child) of this item
         * that matches the properties in the specified object.
         * Extended matching is possible by providing a compare function or
         * regular expression. Matching points, colors only work as a comparison
         * of the full object, not partial matching (e.g. only providing the x-
         * coordinate to match all points with that x-value). Partial matching
         * does work for {@link Item#data}.
         * See {@link Project#getItems} for a selection of illustrated
         * examples.
         * 
         * @see #getItems(options)
         * 
         * @param options - the criteria to match against
         * 
         * @return the first descendant item matching the given criteria
         */
        getItem(options: object | Function): Item

        /** 
         * Exports (serializes) the item with its content and child items to a JSON
         * data string.
         * 
         * @option [options.asString=true] {Boolean} whether the JSON is returned as
         *     a `Object` or a `String`
         * @option [options.precision=5] {Number} the amount of fractional digits in
         *     numbers used in JSON data
         * 
         * @param options - the serialization options
         * 
         * @return the exported JSON data
         */
        exportJSON(options?: object): string

        /** 
         * Imports (deserializes) the stored JSON data into this item. If the data
         * describes an item of the same class or a parent class of the item, the
         * data is imported into the item itself. If not, the imported item is added
         * to this item's {@link Item#children} list. Note that not all type of
         * items can have children.
         * 
         * @param json - the JSON data to import from
         */
        importJSON(json: string): Item

        /** 
         * Exports the item with its content and child items as an SVG DOM.
         * 
         * @option [options.bounds='view'] {String|Rectangle} the bounds of the area
         *     to export, either as a string ({@values 'view', content'}), or a
         *     {@link Rectangle} object: `'view'` uses the view bounds,
         *     `'content'` uses the stroke bounds of all content
         * @option [options.matrix=paper.view.matrix] {Matrix} the matrix with which
         *     to transform the exported content: If `options.bounds` is set to
         *     `'view'`, `paper.view.matrix` is used, for all other settings of
         *     `options.bounds` the identity matrix is used.
         * @option [options.asString=false] {Boolean} whether a SVG node or a
         *     `String` is to be returned
         * @option [options.precision=5] {Number} the amount of fractional digits in
         *     numbers used in SVG data
         * @option [options.matchShapes=false] {Boolean} whether path items should
         *     tried to be converted to SVG shape items (rect, circle, ellipse,
         *     line, polyline, polygon), if their geometries match
         * @option [options.embedImages=true] {Boolean} whether raster images should
         *     be embedded as base64 data inlined in the xlink:href attribute, or
         *     kept as a link to their external URL.
         * 
         * @param options - the export options
         * 
         * @return the item converted to an SVG node or a
         * `String` depending on `option.asString` value
         */
        exportSVG(options?: object): SVGElement | string

        /** 
         * Converts the provided SVG content into Paper.js items and adds them to
         * the this item's children list. Note that the item is not cleared first.
         * You can call {@link Item#removeChildren} to do so.
         * 
         * @option [options.expandShapes=false] {Boolean} whether imported shape
         *     items should be expanded to path items
         * @option options.onLoad {Function} the callback function to call once the
         *     SVG content is loaded from the given URL receiving two arguments: the
         *     converted `item` and the original `svg` data as a string. Only
         *     required when loading from external resources.
         * @option options.onError {Function} the callback function to call if an
         *     error occurs during loading. Only required when loading from external
         *     resources.
         * @option [options.insert=true] {Boolean} whether the imported items should
         *     be added to the item that `importSVG()` is called on
         * @option [options.applyMatrix={@link PaperScope#settings}.applyMatrix]
         *     {Boolean} whether the imported items should have their transformation
         *     matrices applied to their contents or not
         * 
         * @param svg - the SVG content to import, either as a SVG
         *     DOM node, a string containing SVG content, or a string describing the
         *     URL of the SVG file to fetch.
         * @param options - the import options
         * 
         * @return the newly created Paper.js item containing the converted
         *     SVG content
         */
        importSVG(svg: SVGElement | string, options?: object): Item

        /** 
         * Imports the provided external SVG file, converts it into Paper.js items
         * and adds them to the this item's children list. Note that the item is not
         * cleared first. You can call {@link Item#removeChildren} to do so.
         * 
         * @param svg - the URL of the SVG file to fetch.
         * @param onLoad - the callback function to call once the SVG
         *     content is loaded from the given URL receiving two arguments: the
         *     converted `item` and the original `svg` data as a string. Only
         *     required when loading from external files.
         * 
         * @return the newly created Paper.js item containing the converted
         *     SVG content
         */
        importSVG(svg: SVGElement | string, onLoad: Function): Item

        /** 
         * Adds the specified item as a child of this item at the end of the its
         * {@link #children}  list. You can use this function for groups, compound
         * paths and layers.
         * 
         * @param item - the item to be added as a child
         * 
         * @return the added item, or `null` if adding was not possible
         */
        addChild(item: Item): Item

        /** 
         * Inserts the specified item as a child of this item at the specified index
         * in its {@link #children} list. You can use this function for groups,
         * compound paths and layers.
         * 
         * @param index - the index at which to insert the item
         * @param item - the item to be inserted as a child
         * 
         * @return the inserted item, or `null` if inserting was not possible
         */
        insertChild(index: number, item: Item): Item

        /** 
         * Adds the specified items as children of this item at the end of the its
         * children list. You can use this function for groups, compound paths and
         * layers.
         * 
         * @param items - the items to be added as children
         * 
         * @return the added items, or `null` if adding was not possible
         */
        addChildren(items: Item[]): Item[]

        /** 
         * Inserts the specified items as children of this item at the specified
         * index in its {@link #children} list. You can use this function for
         * groups, compound paths and layers.
         * 
         * @param items - the items to be appended as children
         * 
         * @return the inserted items, or `null` if inserted was not
         *     possible
         */
        insertChildren(index: number, items: Item[]): Item[]

        /** 
         * Inserts this item above the specified item.
         * 
         * @param item - the item above which it should be inserted
         * 
         * @return the inserted item, or `null` if inserting was not possible
         */
        insertAbove(item: Item): Item

        /** 
         * Inserts this item below the specified item.
         * 
         * @param item - the item below which it should be inserted
         * 
         * @return the inserted item, or `null` if inserting was not possible
         */
        insertBelow(item: Item): Item

        /** 
         * Sends this item to the back of all other items within the same parent.
         */
        sendToBack(): void

        /** 
         * Brings this item to the front of all other items within the same parent.
         */
        bringToFront(): void

        /** 
         * Adds it to the specified owner, which can be either a {@link Item} or a
         * {@link Project}.
         * 
         * @param owner - the item or project to
         * add the item to
         * 
         * @return the item itself, if it was successfully added
         */
        addTo(owner: Project | Layer | Group | CompoundPath): this

        /** 
         * Clones the item and adds it to the specified owner, which can be either
         * a {@link Item} or a {@link Project}.
         * 
         * @param owner - the item or project to
         * copy the item to
         * 
         * @return the new copy of the item, if it was successfully added
         */
        copyTo(owner: Project | Layer | Group | CompoundPath): this

        /** 
         * If this is a group, layer or compound-path with only one child-item,
         * the child-item is moved outside and the parent is erased. Otherwise, the
         * item itself is returned unmodified.
         * 
         * @return the reduced item
         */
        reduce(options: any): Item

        /** 
         * Removes the item and all its children from the project. The item is not
         * destroyed and can be inserted again after removal.
         * 
         * @return true if the item was removed
         */
        remove(): boolean

        /** 
         * Replaces this item with the provided new item which will takes its place
         * in the project hierarchy instead.
         * 
         * @param item - the item that will replace this item
         * 
         * @return true if the item was replaced
         */
        replaceWith(item: Item): boolean

        /** 
         * Removes all of the item's {@link #children} (if any).
         * 
         * @return an array containing the removed items
         */
        removeChildren(): Item[]

        /** 
         * Removes the children from the specified `start` index to and excluding
         * the `end` index from the parent's {@link #children} array.
         * 
         * @param start - the beginning index, inclusive
         * @param end - the ending index, exclusive
         * 
         * @return an array containing the removed items
         */
        removeChildren(start: number, end?: number): Item[]

        /** 
         * Reverses the order of the item's children
         */
        reverseChildren(): void

        /** 
         * Specifies whether the item has any content or not. The meaning of what
         * content is differs from type to type. For example, a {@link Group} with
         * no children, a {@link TextItem} with no text content and a {@link Path}
         * with no segments all are considered empty.
         * 
         * @param recursively - whether an item with children should be
         * considered empty if all its descendants are empty
         */
        isEmpty(recursively?: boolean): boolean

        /** 
         * Checks whether the item has a fill.
         * 
         * @return true if the item has a fill
         */
        hasFill(): boolean

        /** 
         * Checks whether the item has a stroke.
         * 
         * @return true if the item has a stroke
         */
        hasStroke(): boolean

        /** 
         * Checks whether the item has a shadow.
         * 
         * @return true if the item has a shadow
         */
        hasShadow(): boolean

        /** 
         * Checks if the item contains any children items.
         * 
         * @return true it has one or more children
         */
        hasChildren(): boolean

        /** 
         * Checks whether the item and all its parents are inserted into scene graph
         * or not.
         * 
         * @return true if the item is inserted into the scene graph
         */
        isInserted(): boolean

        /** 
         * Checks if this item is above the specified item in the stacking order
         * of the project.
         * 
         * @param item - the item to check against
         * 
         * @return true if it is above the specified item
         */
        isAbove(item: Item): boolean

        /** 
         * Checks if the item is below the specified item in the stacking order of
         * the project.
         * 
         * @param item - the item to check against
         * 
         * @return true if it is below the specified item
         */
        isBelow(item: Item): boolean

        /** 
         * Checks whether the specified item is the parent of the item.
         * 
         * @param item - the item to check against
         * 
         * @return true if it is the parent of the item
         */
        isParent(item: Item): boolean

        /** 
         * Checks whether the specified item is a child of the item.
         * 
         * @param item - the item to check against
         * 
         * @return true it is a child of the item
         */
        isChild(item: Item): boolean

        /** 
         * Checks if the item is contained within the specified item.
         * 
         * @param item - the item to check against
         * 
         * @return true if it is inside the specified item
         */
        isDescendant(item: Item): boolean

        /** 
         * Checks if the item is an ancestor of the specified item.
         * 
         * @param item - the item to check against
         * 
         * @return true if the item is an ancestor of the specified
         * item
         */
        isAncestor(item: Item): boolean

        /** 
         * Checks if the item is an a sibling of the specified item.
         * 
         * @param item - the item to check against
         * 
         * @return true if the item is aa sibling of the specified item
         */
        isSibling(item: Item): boolean

        /** 
         * Checks whether the item is grouped with the specified item.
         * 
         * @return true if the items are grouped together
         */
        isGroupedWith(item: Item): boolean

        /** 
         * Translates (moves) the item by the given offset views.
         * 
         * @param delta - the offset to translate the item by
         */
        translate(delta: PointLike): void

        /** 
         * Rotates the item by a given angle around the given center point.
         * 
         * Angles are oriented clockwise and measured in degrees.
         * 
         * @see Matrix#rotate(angle[, center])
         * 
         * @param angle - the rotation angle
         */
        rotate(angle: number, center?: PointLike): void

        /** 
         * Scales the item by the given value from its center point, or optionally
         * from a supplied point.
         * 
         * @param scale - the scale factor
         */
        scale(scale: number, center?: PointLike): void

        /** 
         * Scales the item by the given values from its center point, or optionally
         * from a supplied point.
         * 
         * @param hor - the horizontal scale factor
         * @param ver - the vertical scale factor
         */
        scale(hor: number, ver: number, center?: PointLike): void

        /** 
         * Shears the item by the given value from its center point, or optionally
         * by a supplied point.
         * 
         * @see Matrix#shear(shear[, center])
         * 
         * @param shear - the horizontal and vertical shear factors as a point
         */
        shear(shear: PointLike, center?: PointLike): void

        /** 
         * Shears the item by the given values from its center point, or optionally
         * by a supplied point.
         * 
         * @see Matrix#shear(hor, ver[, center])
         * 
         * @param hor - the horizontal shear factor
         * @param ver - the vertical shear factor
         */
        shear(hor: number, ver: number, center?: PointLike): void

        /** 
         * Skews the item by the given angles from its center point, or optionally
         * by a supplied point.
         * 
         * @see Matrix#shear(skew[, center])
         * 
         * @param skew - the horizontal and vertical skew angles in degrees
         */
        skew(skew: PointLike, center?: PointLike): void

        /** 
         * Skews the item by the given angles from its center point, or optionally
         * by a supplied point.
         * 
         * @see Matrix#shear(hor, ver[, center])
         * 
         * @param hor - the horizontal skew angle in degrees
         * @param ver - the vertical sskew angle in degrees
         */
        skew(hor: number, ver: number, center?: PointLike): void

        /** 
         * Transform the item.
         * 
         * @param matrix - the matrix by which the item shall be transformed
         */
        transform(matrix: Matrix): void

        /** 
         * Converts the specified point from global project coordinate space to the
         * item's own local coordinate space.
         * 
         * @param point - the point to be transformed
         * 
         * @return the transformed point as a new instance
         */
        globalToLocal(point: PointLike): Point

        /** 
         * Converts the specified point from the item's own local coordinate space
         * to the global project coordinate space.
         * 
         * @param point - the point to be transformed
         * 
         * @return the transformed point as a new instance
         */
        localToGlobal(point: PointLike): Point

        /** 
         * Converts the specified point from the parent's coordinate space to
         * item's own local coordinate space.
         * 
         * @param point - the point to be transformed
         * 
         * @return the transformed point as a new instance
         */
        parentToLocal(point: PointLike): Point

        /** 
         * Converts the specified point from the item's own local coordinate space
         * to the parent's coordinate space.
         * 
         * @param point - the point to be transformed
         * 
         * @return the transformed point as a new instance
         */
        localToParent(point: PointLike): Point

        /** 
         * Transform the item so that its {@link #bounds} fit within the specified
         * rectangle, without changing its aspect ratio.
         */
        fitBounds(rectangle: RectangleLike, fill?: boolean): void

        /** 
         * Attaches an event handler to the item.
         * 
         * @param type - the type of event: {@values 'frame', mousedown',
         *     'mouseup', 'mousedrag', 'click', 'doubleclick', 'mousemove',
         *     'mouseenter', 'mouseleave'}
         * @param function - the function to be called when the event
         *     occurs, receiving a {@link MouseEvent} or {@link Event} object as its
         *     sole argument
         * 
         * @return this item itself, so calls can be chained
         */
        on(type: string, callback: Function): this

        /** 
         * Attaches one or more event handlers to the item.
         * 
         * @param object - an object containing one or more of the following
         *     properties: {@values frame, mousedown, mouseup, mousedrag, click,
         *     doubleclick, mousemove, mouseenter, mouseleave}
         * 
         * @return this item itself, so calls can be chained
         */
        on(object: object): this

        /** 
         * Detach an event handler from the item.
         * 
         * @param type - the type of event: {@values 'frame', mousedown',
         *     'mouseup', 'mousedrag', 'click', 'doubleclick', 'mousemove',
         *     'mouseenter', 'mouseleave'}
         * @param function - the function to be detached
         * 
         * @return this item itself, so calls can be chained
         */
        off(type: string, callback: Function): this

        /** 
         * Detach one or more event handlers to the item.
         * 
         * @param object - an object containing one or more of the following
         *     properties: {@values frame, mousedown, mouseup, mousedrag, click,
         *     doubleclick, mousemove, mouseenter, mouseleave}
         * 
         * @return this item itself, so calls can be chained
         */
        off(object: object): this

        /** 
         * Emit an event on the item.
         * 
         * @param type - the type of event: {@values 'frame', mousedown',
         *     'mouseup', 'mousedrag', 'click', 'doubleclick', 'mousemove',
         *     'mouseenter', 'mouseleave'}
         * @param event - an object literal containing properties describing
         * the event
         * 
         * @return true if the event had listeners
         */
        emit(type: string, event: object): boolean

        /** 
         * Check if the item has one or more event handlers of the specified type.
         * 
         * @param type - the type of event: {@values 'frame', mousedown',
         *     'mouseup', 'mousedrag', 'click', 'doubleclick', 'mousemove',
         *     'mouseenter', 'mouseleave'}
         * 
         * @return true if the item has one or more event handlers of
         * the specified type
         */
        responds(type: string): boolean

        /** 
         * Removes the item when the events specified in the passed options object
         * occur.
         * 
         * @option options.move {Boolean) remove the item when the next {@link
         *     Tool#onMouseMove} event is fired.
         * @option options.drag {Boolena) remove the item when the next {@link
         *     Tool#onMouseDrag} event is fired.
         * @option options.down {Boolean) remove the item when the next {@link
         *     Tool#onMouseDown} event is fired.
         * @option options.up {Boolean) remove the item when the next {@link
         *     Tool#onMouseUp} event is fired.
         */
        removeOn(options: object): void

        /** 
         * Removes the item when the next {@link Tool#onMouseMove} event is fired.
         */
        removeOnMove(): void

        /** 
         * Removes the item when the next {@link Tool#onMouseDown} event is fired.
         */
        removeOnDown(): void

        /** 
         * Removes the item when the next {@link Tool#onMouseDrag} event is fired.
         */
        removeOnDrag(): void

        /** 
         * Removes the item when the next {@link Tool#onMouseUp} event is fired.
         */
        removeOnUp(): void

        /** 
         * Tween item between two states.
         * 
         * @option options.duration {Number} the duration of the tweening
         * @option [options.easing='linear'] {Function|String} an easing function or the type
         * of the easing: {@values 'linear' 'easeInQuad' 'easeOutQuad'
         * 'easeInOutQuad' 'easeInCubic' 'easeOutCubic' 'easeInOutCubic'
         * 'easeInQuart' 'easeOutQuart' 'easeInOutQuart' 'easeInQuint'
         * 'easeOutQuint' 'easeInOutQuint'}
         * @option [options.start=true] {Boolean} whether to start tweening automatically
         * 
         * @param from - the state at the start of the tweening
         * @param to - the state at the end of the tweening
         * @param options - the options or the duration
         */
        tween(from: object, to: object, options: object | number): Tween

        /** 
         * Tween item to a state.
         * 
         * @see Item#tween(from, to, options)
         * 
         * @param to - the state at the end of the tweening
         * @param options - the options or the duration
         */
        tween(to: object, options: object | number): Tween

        /** 
         * Tween item.
         * 
         * @see Item#tween(from, to, options)
         * 
         * @param options - the options or the duration
         */
        tween(options: object | number): Tween

        /** 
         * Tween item to a state.
         * 
         * @see Item#tween(to, options)
         * 
         * @param to - the state at the end of the tweening
         * @param options - the options or the duration
         */
        tweenTo(to: object, options: object | number): Tween

        /** 
         * Tween item from a state to its state before the tweening.
         * 
         * @see Item#tween(from, to, options)
         * 
         * @param from - the state at the start of the tweening
         * @param options - the options or the duration
         */
        tweenFrom(from: object, options: object | number): Tween

    }

    
    class Key  {
        /** 
         * The current state of the keyboard modifiers.
         * 
         * @option modifiers.shift {Boolean} {@true if the shift key is
         *     pressed}.
         * @option modifiers.control {Boolean} {@true if the control key is
         *     pressed}.
         * @option modifiers.alt {Boolean} {@true if the alt/option key is
         *     pressed}.
         * @option modifiers.meta {Boolean} {@true if the meta/windows/command
         *     key is pressed}.
         * @option modifiers.capsLock {Boolean} {@true if the caps-lock key is
         *     active}.
         * @option modifiers.space {Boolean} {@true if the space key is
         *     pressed}.
         * @option modifiers.option {Boolean} {@true if the alt/option key is
         *     pressed}. This is the same as `modifiers.alt`
         * @option modifiers.command {Boolean} {@true if the meta key is pressed
         *     on Mac, or the control key is pressed on Windows and Linux}.
         */
        static modifiers: any


        /** 
         * Checks whether the specified key is pressed.
         * 
         * @param key - any character or special key descriptor:
         *     {@values 'enter', 'space', 'shift', 'control', 'alt', 'meta',
         *     'caps-lock', 'left', 'up', 'right', 'down', 'escape', 'delete',
         *     ...}
         * 
         * @return true if the key is pressed
         */
        static isDown(key: string): boolean

    }

    /** 
     * The KeyEvent object is received by the {@link Tool}'s keyboard
     * handlers {@link Tool#onKeyDown}, {@link Tool#onKeyUp}. The KeyEvent object is
     * the only parameter passed to these functions and contains information about
     * the keyboard event.
     */
    class KeyEvent extends Event {
        /** 
         * The type of mouse event.
         */
        type: string

        /** 
         * The character representation of the key that caused this key event,
         * taking into account the current key-modifiers (e.g. shift, control,
         * caps-lock, etc.)
         */
        character: string

        /** 
         * The key that caused this key event, either as a lower-case character or
         * special key descriptor.
         */
        key: string


        /** 
         * @return a string representation of the key event
         */
        toString(): string

    }

    /** 
     * The Layer item represents a layer in a Paper.js project.
     * 
     * The layer which is currently active can be accessed through
     * {@link Project#activeLayer}.
     * An array of all layers in a project can be accessed through
     * {@link Project#layers}.
     */
    class Layer extends Group {

        /** 
         * Creates a new Layer item and places it at the end of the
         * {@link Project#layers} array. The newly created layer will be activated,
         * so all newly created items will be placed within it.
         * 
         * @param children - An array of items that will be added to the
         * newly created layer
         */
        constructor(children?: Item[])

        /** 
         * Creates a new Layer item and places it at the end of the
         * {@link Project#layers} array. The newly created layer will be activated,
         * so all newly created items will be placed within it.
         * 
         * @param object - an object containing the properties to be set on
         *     the layer
         */
        constructor(object: object)

        /** 
         * Activates the layer.
         */
        activate(): void

    }

    /** 
     * An affine transformation matrix performs a linear mapping from 2D
     *     coordinates to other 2D coordinates that preserves the "straightness" and
     *     "parallelness" of lines.
     * 
     * Such a coordinate transformation can be represented by a 3 row by 3
     * column matrix with an implied last row of `[ 0 0 1 ]`. This matrix
     * transforms source coordinates `(x, y)` into destination coordinates `(x',y')`
     * by considering them to be a column vector and multiplying the coordinate
     * vector by the matrix according to the following process:
     * 
     *     [ x ]   [ a  c  tx ] [ x ]   [ a * x + c * y + tx ]
     *     [ y ] = [ b  d  ty ] [ y ] = [ b * x + d * y + ty ]
     *     [ 1 ]   [ 0  0  1  ] [ 1 ]   [         1          ]
     * 
     * Note the locations of b and c.
     * 
     * This class is optimized for speed and minimizes calculations based on its
     * knowledge of the underlying matrix (as opposed to say simply performing
     * matrix multiplication).
     */
    class Matrix  {
        /** 
         * The value that affects the transformation along the x axis when scaling
         * or rotating, positioned at (0, 0) in the transformation matrix.
         */
        a: number

        /** 
         * The value that affects the transformation along the y axis when rotating
         * or skewing, positioned at (1, 0) in the transformation matrix.
         */
        b: number

        /** 
         * The value that affects the transformation along the x axis when rotating
         * or skewing, positioned at (0, 1) in the transformation matrix.
         */
        c: number

        /** 
         * The value that affects the transformation along the y axis when scaling
         * or rotating, positioned at (1, 1) in the transformation matrix.
         */
        d: number

        /** 
         * The distance by which to translate along the x axis, positioned at (2, 0)
         * in the transformation matrix.
         */
        tx: number

        /** 
         * The distance by which to translate along the y axis, positioned at (2, 1)
         * in the transformation matrix.
         */
        ty: number

        /** 
         * The matrix values as an array, in the same sequence as they are passed
         * to {@link #initialize}.
         */
        readonly values: number[]

        /** 
         * The translation of the matrix as a vector.
         */
        readonly translation: Point

        /** 
         * The scaling values of the matrix, if it can be decomposed.
         * 
         * @see #decompose()
         */
        readonly scaling: Point

        /** 
         * The rotation angle of the matrix, if it can be decomposed.
         * 
         * @see #decompose()
         */
        readonly rotation: number


        /** 
         * Creates a 2D affine transformation matrix that describes the identity
         * transformation.
         */
        constructor()

        /** 
         * Creates a 2D affine transformation matrix.
         * 
         * @param a - the a property of the transform
         * @param b - the b property of the transform
         * @param c - the c property of the transform
         * @param d - the d property of the transform
         * @param tx - the tx property of the transform
         * @param ty - the ty property of the transform
         */
        constructor(a: number, b: number, c: number, d: number, tx: number, ty: number)

        /** 
         * Creates a 2D affine transformation matrix.
         * 
         * @param values - the matrix values to initialize this matrix with
         */
        constructor(values: number[])

        /** 
         * Creates a 2D affine transformation matrix.
         * 
         * @param matrix - the matrix to copy the values from
         */
        constructor(matrix: Matrix)

        /** 
         * Sets the matrix to the passed values. Note that any sequence of
         * parameters that is supported by the various {@link Matrix} constructors
         * also work for calls of `set()`.
         */
        set(...values: any[]): Point

        /** 
         * @return a copy of this transform
         */
        clone(): Matrix

        /** 
         * Checks whether the two matrices describe the same transformation.
         * 
         * @param matrix - the matrix to compare this matrix to
         * 
         * @return true if the matrices are equal
         */
        equals(matrix: Matrix): boolean

        /** 
         * @return a string representation of this transform
         */
        toString(): string

        /** 
         * Resets the matrix by setting its values to the ones of the identity
         * matrix that results in no transformation.
         */
        reset(): void

        /** 
         * Attempts to apply the matrix to the content of item that it belongs to,
         * meaning its transformation is baked into the item's content or children.
         * 
         * @param recursively - controls whether to apply
         *     transformations recursively on children
         * 
         * @return true if the matrix was applied
         */
        apply(recursively?: boolean): boolean

        /** 
         * Concatenates this matrix with a translate transformation.
         * 
         * @param point - the vector to translate by
         * 
         * @return this affine transform
         */
        translate(point: PointLike): Matrix

        /** 
         * Concatenates this matrix with a translate transformation.
         * 
         * @param dx - the distance to translate in the x direction
         * @param dy - the distance to translate in the y direction
         * 
         * @return this affine transform
         */
        translate(dx: number, dy: number): Matrix

        /** 
         * Concatenates this matrix with a scaling transformation.
         * 
         * @param scale - the scaling factor
         * @param center - the center for the scaling transformation
         * 
         * @return this affine transform
         */
        scale(scale: number, center?: PointLike): Matrix

        /** 
         * Concatenates this matrix with a scaling transformation.
         * 
         * @param hor - the horizontal scaling factor
         * @param ver - the vertical scaling factor
         * @param center - the center for the scaling transformation
         * 
         * @return this affine transform
         */
        scale(hor: number, ver: number, center?: PointLike): Matrix

        /** 
         * Concatenates this matrix with a rotation transformation around an
         * anchor point.
         * 
         * @param angle - the angle of rotation measured in degrees
         * @param center - the anchor point to rotate around
         * 
         * @return this affine transform
         */
        rotate(angle: number, center: PointLike): Matrix

        /** 
         * Concatenates this matrix with a rotation transformation around an
         * anchor point.
         * 
         * @param angle - the angle of rotation measured in degrees
         * @param x - the x coordinate of the anchor point
         * @param y - the y coordinate of the anchor point
         * 
         * @return this affine transform
         */
        rotate(angle: number, x: number, y: number): Matrix

        /** 
         * Concatenates this matrix with a shear transformation.
         * 
         * @param shear - the shear factor in x and y direction
         * @param center - the center for the shear transformation
         * 
         * @return this affine transform
         */
        shear(shear: PointLike, center?: PointLike): Matrix

        /** 
         * Concatenates this matrix with a shear transformation.
         * 
         * @param hor - the horizontal shear factor
         * @param ver - the vertical shear factor
         * @param center - the center for the shear transformation
         * 
         * @return this affine transform
         */
        shear(hor: number, ver: number, center?: PointLike): Matrix

        /** 
         * Concatenates this matrix with a skew transformation.
         * 
         * @param skew - the skew angles in x and y direction in degrees
         * @param center - the center for the skew transformation
         * 
         * @return this affine transform
         */
        skew(skew: PointLike, center?: PointLike): Matrix

        /** 
         * Concatenates this matrix with a skew transformation.
         * 
         * @param hor - the horizontal skew angle in degrees
         * @param ver - the vertical skew angle in degrees
         * @param center - the center for the skew transformation
         * 
         * @return this affine transform
         */
        skew(hor: number, ver: number, center?: PointLike): Matrix

        /** 
         * Appends the specified matrix to this matrix. This is the equivalent of
         * multiplying `(this matrix) * (specified matrix)`.
         * 
         * @param matrix - the matrix to append
         * 
         * @return this matrix, modified
         */
        append(matrix: Matrix): Matrix

        /** 
         * Prepends the specified matrix to this matrix. This is the equivalent of
         * multiplying `(specified matrix) * (this matrix)`.
         * 
         * @param matrix - the matrix to prepend
         * 
         * @return this matrix, modified
         */
        prepend(matrix: Matrix): Matrix

        /** 
         * Returns a new matrix as the result of appending the specified matrix to
         * this matrix. This is the equivalent of multiplying
         * `(this matrix) * (specified matrix)`.
         * 
         * @param matrix - the matrix to append
         * 
         * @return the newly created matrix
         */
        appended(matrix: Matrix): Matrix

        /** 
         * Returns a new matrix as the result of prepending the specified matrix
         * to this matrix. This is the equivalent of multiplying
         * `(specified matrix) * (this matrix)`.
         * 
         * @param matrix - the matrix to prepend
         * 
         * @return the newly created matrix
         */
        prepended(matrix: Matrix): Matrix

        /** 
         * Inverts the matrix, causing it to perform the opposite transformation.
         * If the matrix is not invertible (in which case {@link #isSingular}
         * returns true), `null` is returned.
         * 
         * @return this matrix, or `null`, if the matrix is singular.
         */
        invert(): Matrix

        /** 
         * Creates a new matrix that is the inversion of this matrix, causing it to
         * perform the opposite transformation. If the matrix is not invertible (in
         * which case {@link #isSingular} returns true), `null` is returned.
         * 
         * @return this matrix, or `null`, if the matrix is singular.
         */
        inverted(): Matrix

        /** 
         * @return whether this matrix is the identity matrix
         */
        isIdentity(): boolean

        /** 
         * Checks whether the matrix is invertible. A matrix is not invertible if
         * the determinant is 0 or any value is infinite or NaN.
         * 
         * @return whether the matrix is invertible
         */
        isInvertible(): boolean

        /** 
         * Checks whether the matrix is singular or not. Singular matrices cannot be
         * inverted.
         * 
         * @return whether the matrix is singular
         */
        isSingular(): boolean

        /** 
         * Transforms a point and returns the result.
         * 
         * @param point - the point to be transformed
         * 
         * @return the transformed point
         */
        transform(point: PointLike): Point

        /** 
         * Transforms an array of coordinates by this matrix and stores the results
         * into the destination array, which is also returned.
         * 
         * @param src - the array containing the source points
         * as x, y value pairs
         * @param dst - the array into which to store the transformed
         * point pairs
         * @param count - the number of points to transform
         * 
         * @return the dst array, containing the transformed coordinates
         */
        transform(src: number[], dst: number[], count: number): number[]

        /** 
         * Inverse transforms a point and returns the result.
         * 
         * @param point - the point to be transformed
         */
        inverseTransform(point: PointLike): Point

        /** 
         * Decomposes the affine transformation described by this matrix into
         * `scaling`, `rotation` and `skewing`, and returns an object with
         * these properties.
         * 
         * @return the decomposed matrix
         */
        decompose(): object

        /** 
         * Applies this matrix to the specified Canvas Context.
         */
        applyToContext(ctx: CanvasRenderingContext2D): void

    }

    /** 
     * The MouseEvent object is received by the {@link Item}'s mouse event
     * handlers {@link Item#onMouseDown}, {@link Item#onMouseDrag},
     * {@link Item#onMouseMove}, {@link Item#onMouseUp}, {@link Item#onClick},
     * {@link Item#onDoubleClick}, {@link Item#onMouseEnter} and
     * {@link Item#onMouseLeave}. The MouseEvent object is the only parameter passed
     * to these functions and contains information about the mouse event.
     */
    class MouseEvent extends Event {
        /** 
         * The type of mouse event.
         */
        type: string

        /** 
         * The position of the mouse in project coordinates when the event was
         * fired.
         */
        point: Point

        /** 
         * The item that dispatched the event. It is different from
         * {@link #currentTarget} when the event handler is called during
         * the bubbling phase of the event.
         */
        target: Item

        /** 
         * The current target for the event, as the event traverses the scene graph.
         * It always refers to the element the event handler has been attached to as
         * opposed to {@link #target} which identifies the element on
         * which the event occurred.
         */
        currentTarget: Item

        
        delta: Point


        /** 
         * @return a string representation of the mouse event
         */
        toString(): string

    }

    /** 
     * The `PaperScope` class represents the scope associated with a Paper
     *     context. When working with PaperScript, these scopes are automatically
     *     created for us, and through clever scoping the properties and methods of
     *     the active scope seem to become part of the global scope.
     * 
     * When working with normal JavaScript code, `PaperScope` objects need to be
     * manually created and handled.
     * 
     * Paper classes can only be accessed through `PaperScope` objects. Thus in
     * PaperScript they are global, while in JavaScript, they are available on the
     * global {@link paper} object. For JavaScript you can use {@link
     * PaperScope#install(scope) } to install the Paper classes and objects on the
     * global scope. Note that when working with more than one scope, this still
     * works for classes, but not for objects like {@link PaperScope#project}, since
     * they are not updated in the injected scope if scopes are switched.
     * 
     * The global {@link paper} object is simply a reference to the currently active
     * `PaperScope`.
     */
    class PaperScope  {
        /** 
         * The version of Paper.js, as a string.
         */
        readonly version: string

        /** 
         * Gives access to paper's configurable settings.
         * 
         * @option [settings.insertItems=true] {Boolean} controls whether newly
         *     created items are automatically inserted into the scene graph, by
         *     adding them to {@link Project#activeLayer}
         * @option [settings.applyMatrix=true] {Boolean} controls what value newly
         *     created items have their {@link Item#applyMatrix} property set to
         *     (Note that not all items can set this to `false`)
         * @option [settings.handleSize=4] {Number} the size of the curve handles
         *     when drawing selections
         * @option [settings.hitTolerance=0] {Number} the default tolerance for hit-
         *     tests, when no value is specified
         */
        settings: any

        /** 
         * The currently active project.
         */
        project: Project

        /** 
         * The list of all open projects within the current Paper.js context.
         */
        projects: Project[]

        /** 
         * The reference to the active project's view.
         */
        readonly view: View

        /** 
         * The reference to the active tool.
         */
        tool: Tool

        /** 
         * The list of available tools.
         */
        tools: Tool[]

        Color: typeof Color
        CompoundPath: typeof CompoundPath
        Curve: typeof Curve
        CurveLocation: typeof CurveLocation
        Event: typeof Event
        Gradient: typeof Gradient
        GradientStop: typeof GradientStop
        Group: typeof Group
        HitResult: typeof HitResult
        Item: typeof Item
        Key: typeof Key
        KeyEvent: typeof KeyEvent
        Layer: typeof Layer
        Matrix: typeof Matrix
        MouseEvent: typeof MouseEvent
        PaperScope: typeof PaperScope
        PaperScript: typeof PaperScript
        Path: typeof Path
        PathItem: typeof PathItem
        Point: typeof Point
        PointText: typeof PointText
        Project: typeof Project
        Raster: typeof Raster
        Rectangle: typeof Rectangle
        Segment: typeof Segment
        Shape: typeof Shape
        Size: typeof Size
        Style: typeof Style
        SymbolDefinition: typeof SymbolDefinition
        SymbolItem: typeof SymbolItem
        TextItem: typeof TextItem
        Tool: typeof Tool
        ToolEvent: typeof ToolEvent
        Tween: typeof Tween
        View: typeof View

        /** 
         * Creates a PaperScope object.
         */
        constructor()

        /** 
         * Compiles the PaperScript code into a compiled function and executes it.
         * The compiled function receives all properties of this {@link PaperScope}
         * as arguments, to emulate a global scope with unaffected performance. It
         * also installs global view and tool handlers automatically on the
         * respective objects.
         * 
         * @option options.url {String} the url of the source, for source-map
         *     debugging
         * @option options.source {String} the source to be used for the source-
         *     mapping, in case the code that's passed in has already been mingled.
         * 
         * @param code - the PaperScript code
         * @param options - the compilation options
         */
        execute(code: string, options?: object): void

        /** 
         * Injects the paper scope into any other given scope. Can be used for
         * example to inject the currently active PaperScope into the window's
         * global scope, to emulate PaperScript-style globally accessible Paper
         * classes and objects.
         * 
         * <b>Please note:</b> Using this method may override native constructors
         * (e.g. Path). This may cause problems when using Paper.js in conjunction
         * with other libraries that rely on these constructors. Keep the library
         * scoped if you encounter issues caused by this.
         */
        install(scope: any): void

        /** 
         * Sets up an empty project for us. If a canvas is provided, it also creates
         * a {@link View} for it, both linked to this scope.
         * 
         * @param element - the HTML canvas element
         * this scope should be associated with, or an ID string by which to find
         * the element, or the size of the canvas to be created for usage in a web
         * worker.
         */
        setup(element: HTMLCanvasElement | string | SizeLike): void

        /** 
         * Activates this PaperScope, so all newly created items will be placed
         * in its active project.
         */
        activate(): void

        /** 
         * Retrieves a PaperScope object with the given scope id.
         */
        static get(id: any): PaperScope

    }

    
    class PaperScript  {

        /** 
         * Compiles PaperScript code into JavaScript code.
         * 
         * @option options.url {String} the url of the source, for source-map
         *     generation
         * @option options.source {String} the source to be used for the source-
         *     mapping, in case the code that's passed in has already been mingled.
         * 
         * @param code - the PaperScript code
         * @param options - the compilation options
         * 
         * @return an object holding the compiled PaperScript translated
         *     into JavaScript code along with source-maps and other information.
         */
        static compile(code: string, options?: object): object

        /** 
         * Compiles the PaperScript code into a compiled function and executes it.
         * The compiled function receives all properties of the passed {@link
         * PaperScope} as arguments, to emulate a global scope with unaffected
         * performance. It also installs global view and tool handlers automatically
         * on the respective objects.
         * 
         * @option options.url {String} the url of the source, for source-map
         *     generation
         * @option options.source {String} the source to be used for the source-
         *     mapping, in case the code that's passed in has already been mingled.
         * 
         * @param code - the PaperScript code
         * @param scope - the scope for which the code is executed
         * @param options - the compilation options
         * 
         * @return the exports defined in the executed code
         */
        static execute(code: string, scope: PaperScope, options?: object): object

        /** 
         * Loads, compiles and executes PaperScript code in the HTML document. Note
         * that this method is executed automatically for all scripts in the
         * document through a window load event. You can optionally call it earlier
         * (e.g. from a DOM ready event), or you can mark scripts to be ignored by
         * setting the attribute `ignore="true"` or `data-paper-ignore="true"`, and
         * call the `PaperScript.load(script)` method for each script separately
         * when needed.
         * 
         * @param script - the script to load. If none is
         *     provided, all scripts of the HTML document are iterated over and
         *     loaded
         * 
         * @return the scope produced for the passed `script`, or
         *     `undefined` of multiple scripts area loaded
         */
        static load(script?: HTMLScriptElement): PaperScope

    }

    /** 
     * The path item represents a path in a Paper.js project.
     */
    class Path extends PathItem {
        /** 
         * The segments contained within the path.
         */
        segments: Segment[]

        /** 
         * The first Segment contained within the path.
         */
        readonly firstSegment: Segment

        /** 
         * The last Segment contained within the path.
         */
        readonly lastSegment: Segment

        /** 
         * The curves contained within the path.
         */
        readonly curves: Curve[]

        /** 
         * The first Curve contained within the path.
         */
        readonly firstCurve: Curve

        /** 
         * The last Curve contained within the path.
         */
        readonly lastCurve: Curve

        /** 
         * Specifies whether the path is closed. If it is closed, Paper.js connects
         * the first and last segments.
         */
        closed: boolean

        /** 
         * The approximate length of the path.
         */
        readonly length: number

        /** 
         * The area that the path's geometry is covering. Self-intersecting paths
         * can contain sub-areas that cancel each other out.
         */
        readonly area: number

        /** 
         * Specifies whether the path and all its segments are selected. Cannot be
         * `true` on an empty path.
         */
        fullySelected: boolean


        /** 
         * Creates a new path item and places it at the top of the active layer.
         * 
         * @param segments - An array of segments (or points to be
         * converted to segments) that will be added to the path
         */
        constructor(segments?: Segment[])

        /** 
         * Creates a new path item from SVG path-data and places it at the top of
         * the active layer.
         * 
         * @param pathData - the SVG path-data that describes the geometry
         * of this path
         */
        constructor(pathData: string)

        /** 
         * Creates a new path item from an object description and places it at the
         * top of the active layer.
         * 
         * @param object - an object containing properties to be set on the
         *     path
         */
        constructor(object: object)

        /** 
         * Adds one or more segments to the end of the {@link #segments} array of
         * this path.
         * 
         * @param segment - the segment or point to be
         * added.
         * 
         * @return the added segment(s). This is not necessarily
         * the same object, e.g. if the segment to be added already belongs to
         * another path.
         */
        add(...segment: (Segment | PointLike | number[])[]): Segment | Segment[]

        /** 
         * Inserts one or more segments at a given index in the list of this path's
         * segments.
         * 
         * @param index - the index at which to insert the segment
         * @param segment - the segment or point to be inserted.
         * 
         * @return the added segment. This is not necessarily the same
         * object, e.g. if the segment to be added already belongs to another path
         */
        insert(index: number, segment: Segment | PointLike): Segment

        /** 
         * Adds an array of segments (or types that can be converted to segments)
         * to the end of the {@link #segments} array.
         * 
         * @return an array of the added segments. These segments are
         * not necessarily the same objects, e.g. if the segment to be added already
         * belongs to another path
         */
        addSegments(segments: Segment[]): Segment[]

        /** 
         * Inserts an array of segments at a given index in the path's
         * {@link #segments} array.
         * 
         * @param index - the index at which to insert the segments
         * @param segments - the segments to be inserted
         * 
         * @return an array of the added segments. These segments are
         * not necessarily the same objects, e.g. if the segment to be added already
         * belongs to another path
         */
        insertSegments(index: number, segments: Segment[]): Segment[]

        /** 
         * Removes the segment at the specified index of the path's
         * {@link #segments} array.
         * 
         * @param index - the index of the segment to be removed
         * 
         * @return the removed segment
         */
        removeSegment(index: number): Segment

        /** 
         * Removes all segments from the path's {@link #segments} array.
         * 
         * @return an array containing the removed segments
         */
        removeSegments(): Segment[]

        /** 
         * Removes the segments from the specified `from` index to the `to` index
         * from the path's {@link #segments} array.
         * 
         * @param from - the beginning index, inclusive
         * @param to - the ending index, exclusive
         * 
         * @return an array containing the removed segments
         */
        removeSegments(from: number, to?: number): Segment[]

        /** 
         * Checks if any of the curves in the path have curve handles set.
         * 
         * @see Segment#hasHandles()
         * @see Curve#hasHandles()
         * 
         * @return true if the path has curve handles set
         */
        hasHandles(): boolean

        /** 
         * Clears the path's handles by setting their coordinates to zero,
         * turning the path into a polygon (or a polyline if it isn't closed).
         */
        clearHandles(): void

        /** 
         * Divides the path on the curve at the given offset or location into two
         * curves, by inserting a new segment at the given location.
         * 
         * @see Curve#divideAt(location)
         * 
         * @param location - the offset or location on the
         *     path at which to divide the existing curve by inserting a new segment
         * 
         * @return the newly inserted segment if the location is valid,
         *     `null` otherwise
         */
        divideAt(location: number | CurveLocation): Segment

        /** 
         * Splits the path at the given offset or location. After splitting, the
         * path will be open. If the path was open already, splitting will result in
         * two paths.
         * 
         * @param location - the offset or location at which to
         *     split the path
         * 
         * @return the newly created path after splitting, if any
         */
        splitAt(location: number | CurveLocation): Path

        /** 
         * Joins the path with the other specified path, which will be removed in
         * the process. They can be joined if the first or last segments of either
         * path lie in the same location. Locations are optionally compare with a
         * provide `tolerance` value.
         * 
         * If `null` or `this` is passed as the other path, the path will be joined
         * with itself if the first and last segment are in the same location.
         * 
         * @param path - the path to join this path with; `null` or `this` to
         *     join the path with itself
         * @param tolerance - the tolerance with which to decide if two
         *     segments are to be considered the same location when joining
         */
        join(path: Path, tolerance?: number): void

        /** 
         * Reduces the path by removing curves that have a length of 0,
         * and unnecessary segments between two collinear flat curves.
         * 
         * @return the reduced path
         */
        reduce(options: any): Path

        /** 
         * Attempts to create a new shape item with same geometry as this path item,
         * and inherits all settings from it, similar to {@link Item#clone}.
         * 
         * @see Shape#toPath(insert)
         * 
         * @param insert - specifies whether the new shape should be
         * inserted into the scene graph. When set to `true`, it is inserted above
         * the path item
         * 
         * @return the newly created shape item with the same geometry as
         * this path item if it can be matched, `null` otherwise
         */
        toShape(insert?: boolean): Shape

        /** 
         * Returns the curve location of the specified point if it lies on the
         * path, `null` otherwise.
         * 
         * @param point - the point on the path
         * 
         * @return the curve location of the specified point
         */
        getLocationOf(point: PointLike): CurveLocation

        /** 
         * Returns the length of the path from its beginning up to up to the
         * specified point if it lies on the path, `null` otherwise.
         * 
         * @param point - the point on the path
         * 
         * @return the length of the path up to the specified point
         */
        getOffsetOf(point: PointLike): number

        /** 
         * Returns the curve location of the specified offset on the path.
         * 
         * @param offset - the offset on the path, where `0` is at
         * the beginning of the path and {@link Path#length} at the end
         * 
         * @return the curve location at the specified offset
         */
        getLocationAt(offset: number): CurveLocation

        /** 
         * Calculates the point on the path at the given offset.
         * 
         * @param offset - the offset on the path, where `0` is at
         * the beginning of the path and {@link Path#length} at the end
         * 
         * @return the point at the given offset
         */
        getPointAt(offset: number): Point

        /** 
         * Calculates the normalized tangent vector of the path at the given offset.
         * 
         * @param offset - the offset on the path, where `0` is at
         * the beginning of the path and {@link Path#length} at the end
         * 
         * @return the normalized tangent vector at the given offset
         */
        getTangentAt(offset: number): Point

        /** 
         * Calculates the normal vector of the path at the given offset.
         * 
         * @param offset - the offset on the path, where `0` is at
         * the beginning of the path and {@link Path#length} at the end
         * 
         * @return the normal vector at the given offset
         */
        getNormalAt(offset: number): Point

        /** 
         * Calculates the weighted tangent vector of the path at the given offset.
         * 
         * @param offset - the offset on the path, where `0` is at
         * the beginning of the path and {@link Path#length} at the end
         * 
         * @return the weighted tangent vector at the given offset
         */
        getWeightedTangentAt(offset: number): Point

        /** 
         * Calculates the weighted normal vector of the path at the given offset.
         * 
         * @param offset - the offset on the path, where `0` is at
         * the beginning of the path and {@link Path#length} at the end
         * 
         * @return the weighted normal vector at the given offset
         */
        getWeightedNormalAt(offset: number): Point

        /** 
         * Calculates the curvature of the path at the given offset. Curvatures
         * indicate how sharply a path changes direction. A straight line has zero
         * curvature, where as a circle has a constant curvature. The path's radius
         * at the given offset is the reciprocal value of its curvature.
         * 
         * @param offset - the offset on the path, where `0` is at
         * the beginning of the path and {@link Path#length} at the end
         * 
         * @return the normal vector at the given offset
         */
        getCurvatureAt(offset: number): number

        /** 
         * Calculates path offsets where the path is tangential to the provided
         * tangent. Note that tangents at the start or end are included. Tangents at
         * segment points are returned even if only one of their handles is
         * collinear with the provided tangent.
         * 
         * @param tangent - the tangent to which the path must be tangential
         * 
         * @return path offsets where the path is tangential to the
         * provided tangent
         */
        getOffsetsWithTangent(tangent: PointLike): number[]

    }
    namespace Path {

        class Line extends Path {
            /** 
             * Creates a linear path item from two points describing a line.
             * 
             * @param from - the line's starting point
             * @param to - the line's ending point
             */
            constructor(from: PointLike, to: PointLike)

            /** 
             * Creates a linear path item from the properties described by an object
             * literal.
             * 
             * @param object - an object containing properties describing the
             *     path's attributes
             */
            constructor(object: object)

        }

        class Circle extends Path {
            /** 
             * Creates a circular path item.
             * 
             * @param center - the center point of the circle
             * @param radius - the radius of the circle
             */
            constructor(center: PointLike, radius: number)

            /** 
             * Creates a circular path item from the properties described by an
             * object literal.
             * 
             * @param object - an object containing properties describing the
             *     path's attributes
             */
            constructor(object: object)

        }

        class Rectangle extends Path {
            /** 
             * Creates a rectangular path item, with optionally rounded corners.
             * 
             * @param rectangle - the rectangle object describing the
             * geometry of the rectangular path to be created
             * @param radius - the size of the rounded corners
             */
            constructor(rectangle: RectangleLike, radius?: SizeLike)

            /** 
             * Creates a rectangular path item from a point and a size object.
             * 
             * @param point - the rectangle's top-left corner.
             * @param size - the rectangle's size.
             */
            constructor(point: PointLike, size: SizeLike)

            /** 
             * Creates a rectangular path item from the passed points. These do not
             * necessarily need to be the top left and bottom right corners, the
             * constructor figures out how to fit a rectangle between them.
             * 
             * @param from - the first point defining the rectangle
             * @param to - the second point defining the rectangle
             */
            constructor(from: PointLike, to: PointLike)

            /** 
             * Creates a rectangular path item from the properties described by an
             * object literal.
             * 
             * @param object - an object containing properties describing the
             *     path's attributes
             */
            constructor(object: object)

        }

        class Ellipse extends Path {
            /** 
             * Creates an elliptical path item.
             * 
             * @param rectangle - the rectangle circumscribing the ellipse
             */
            constructor(rectangle: RectangleLike)

            /** 
             * Creates an elliptical path item from the properties described by an
             * object literal.
             * 
             * @param object - an object containing properties describing the
             *     path's attributes
             */
            constructor(object: object)

        }

        class Arc extends Path {
            /** 
             * Creates a circular arc path item.
             * 
             * @param from - the starting point of the circular arc
             * @param through - the point the arc passes through
             * @param to - the end point of the arc
             */
            constructor(from: PointLike, through: PointLike, to: PointLike)

            /** 
             * Creates an circular arc path item from the properties described by an
             * object literal.
             * 
             * @param object - an object containing properties describing the
             *     path's attributes
             */
            constructor(object: object)

        }

        class RegularPolygon extends Path {
            /** 
             * Creates a regular polygon shaped path item.
             * 
             * @param center - the center point of the polygon
             * @param sides - the number of sides of the polygon
             * @param radius - the radius of the polygon
             */
            constructor(center: PointLike, sides: number, radius: number)

            /** 
             * Creates a regular polygon shaped path item from the properties
             * described by an object literal.
             * 
             * @param object - an object containing properties describing the
             *     path's attributes
             */
            constructor(object: object)

        }

        class Star extends Path {
            /** 
             * Creates a star shaped path item.
             * 
             * The largest of `radius1` and `radius2` will be the outer radius of
             * the star. The smallest of radius1 and radius2 will be the inner
             * radius.
             * 
             * @param center - the center point of the star
             * @param points - the number of points of the star
             */
            constructor(center: PointLike, points: number, radius1: number, radius2: number)

            /** 
             * Creates a star shaped path item from the properties described by an
             * object literal.
             * 
             * @param object - an object containing properties describing the
             *     path's attributes
             */
            constructor(object: object)

        }
    }

    /** 
     * The PathItem class is the base for any items that describe paths and
     *     offer standardised methods for drawing and path manipulation, such as
     *     {@link Path} and {@link CompoundPath}.
     */
    class PathItem extends Item {
        /** 
         * Returns a point that is guaranteed to be inside the path.
         */
        readonly interiorPoint: Point

        /** 
         * Specifies whether the path as a whole is oriented clock-wise, by looking
         * at the path's area.
         * Note that self-intersecting paths and sub-paths of different orientation
         * can result in areas that cancel each other out.
         * 
         * @see Path#area
         * @see CompoundPath#area
         */
        clockwise: boolean

        /** 
         * The path's geometry, formatted as SVG style path data.
         */
        pathData: string


        /** 
         * Unites the geometry of the specified path with this path's geometry
         * and returns the result as a new path item.
         * 
         * @option [options.insert=true] {Boolean} whether the resulting item
         *     should be inserted back into the scene graph, above both paths
         *     involved in the operation
         * 
         * @param path - the path to unite with
         * @param options - the boolean operation options
         * 
         * @return the resulting path item
         */
        unite(path: PathItem, options?: object): PathItem

        /** 
         * Intersects the geometry of the specified path with this path's
         * geometry and returns the result as a new path item.
         * 
         * @option [options.insert=true] {Boolean} whether the resulting item
         *     should be inserted back into the scene graph, above both paths
         *     involved in the operation
         * @option [options.trace=true] {Boolean} whether the tracing method is
         *     used, treating both paths as areas when determining which parts
         *     of the paths are to be kept in the result, or whether the first
         *     path is only to be split at intersections, keeping the parts of
         *     the curves that intersect with the area of the second path.
         * 
         * @param path - the path to intersect with
         * @param options - the boolean operation options
         * 
         * @return the resulting path item
         */
        intersect(path: PathItem, options?: object): PathItem

        /** 
         * Subtracts the geometry of the specified path from this path's
         * geometry and returns the result as a new path item.
         * 
         * @option [options.insert=true] {Boolean} whether the resulting item
         *     should be inserted back into the scene graph, above both paths
         *     involved in the operation
         * @option [options.trace=true] {Boolean} whether the tracing method is
         *     used, treating both paths as areas when determining which parts
         *     of the paths are to be kept in the result, or whether the first
         *     path is only to be split at intersections, removing the parts of
         *     the curves that intersect with the area of the second path.
         * 
         * @param path - the path to subtract
         * @param options - the boolean operation options
         * 
         * @return the resulting path item
         */
        subtract(path: PathItem, options?: object): PathItem

        /** 
         * Excludes the intersection of the geometry of the specified path with
         * this path's geometry and returns the result as a new path item.
         * 
         * @option [options.insert=true] {Boolean} whether the resulting item
         *     should be inserted back into the scene graph, above both paths
         *     involved in the operation
         * 
         * @param path - the path to exclude the intersection of
         * @param options - the boolean operation options
         * 
         * @return the resulting path item
         */
        exclude(path: PathItem, options?: object): PathItem

        /** 
         * Splits the geometry of this path along the geometry of the specified
         * path returns the result as a new group item. This is equivalent to
         * calling {@link #subtract} and {@link #intersect} and
         * putting the results into a new group.
         * 
         * @option [options.insert=true] {Boolean} whether the resulting item
         *     should be inserted back into the scene graph, above both paths
         *     involved in the operation
         * @option [options.trace=true] {Boolean} whether the tracing method is
         *     used, treating both paths as areas when determining which parts
         *     of the paths are to be kept in the result, or whether the first
         *     path is only to be split at intersections.
         * 
         * @param path - the path to divide by
         * @param options - the boolean operation options
         * 
         * @return the resulting path item
         */
        divide(path: PathItem, options?: object): PathItem

        /** 
         * Fixes the orientation of the sub-paths of a compound-path, assuming
         * that non of its sub-paths intersect, by reorienting them so that they
         * are of different winding direction than their containing paths,
         * except for disjoint sub-paths, i.e. islands, which are oriented so
         * that they have the same winding direction as the the biggest path.
         * 
         * @param nonZero - controls if the non-zero fill-rule
         *     is to be applied, by counting the winding of each nested path and
         *     discarding sub-paths that do not contribute to the final result
         * @param clockwise - if provided, the orientation of the root
         *     paths will be set to the orientation specified by `clockwise`,
         *     otherwise the orientation of the largest root child is used.
         * 
         * @return a reference to the item itself, reoriented
         */
        reorient(nonZero?: boolean, clockwise?: boolean): PathItem

        /** 
         * Creates a path item from the given SVG path-data, determining if the
         * data describes a plain path or a compound-path with multiple
         * sub-paths.
         * 
         * @param pathData - the SVG path-data to parse
         * 
         * @return the newly created path item
         */
        static create(pathData: string): Path | CompoundPath

        /** 
         * Creates a path item from the given segments array, determining if the
         * array describes a plain path or a compound-path with multiple
         * sub-paths.
         * 
         * @param segments - the segments array to parse
         * 
         * @return the newly created path item
         */
        static create(segments: number[][]): Path | CompoundPath

        /** 
         * Creates a path item from the given object, determining if the
         * contained information describes a plain path or a compound-path with
         * multiple sub-paths.
         * 
         * @param object - an object containing the properties describing
         *     the item to be created
         * 
         * @return the newly created path item
         */
        static create(object: object): Path | CompoundPath

        /** 
         * Returns all intersections between two {@link PathItem} items as an array
         * of {@link CurveLocation} objects. {@link CompoundPath} items are also
         * supported.
         * 
         * @see #getCrossings(path)
         * 
         * @param path - the other item to find the intersections with
         * @param include - a callback function that can be used to
         *     filter out undesired locations right while they are collected. When
         *     defined, it shall return {@true to include a location}.
         * 
         * @return the locations of all intersection between the
         *     paths
         */
        getIntersections(path: PathItem, include?: Function): CurveLocation[]

        /** 
         * Returns all crossings between two {@link PathItem} items as an array of
         * {@link CurveLocation} objects. {@link CompoundPath} items are also
         * supported. Crossings are intersections where the paths actually are
         * crossing each other, as opposed to simply touching.
         * 
         * @see #getIntersections(path)
         * 
         * @param path - the other item to find the crossings with
         * 
         * @return the locations of all crossings between the
         *     paths
         */
        getCrossings(path: PathItem): CurveLocation[]

        /** 
         * Returns the nearest location on the path item to the specified point.
         * 
         * @param point - the point for which we search the nearest location
         * 
         * @return the location on the path that's the closest to
         * the specified point
         */
        getNearestLocation(point: PointLike): CurveLocation

        /** 
         * Returns the nearest point on the path item to the specified point.
         * 
         * @param point - the point for which we search the nearest point
         * 
         * @return the point on the path that's the closest to the specified
         * point
         */
        getNearestPoint(point: PointLike): Point

        /** 
         * Reverses the orientation of the path item. When called on
         * {@link CompoundPath} items, each of the nested paths is reversed. On
         * {@link Path} items, the sequence of {@link Path#segments} is reversed.
         */
        reverse(): void

        /** 
         * Flattens the curves in path items to a sequence of straight lines, by
         * subdividing them enough times until the specified maximum error is met.
         * 
         * @param flatness - the maximum error between the flattened
         *     lines and the original curves
         */
        flatten(flatness?: number): void

        /** 
         * Smooths the path item without changing the amount of segments in the path
         * or moving the segments' locations, by smoothing and adjusting the angle
         * and length of the segments' handles based on the position and distance of
         * neighboring segments.
         * 
         * Smoothing works both for open paths and closed paths, and can be applied
         * to the full path, as well as a sub-range of it. If a range is defined
         * using the `options.from` and `options.to` properties, only the curve
         * handles inside that range are touched. If one or both limits of the range
         * are specified in negative indices, the indices are wrapped around the end
         * of the curve. That way, a smoothing range in a close path can even wrap
         * around the connection between the last and the first segment.
         * 
         * Four different smoothing methods are available:
         * 
         * - `'continuous'` smooths the path item by adjusting its curve handles so
         *     that the first and second derivatives of all involved curves are
         *     continuous across their boundaries.
         * 
         *     This method tends to result in the smoothest results, but does not
         *     allow for further parametrization of the handles.
         * 
         * - `'asymmetric'` is based on the same principle as `'continuous'` but
         *     uses different factors so that the result is asymmetric. This used to
         *     the only method available until v0.10.0, and is currently still the
         *     default when no method is specified, for reasons of backward
         *     compatibility. It will eventually be removed.
         * 
         * - `'catmull-rom'` uses the Catmull-Rom spline to smooth the segment.
         * 
         *     The optionally passed factor controls the knot parametrization of the
         *     algorithm:
         * 
         *     - `0.0`: the standard, uniform Catmull-Rom spline
         *     - `0.5`: the centripetal Catmull-Rom spline, guaranteeing no
         *         self-intersections
         *     - `1.0`: the chordal Catmull-Rom spline
         * 
         * - `'geometric'` use a simple heuristic and empiric geometric method to
         *     smooth the segment's handles. The handles were weighted, meaning that
         *     big differences in distances between the segments will lead to
         *     probably undesired results.
         * 
         *     The optionally passed factor defines the tension parameter (`0...1`),
         *     controlling the amount of smoothing as a factor by which to scale
         *     each handle.
         * 
         * @see Segment#smooth([options])
         * 
         * @option [options.type='asymmetric'] {String} the type of smoothing
         *     method: {@values 'continuous', 'asymmetric', 'catmull-rom',
         *     'geometric'}
         * @option options.factor {Number} the factor parameterizing the smoothing
         *     method — default: `0.5` for `'catmull-rom'`, `0.4` for `'geometric'`
         * @option options.from {Number|Segment|Curve} the segment or curve at which
         *     to start smoothing, if not the full path shall be smoothed
         *     (inclusive). This can either be a segment index, or a segment or
         *     curve object that is part of the path. If the passed number is
         *     negative, the index is wrapped around the end of the path.
         * @option options.to {Number|Segment|Curve} the segment or curve to which
         *     the handles of the path shall be processed (inclusive). This can
         *     either be a segment index, or a segment or curve object that is part
         *     of the path. If the passed number is negative, the index is wrapped
         *     around the end of the path.
         * 
         * @param options - the smoothing options
         */
        smooth(options?: object): void

        /** 
         * Fits a sequence of as few curves as possible through the path's anchor
         * points, ignoring the path items's curve-handles, with an allowed maximum
         * error. When called on {@link CompoundPath} items, each of the nested
         * paths is simplified. On {@link Path} items, the {@link Path#segments}
         * array is processed and replaced by the resulting sequence of fitted
         * curves.
         * 
         * This method can be used to process and simplify the point data received
         * from a mouse or touch device.
         * 
         * @param tolerance - the allowed maximum error when fitting
         *     the curves through the segment points
         * 
         * @return true if the method was capable of fitting curves
         *     through the path's segment points
         */
        simplify(tolerance?: number): boolean

        /** 
         * Interpolates between the two specified path items and uses the result
         * as the geometry for this path item. The number of children and
         * segments in the two paths involved in the operation should be the same.
         * 
         * @param from - the path item defining the geometry when `factor`
         *     is `0`
         * @param to - the path item defining the geometry  when `factor`
         *     is `1`
         * @param factor - the interpolation coefficient, typically between
         *     `0` and `1`, but extrapolation is possible too
         */
        interpolate(from: PathItem, to: PathItem, factor: number): void

        /** 
         * Compares the geometry of two paths to see if they describe the same
         * shape, detecting cases where paths start in different segments or even
         * use different amounts of curves to describe the same shape, as long as
         * their orientation is the same, and their segments and handles really
         * result in the same visual appearance of curves.
         * 
         * @param path - the path to compare this path's geometry with
         * 
         * @return true if two paths describe the same shape
         */
        compare(path: PathItem): boolean

        /** 
         * On a normal empty {@link Path}, the point is simply added as the path's
         * first segment. If called on a {@link CompoundPath}, a new {@link Path} is
         * created as a child and the point is added as its first segment.
         * 
         * @param point - the point in which to start the path
         */
        moveTo(point: PointLike): void

        /** 
         * Adds a straight curve to the path, from the the last segment in the path
         * to the specified point.
         * 
         * @param point - the destination point of the newly added straight
         *     curve
         */
        lineTo(point: PointLike): void

        /** 
         * Adds an arc from the position of the last segment in the path, passing
         * through the specified `through` point, to the specified `to` point, by
         * adding one or more segments to the path.
         * 
         * @param through - the point where the arc should pass through
         * @param to - the point where the arc should end
         */
        arcTo(through: PointLike, to: PointLike): void

        /** 
         * Adds an arc from the position of the last segment in the path to
         * the specified point, by adding one or more segments to the path.
         * 
         * @param to - the point where the arc should end
         * @param clockwise - specifies whether the arc should be
         *     drawn in clockwise direction
         */
        arcTo(to: PointLike, clockwise?: boolean): void

        /** 
         * Adds a curve from the last segment in the path through the specified
         * `through` point, to the specified destination point by adding one segment
         * to the path.
         * 
         * @param through - the point through which the curve should pass
         * @param to - the destination point of the newly added curve
         * @param time - the curve-time parameter at which the
         *     `through` point is to be located
         */
        curveTo(through: PointLike, to: PointLike, time?: number): void

        /** 
         * Adds a cubic bezier curve to the path, from the last segment to the
         * specified destination point, with the curve itself defined by two
         * specified handles.
         * 
         * @param handle1 - the location of the first handle of the newly
         *     added curve in absolute coordinates, out of which the relative values
         *     for {@link Segment#handleOut} of its first segment are calculated
         * @param handle2 - the location of the second handle of the newly
         *     added curve in absolute coordinates, out of which the relative values
         *     for {@link Segment#handleIn} of its second segment are calculated
         * @param to - the destination point of the newly added curve
         */
        cubicCurveTo(handle1: PointLike, handle2: PointLike, to: PointLike): void

        /** 
         * Adds a quadratic bezier curve to the path, from the last segment to the
         * specified destination point, with the curve itself defined by the
         * specified handle.
         * 
         * Note that Paper.js only stores cubic curves, so the handle is actually
         * converted.
         * 
         * @param handle - the location of the handle of the newly added
         *     quadratic curve in absolute coordinates, out of which the relative
         *     values for {@link Segment#handleOut} of the resulting cubic curve's
         *     first segment and {@link Segment#handleIn} of its second segment are
         *     calculated
         * @param to - the destination point of the newly added curve
         */
        quadraticCurveTo(handle: PointLike, to: PointLike): void

        /** 
         * Closes the path. When closed, Paper.js connects the first and last
         * segment of the path with an additional curve. The difference to setting
         * {@link Path#closed} to `true` is that this will also merge the first
         * segment with the last if they lie in the same location.
         * 
         * @see Path#closed
         */
        closePath(): void

        /** 
         * If called on a {@link CompoundPath}, a new {@link Path} is created as a
         * child and a point is added as its first segment relative to the position
         * of the last segment of the current path.
         */
        moveBy(to: PointLike): void

        /** 
         * Adds a straight curve to the path, from the the last segment in the path
         * to the `to` vector specified relatively to it.
         * 
         * @param point - the vector describing the destination of the newly
         *     added straight curve
         */
        lineBy(point: PointLike): void

        /** 
         * Adds an arc from the position of the last segment in the path, passing
         * through the specified `through` vector, to the specified `to` vector, all
         * specified relatively to it by these given vectors, by adding one or more
         * segments to the path.
         * 
         * @param through - the vector where the arc should pass through
         * @param to - the vector where the arc should end
         */
        arcBy(through: PointLike, to: PointLike): void

        /** 
         * Adds an arc from the position of the last segment in the path to the `to`
         * vector specified relatively to it, by adding one or more segments to the
         * path.
         * 
         * @param to - the vector where the arc should end
         * @param clockwise - specifies whether the arc should be
         *     drawn in clockwise direction
         */
        arcBy(to: PointLike, clockwise?: boolean): void

        /** 
         * Adds a curve from the last segment in the path through the specified
         * `through` vector, to the specified `to` vector, all specified relatively
         * to it by these given vectors, by adding one segment to the path.
         * 
         * @param through - the vector through which the curve should pass
         * @param to - the destination vector of the newly added curve
         * @param time - the curve-time parameter at which the
         *     `through` point is to be located
         */
        curveBy(through: PointLike, to: PointLike, time?: number): void

        /** 
         * Adds a cubic bezier curve to the path, from the last segment to the
         * to the specified `to` vector, with the curve itself defined by two
         * specified handles.
         * 
         * @param handle1 - the location of the first handle of the newly
         *     added curve
         * @param handle2 - the location of the second handle of the newly
         *     added curve
         * @param to - the destination point of the newly added curve
         */
        cubicCurveBy(handle1: PointLike, handle2: PointLike, to: PointLike): void

        /** 
         * Adds a quadratic bezier curve to the path, from the last segment to the
         * specified destination point, with the curve itself defined by the
         * specified handle.
         * 
         * Note that Paper.js only stores cubic curves, so the handle is actually
         * converted.
         * 
         * @param handle - the handle of the newly added quadratic curve out
         *     of which the values for {@link Segment#handleOut} of the resulting
         *     cubic curve's first segment and {@link Segment#handleIn} of its
         *     second segment are calculated
         * @param to - the destination point of the newly added curve
         */
        quadraticCurveBy(handle: PointLike, to: PointLike): void

    }

    /** 
     * The Point object represents a point in the two dimensional space
     * of the Paper.js project. It is also used to represent two dimensional
     * vector objects.
     */
    class Point  {
        /** 
         * The x coordinate of the point
         */
        x: number

        /** 
         * The y coordinate of the point
         */
        y: number

        /** 
         * The length of the vector that is represented by this point's coordinates.
         * Each point can be interpreted as a vector that points from the origin (`x
         * = 0`, `y = 0`) to the point's location. Setting the length changes the
         * location but keeps the vector's angle.
         */
        length: number

        /** 
         * The vector's angle in degrees, measured from the x-axis to the vector.
         */
        angle: number

        /** 
         * The vector's angle in radians, measured from the x-axis to the vector.
         */
        angleInRadians: number

        /** 
         * The quadrant of the {@link #angle} of the point.
         * 
         * Angles between 0 and 90 degrees are in quadrant `1`. Angles between 90
         * and 180 degrees are in quadrant `2`, angles between 180 and 270 degrees
         * are in quadrant `3` and angles between 270 and 360 degrees are in
         * quadrant `4`.
         */
        readonly quadrant: number

        /** 
         * This property is only valid if the point is an anchor or handle point
         * of a {@link Segment} or a {@link Curve}, or the position of an
         * {@link Item}, as returned by {@link Item#position},
         * {@link Segment#point}, {@link Segment#handleIn},
         * {@link Segment#handleOut}, {@link Curve#point1}, {@link Curve#point2},
         * {@link Curve#handle1}, {@link Curve#handle2}.
         * 
         * In those cases, it returns {@true if it the point is selected}.
         * 
         * Paper.js renders selected points on top of your project. This is very
         * useful when debugging.
         */
        selected: boolean


        /** 
         * Creates a Point object with the given x and y coordinates.
         * 
         * @param x - the x coordinate
         * @param y - the y coordinate
         */
        constructor(x: number, y: number)

        /** 
         * Creates a Point object using the numbers in the given array as
         * coordinates.
         */
        constructor(array: any[])

        /** 
         * Creates a Point object using the width and height values of the given
         * Size object.
         */
        constructor(size: SizeLike)

        /** 
         * Creates a Point object using the coordinates of the given Point object.
         */
        constructor(point: PointLike)

        /** 
         * Creates a Point object using the properties in the given object.
         * 
         * @param object - the object describing the point's properties
         */
        constructor(object: object)

        /** 
         * Sets the point to the passed values. Note that any sequence of parameters
         * that is supported by the various {@link Point} constructors also work
         * for calls of `set()`.
         */
        set(...values: any[]): Point

        /** 
         * Checks whether the coordinates of the point are equal to that of the
         * supplied point.
         * 
         * @return true if the points are equal
         */
        equals(point: PointLike): boolean

        /** 
         * Returns a copy of the point.
         * 
         * @return the cloned point
         */
        clone(): Point

        /** 
         * @return a string representation of the point
         */
        toString(): string

        /** 
         * Returns the smaller angle between two vectors. The angle is unsigned, no
         * information about rotational direction is given.
         * 
         * @return the angle in degrees
         */
        getAngle(point: PointLike): number

        /** 
         * Returns the smaller angle between two vectors in radians. The angle is
         * unsigned, no information about rotational direction is given.
         * 
         * @return the angle in radians
         */
        getAngleInRadians(point: PointLike): number

        /** 
         * Returns the angle between two vectors. The angle is directional and
         * signed, giving information about the rotational direction.
         * 
         * Read more about angle units and orientation in the description of the
         * {@link #angle} property.
         * 
         * @return the angle between the two vectors
         */
        getDirectedAngle(point: PointLike): number

        /** 
         * Returns the distance between the point and another point.
         * 
         * @param squared - Controls whether the distance should
         * remain squared, or its square root should be calculated
         */
        getDistance(point: PointLike, squared?: boolean): number

        /** 
         * Normalize modifies the {@link #length} of the vector to `1` without
         * changing its angle and returns it as a new point. The optional `length`
         * parameter defines the length to normalize to. The object itself is not
         * modified!
         * 
         * @param length - The length of the normalized vector
         * 
         * @return the normalized vector of the vector that is represented
         *     by this point's coordinates
         */
        normalize(length?: number): Point

        /** 
         * Rotates the point by the given angle around an optional center point.
         * The object itself is not modified.
         * 
         * Read more about angle units and orientation in the description of the
         * {@link #angle} property.
         * 
         * @param angle - the rotation angle
         * @param center - the center point of the rotation
         * 
         * @return the rotated point
         */
        rotate(angle: number, center: PointLike): Point

        /** 
         * Transforms the point by the matrix as a new point. The object itself is
         * not modified!
         * 
         * @return the transformed point
         */
        transform(matrix: Matrix): Point

        /** 
         * Returns the addition of the supplied value to both coordinates of
         * the point as a new point.
         * The object itself is not modified!
         * 
         * @param number - the number to add
         * 
         * @return the addition of the point and the value as a new point
         */
        add(number: number): Point

        /** 
         * Returns the addition of the supplied point to the point as a new
         * point.
         * The object itself is not modified!
         * 
         * @param point - the point to add
         * 
         * @return the addition of the two points as a new point
         */
        add(point: PointLike): Point

        /** 
         * Returns the subtraction of the supplied value to both coordinates of
         * the point as a new point.
         * The object itself is not modified!
         * 
         * @param number - the number to subtract
         * 
         * @return the subtraction of the point and the value as a new point
         */
        subtract(number: number): Point

        /** 
         * Returns the subtraction of the supplied point to the point as a new
         * point.
         * The object itself is not modified!
         * 
         * @param point - the point to subtract
         * 
         * @return the subtraction of the two points as a new point
         */
        subtract(point: PointLike): Point

        /** 
         * Returns the multiplication of the supplied value to both coordinates of
         * the point as a new point.
         * The object itself is not modified!
         * 
         * @param number - the number to multiply by
         * 
         * @return the multiplication of the point and the value as a new
         *     point
         */
        multiply(number: number): Point

        /** 
         * Returns the multiplication of the supplied point to the point as a new
         * point.
         * The object itself is not modified!
         * 
         * @param point - the point to multiply by
         * 
         * @return the multiplication of the two points as a new point
         */
        multiply(point: PointLike): Point

        /** 
         * Returns the division of the supplied value to both coordinates of
         * the point as a new point.
         * The object itself is not modified!
         * 
         * @param number - the number to divide by
         * 
         * @return the division of the point and the value as a new point
         */
        divide(number: number): Point

        /** 
         * Returns the division of the supplied point to the point as a new
         * point.
         * The object itself is not modified!
         * 
         * @param point - the point to divide by
         * 
         * @return the division of the two points as a new point
         */
        divide(point: PointLike): Point

        /** 
         * The modulo operator returns the integer remainders of dividing the point
         * by the supplied value as a new point.
         * 
         * @return the integer remainders of dividing the point by the value
         * as a new point
         */
        modulo(value: number): Point

        /** 
         * The modulo operator returns the integer remainders of dividing the point
         * by the supplied value as a new point.
         * 
         * @return the integer remainders of dividing the points by each
         * other as a new point
         */
        modulo(point: PointLike): Point

        /** 
         * Checks whether the point is inside the boundaries of the rectangle.
         * 
         * @param rect - the rectangle to check against
         * 
         * @return true if the point is inside the rectangle
         */
        isInside(rect: RectangleLike): boolean

        /** 
         * Checks if the point is within a given distance of another point.
         * 
         * @param point - the point to check against
         * @param tolerance - the maximum distance allowed
         * 
         * @return true if it is within the given distance
         */
        isClose(point: PointLike, tolerance: number): boolean

        /** 
         * Checks if the vector represented by this point is collinear (parallel) to
         * another vector.
         * 
         * @param point - the vector to check against
         * 
         * @return true it is collinear
         */
        isCollinear(point: PointLike): boolean

        /** 
         * Checks if the vector represented by this point is orthogonal
         * (perpendicular) to another vector.
         * 
         * @param point - the vector to check against
         * 
         * @return true it is orthogonal
         */
        isOrthogonal(point: PointLike): boolean

        /** 
         * Checks if this point has both the x and y coordinate set to 0.
         * 
         * @return true if both x and y are 0
         */
        isZero(): boolean

        /** 
         * Checks if this point has an undefined value for at least one of its
         * coordinates.
         * 
         * @return true if either x or y are not a number
         */
        isNaN(): boolean

        /** 
         * Checks if the vector is within the specified quadrant. Note that if the
         * vector lies on the boundary between two quadrants, `true` will be
         * returned for both quadrants.
         * 
         * @see #quadrant
         * 
         * @param quadrant - the quadrant to check against
         * 
         * @return true if either x or y are not a number
         */
        isInQuadrant(quadrant: number): boolean

        /** 
         * Returns the dot product of the point and another point.
         * 
         * @return the dot product of the two points
         */
        dot(point: PointLike): number

        /** 
         * Returns the cross product of the point and another point.
         * 
         * @return the cross product of the two points
         */
        cross(point: PointLike): number

        /** 
         * Returns the projection of the point onto another point.
         * Both points are interpreted as vectors.
         * 
         * @return the projection of the point onto another point
         */
        project(point: PointLike): Point

        /** 
         * Returns a new point with rounded {@link #x} and {@link #y} values. The
         * object itself is not modified!
         */
        round(): Point

        /** 
         * Returns a new point with the nearest greater non-fractional values to the
         * specified {@link #x} and {@link #y} values. The object itself is not
         * modified!
         */
        ceil(): Point

        /** 
         * Returns a new point with the nearest smaller non-fractional values to the
         * specified {@link #x} and {@link #y} values. The object itself is not
         * modified!
         */
        floor(): Point

        /** 
         * Returns a new point with the absolute values of the specified {@link #x}
         * and {@link #y} values. The object itself is not modified!
         */
        abs(): Point

        /** 
         * Returns a new point object with the smallest {@link #x} and
         * {@link #y} of the supplied points.
         * 
         * @return the newly created point object
         */
        static min(point1: PointLike, point2: PointLike): Point

        /** 
         * Returns a new point object with the largest {@link #x} and
         * {@link #y} of the supplied points.
         * 
         * @return the newly created point object
         */
        static max(point1: PointLike, point2: PointLike): Point

        /** 
         * Returns a point object with random {@link #x} and {@link #y} values
         * between `0` and `1`.
         * 
         * @return the newly created point object
         */
        static random(): Point

    }

    /** 
     * A PointText item represents a piece of typography in your Paper.js
     * project which starts from a certain point and extends by the amount of
     * characters contained in it.
     */
    class PointText extends TextItem {
        /** 
         * The PointText's anchor point
         */
        point: Point


        /** 
         * Creates a point text item
         * 
         * @param point - the position where the text will start
         */
        constructor(point: PointLike)

        /** 
         * Creates a point text item from the properties described by an object
         * literal.
         * 
         * @param object - an object containing properties describing the
         *     path's attributes
         */
        constructor(object: object)

    }

    /** 
     * A Project object in Paper.js is what usually is referred to as the
     * document: The top level object that holds all the items contained in the
     * scene graph. As the term document is already taken in the browser context,
     * it is called Project.
     * 
     * Projects allow the manipulation of the styles that are applied to all newly
     * created items, give access to the selected items, and will in future versions
     * offer ways to query for items in the scene graph defining specific
     * requirements, and means to persist and load from different formats, such as
     * SVG and PDF.
     * 
     * The currently active project can be accessed through the
     * {@link PaperScope#project} variable.
     * 
     * An array of all open projects is accessible through the
     * {@link PaperScope#projects} variable.
     */
    class Project  {
        /** 
         * The reference to the project's view.
         */
        readonly view: View

        /** 
         * The currently active path style. All selected items and newly
         * created items will be styled with this style.
         */
        currentStyle: Style

        /** 
         * The index of the project in the {@link PaperScope#projects} list.
         */
        readonly index: number

        /** 
         * The layers contained within the project.
         */
        readonly layers: Layer[]

        /** 
         * The layer which is currently active. New items will be created on this
         * layer by default.
         */
        readonly activeLayer: Layer

        /** 
         * The symbol definitions shared by all symbol items contained place ind
         * project.
         */
        readonly symbolDefinitions: SymbolDefinition[]

        /** 
         * The selected items contained within the project.
         */
        readonly selectedItems: Item[]


        /** 
         * Creates a Paper.js project containing one empty {@link Layer}, referenced
         * by {@link Project#activeLayer}.
         * 
         * Note that when working with PaperScript, a project is automatically
         * created for us and the {@link PaperScope#project} variable points to it.
         * 
         * @param element - the HTML canvas element
         * that should be used as the element for the view, or an ID string by which
         * to find the element, or the size of the canvas to be created for usage in
         * a web worker.
         */
        constructor(element: HTMLCanvasElement | string | SizeLike)

        /** 
         * Activates this project, so all newly created items will be placed
         * in it.
         */
        activate(): void

        /** 
         * Clears the project by removing all {@link Project#layers}.
         */
        clear(): void

        /** 
         * Checks whether the project has any content or not.
         */
        isEmpty(): boolean

        /** 
         * Removes this project from the {@link PaperScope#projects} list, and also
         * removes its view, if one was defined.
         */
        remove(): void

        /** 
         * Selects all items in the project.
         */
        selectAll(): void

        /** 
         * Deselects all selected items in the project.
         */
        deselectAll(): void

        /** 
         * Adds the specified layer at the end of the this project's {@link #layers}
         * list.
         * 
         * @param layer - the layer to be added to the project
         * 
         * @return the added layer, or `null` if adding was not possible
         */
        addLayer(layer: Layer): Layer

        /** 
         * Inserts the specified layer at the specified index in this project's
         * {@link #layers} list.
         * 
         * @param index - the index at which to insert the layer
         * @param layer - the layer to be inserted in the project
         * 
         * @return the added layer, or `null` if adding was not possible
         */
        insertLayer(index: number, layer: Layer): Layer

        /** 
         * Performs a hit-test on the items contained within the project at the
         * location of the specified point.
         * 
         * The options object allows you to control the specifics of the hit-test
         * and may contain a combination of the following values:
         * 
         * @option [options.tolerance={@link PaperScope#settings}.hitTolerance]
         *     {Number} the tolerance of the hit-test
         * @option options.class {Function} only hit-test against a specific item
         *     class, or any of its sub-classes, by providing the constructor
         *     function against which an `instanceof` check is performed:
         *     {@values  Group, Layer, Path, CompoundPath, Shape, Raster,
         *     SymbolItem, PointText, ...}
         * @option options.match {Function} a match function to be called for each
         *     found hit result: Return `true` to return the result, `false` to keep
         *     searching
         * @option [options.fill=true] {Boolean} hit-test the fill of items
         * @option [options.stroke=true] {Boolean} hit-test the stroke of path
         *     items, taking into account the setting of stroke color and width
         * @option [options.segments=true] {Boolean} hit-test for {@link
         *     Segment#point} of {@link Path} items
         * @option options.curves {Boolean} hit-test the curves of path items,
         *     without taking the stroke color or width into account
         * @option options.handles {Boolean} hit-test for the handles ({@link
         *     Segment#handleIn} / {@link Segment#handleOut}) of path segments.
         * @option options.ends {Boolean} only hit-test for the first or last
         *     segment points of open path items
         * @option options.position {Boolean} hit-test the {@link Item#position} of
         *     of items, which depends on the setting of {@link Item#pivot}
         * @option options.center {Boolean} hit-test the {@link Rectangle#center} of
         *     the bounding rectangle of items ({@link Item#bounds})
         * @option options.bounds {Boolean} hit-test the corners and side-centers of
         *     the bounding rectangle of items ({@link Item#bounds})
         * @option options.guides {Boolean} hit-test items that have {@link
         *     Item#guide} set to `true`
         * @option options.selected {Boolean} only hit selected items
         * 
         * @param point - the point where the hit-test should be performed
         * 
         * @return a hit result object that contains more information
         *     about what exactly was hit or `null` if nothing was hit
         */
        hitTest(point: PointLike, options?: object): HitResult

        /** 
         * Performs a hit-test on the item and its children (if it is a {@link
         * Group} or {@link Layer}) at the location of the specified point,
         * returning all found hits.
         * 
         * The options object allows you to control the specifics of the hit-
         * test. See {@link #hitTest} for a list of all options.
         * 
         * @see #hitTest(point[, options]);
         * 
         * @param point - the point where the hit-test should be performed
         * 
         * @return hit result objects for all hits, describing what
         *     exactly was hit or `null` if nothing was hit
         */
        hitTestAll(point: PointLike, options?: object): HitResult[]

        /** 
         * Fetch items contained within the project whose properties match the
         * criteria in the specified object.
         * 
         * Extended matching of properties is possible by providing a comparator
         * function or regular expression. Matching points, colors only work as a
         * comparison of the full object, not partial matching (e.g. only providing
         * the x- coordinate to match all points with that x-value). Partial
         * matching does work for {@link Item#data}.
         * 
         * Matching items against a rectangular area is also possible, by setting
         * either `options.inside` or `options.overlapping` to a rectangle
         * describing the area in which the items either have to be fully or partly
         * contained.
         * 
         * @see Item#matches(options)
         * @see Item#getItems(options)
         * 
         * @option [options.recursive=true] {Boolean} whether to loop recursively
         *     through all children, or stop at the current level
         * @option options.match {Function} a match function to be called for each
         *     item, allowing the definition of more flexible item checks that are
         *     not bound to properties. If no other match properties are defined,
         *     this function can also be passed instead of the `match` object
         * @option options.class {Function} the constructor function of the item
         *     type to match against
         * @option options.inside {Rectangle} the rectangle in which the items need
         *     to be fully contained
         * @option options.overlapping {Rectangle} the rectangle with which the
         *     items need to at least partly overlap
         * 
         * @param options - the criteria to match against
         * 
         * @return the list of matching items contained in the project
         */
        getItems(options: object | Function): Item[]

        /** 
         * Fetch the first item contained within the project whose properties
         * match the criteria in the specified object.
         * Extended matching is possible by providing a compare function or
         * regular expression. Matching points, colors only work as a comparison
         * of the full object, not partial matching (e.g. only providing the x-
         * coordinate to match all points with that x-value). Partial matching
         * does work for {@link Item#data}.
         * 
         * See {@link #getItems} for a selection of illustrated examples.
         * 
         * @param options - the criteria to match against
         * 
         * @return the first item in the project matching the given criteria
         */
        getItem(options: object | Function): Item

        /** 
         * Exports (serializes) the project with all its layers and child items to a
         * JSON data object or string.
         * 
         * @option [options.asString=true] {Boolean} whether the JSON is returned as
         *     a `Object` or a `String`
         * @option [options.precision=5] {Number} the amount of fractional digits in
         *     numbers used in JSON data
         * 
         * @param options - the serialization options
         * 
         * @return the exported JSON data
         */
        exportJSON(options?: object): string

        /** 
         * Imports (deserializes) the stored JSON data into the project.
         * Note that the project is not cleared first. You can call
         * {@link Project#clear} to do so.
         * 
         * @param json - the JSON data to import from
         * 
         * @return the imported item
         */
        importJSON(json: string): Item

        /** 
         * Exports the project with all its layers and child items as an SVG DOM,
         * all contained in one top level SVG group node.
         * 
         * @option [options.bounds='view'] {String|Rectangle} the bounds of the area
         *     to export, either as a string ({@values 'view', content'}), or a
         *     {@link Rectangle} object: `'view'` uses the view bounds,
         *     `'content'` uses the stroke bounds of all content
         * @option [options.matrix=paper.view.matrix] {Matrix} the matrix with which
         *     to transform the exported content: If `options.bounds` is set to
         *     `'view'`, `paper.view.matrix` is used, for all other settings of
         *     `options.bounds` the identity matrix is used.
         * @option [options.asString=false] {Boolean} whether a SVG node or a
         *     `String` is to be returned
         * @option [options.precision=5] {Number} the amount of fractional digits in
         *     numbers used in SVG data
         * @option [options.matchShapes=false] {Boolean} whether path items should
         *     tried to be converted to SVG shape items (rect, circle, ellipse,
         *     line, polyline, polygon), if their geometries match
         * @option [options.embedImages=true] {Boolean} whether raster images should
         *     be embedded as base64 data inlined in the xlink:href attribute, or
         *     kept as a link to their external URL.
         * 
         * @param options - the export options
         * 
         * @return the project converted to an SVG node or a
         * `String` depending on `option.asString` value
         */
        exportSVG(options?: object): SVGElement | string

        /** 
         * Converts the provided SVG content into Paper.js items and adds them to
         * the active layer of this project.
         * Note that the project is not cleared first. You can call
         * {@link Project#clear} to do so.
         * 
         * @option [options.expandShapes=false] {Boolean} whether imported shape
         *     items should be expanded to path items
         * @option options.onLoad {Function} the callback function to call once the
         *     SVG content is loaded from the given URL receiving two arguments: the
         *     converted `item` and the original `svg` data as a string. Only
         *     required when loading from external resources.
         * @option options.onError {Function} the callback function to call if an
         *     error occurs during loading. Only required when loading from external
         *     resources.
         * @option [options.insert=true] {Boolean} whether the imported items should
         *     be added to the project that `importSVG()` is called on
         * @option [options.applyMatrix={@link PaperScope#settings}.applyMatrix]
         *     {Boolean} whether the imported items should have their transformation
         *     matrices applied to their contents or not
         * 
         * @param svg - the SVG content to import, either as a SVG
         *     DOM node, a string containing SVG content, or a string describing the
         *     URL of the SVG file to fetch.
         * @param options - the import options
         * 
         * @return the newly created Paper.js item containing the converted
         *     SVG content
         */
        importSVG(svg: SVGElement | string, options?: object): Item

        /** 
         * Imports the provided external SVG file, converts it into Paper.js items
         * and adds them to the active layer of this project.
         * Note that the project is not cleared first. You can call
         * {@link Project#clear} to do so.
         * 
         * @param svg - the URL of the SVG file to fetch.
         * @param onLoad - the callback function to call once the SVG
         *     content is loaded from the given URL receiving two arguments: the
         *     converted `item` and the original `svg` data as a string. Only
         *     required when loading from external files.
         * 
         * @return the newly created Paper.js item containing the converted
         *     SVG content
         */
        importSVG(svg: SVGElement | string, onLoad: Function): Item

    }

    /** 
     * The Raster item represents an image in a Paper.js project.
     */
    class Raster extends Item {
        /** 
         * The size of the raster in pixels.
         */
        size: Size

        /** 
         * The width of the raster in pixels.
         */
        width: number

        /** 
         * The height of the raster in pixels.
         */
        height: number

        /** 
         * The loading state of the raster image.
         */
        readonly loaded: boolean

        /** 
         * The resolution of the raster at its current size, in PPI (pixels per
         * inch).
         */
        readonly resolution: Size

        /** 
         * The HTMLImageElement or Canvas element of the raster, if one is
         * associated.
         * Note that for consistency, a {@link #onLoad} event will be triggered on
         * the raster even if the image has already finished loading before, or if
         * we are setting the raster to a canvas.
         */
        image: HTMLImageElement | HTMLCanvasElement

        /** 
         * The Canvas object of the raster. If the raster was created from an image,
         * accessing its canvas causes the raster to try and create one and draw the
         * image into it. Depending on security policies, this might fail, in which
         * case `null` is returned instead.
         */
        canvas: HTMLCanvasElement

        /** 
         * The Canvas 2D drawing context of the raster.
         */
        context: CanvasRenderingContext2D

        /** 
         * The source of the raster, which can be set using a DOM Image, a Canvas,
         * a data url, a string describing the URL to load the image from, or the
         * ID of a DOM element to get the image from (either a DOM Image or a
         * Canvas). Reading this property will return the url of the source image or
         * a data-url.
         * Note that for consistency, a {@link #onLoad} event will be triggered on
         * the raster even if the image has already finished loading before.
         */
        source: HTMLImageElement | HTMLCanvasElement | string

        /** 
         * The crossOrigin value to be used when loading the image resource, in
         * order to support CORS. Note that this needs to be set before setting the
         * {@link #source} property in order to always work (e.g. when the image is
         * cached in the browser).
         */
        crossOrigin: string

        /** 
         * Determines if the raster is drawn with pixel smoothing when scaled up or
         * down, and if so, at which quality its pixels are to be smoothed. The
         * settings of this property control both the `imageSmoothingEnabled` and
         * `imageSmoothingQuality` properties of the `CanvasRenderingContext2D`
         * interface.
         * 
         * By default, smoothing is enabled at `'low'` quality. It can be set to of
         * `'off'` to scale the raster's pixels by repeating the nearest neighboring
         * pixels, or to `'low'`, `'medium'` or `'high'` to control the various
         * degrees of available image smoothing quality.
         * 
         * For backward compatibility, it can can also be set to `false` (= `'off'`)
         * or `true` (= `'low'`).
         */
        smoothing: string

        /** 
         * The event handler function to be called when the underlying image has
         * finished loading and is ready to be used. This is also triggered when
         * the image is already loaded, or when a canvas is used instead of an
         * image.
         */
        onLoad: Function | null

        /** 
         * The event handler function to be called when there is an error loading
         * the underlying image.
         */
        onError: Function | null


        /** 
         * Creates a new raster item from the passed argument, and places it in the
         * active layer. `source` can either be a DOM Image, a Canvas, or a string
         * describing the URL to load the image from, or the ID of a DOM element to
         * get the image from (either a DOM Image or a Canvas).
         * 
         * @param source - the source of
         *     the raster
         * @param position - the center position at which the raster item is
         *     placed
         */
        constructor(source?: HTMLImageElement | HTMLCanvasElement | string, position?: PointLike)

        /** 
         * Creates a new empty raster of the given size, and places it in the
         * active layer.
         * 
         * @param size - the size of the raster
         * @param position - the center position at which the raster item is
         *     placed
         */
        constructor(size: SizeLike, position?: PointLike)

        /** 
         * Creates a new raster from an object description, and places it in the
         * active layer.
         * 
         * @param object - an object containing properties to be set on the
         *     raster
         */
        constructor(object: object)

        /** 
         * Extracts a part of the Raster's content as a sub image, and returns it as
         * a Canvas object.
         * 
         * @param rect - the boundaries of the sub image in pixel
         * coordinates
         * 
         * @return the sub image as a Canvas object
         */
        getSubCanvas(rect: RectangleLike): HTMLCanvasElement

        /** 
         * Extracts a part of the raster item's content as a new raster item, placed
         * in exactly the same place as the original content.
         * 
         * @param rect - the boundaries of the sub raster in pixel
         * coordinates
         * 
         * @return the sub raster as a newly created raster item
         */
        getSubRaster(rect: RectangleLike): Raster

        /** 
         * Returns a Base 64 encoded `data:` URL representation of the raster.
         */
        toDataURL(): string

        /** 
         * Draws an image on the raster.
         * 
         * @param point - the offset of the image as a point in pixel
         * coordinates
         */
        drawImage(image: CanvasImageSource, point: PointLike): void

        /** 
         * Calculates the average color of the image within the given path,
         * rectangle or point. This can be used for creating raster image
         * effects.
         * 
         * @return the average color contained in the area covered by the
         * specified path, rectangle or point
         */
        getAverageColor(object: Path | RectangleLike | PointLike): Color

        /** 
         * Gets the color of a pixel in the raster.
         * 
         * @param x - the x offset of the pixel in pixel coordinates
         * @param y - the y offset of the pixel in pixel coordinates
         * 
         * @return the color of the pixel
         */
        getPixel(x: number, y: number): Color

        /** 
         * Gets the color of a pixel in the raster.
         * 
         * @param point - the offset of the pixel as a point in pixel
         *     coordinates
         * 
         * @return the color of the pixel
         */
        getPixel(point: PointLike): Color

        /** 
         * Sets the color of the specified pixel to the specified color.
         * 
         * @param x - the x offset of the pixel in pixel coordinates
         * @param y - the y offset of the pixel in pixel coordinates
         * @param color - the color that the pixel will be set to
         */
        setPixel(x: number, y: number, color: Color): void

        /** 
         * Sets the color of the specified pixel to the specified color.
         * 
         * @param point - the offset of the pixel as a point in pixel
         *     coordinates
         * @param color - the color that the pixel will be set to
         */
        setPixel(point: PointLike, color: Color): void

        /** 
         * Clears the image, if it is backed by a canvas.
         */
        clear(): void

        
        createImageData(size: SizeLike): ImageData

        
        getImageData(rect: RectangleLike): ImageData

        
        putImageData(data: ImageData, point: PointLike): void

        
        setImageData(data: ImageData): void

    }

    /** 
     * A Rectangle specifies an area that is enclosed by it's top-left
     * point (x, y), its width, and its height. It should not be confused with a
     * rectangular path, it is not an item.
     */
    class Rectangle  {
        /** 
         * The x position of the rectangle.
         */
        x: number

        /** 
         * The y position of the rectangle.
         */
        y: number

        /** 
         * The width of the rectangle.
         */
        width: number

        /** 
         * The height of the rectangle.
         */
        height: number

        /** 
         * The top-left point of the rectangle
         */
        point: Point

        /** 
         * The size of the rectangle
         */
        size: Size

        /** 
         * The position of the left hand side of the rectangle. Note that this
         * doesn't move the whole rectangle; the right hand side stays where it was.
         */
        left: number

        /** 
         * The top coordinate of the rectangle. Note that this doesn't move the
         * whole rectangle: the bottom won't move.
         */
        top: number

        /** 
         * The position of the right hand side of the rectangle. Note that this
         * doesn't move the whole rectangle; the left hand side stays where it was.
         */
        right: number

        /** 
         * The bottom coordinate of the rectangle. Note that this doesn't move the
         * whole rectangle: the top won't move.
         */
        bottom: number

        /** 
         * The center point of the rectangle.
         */
        center: Point

        /** 
         * The top-left point of the rectangle.
         */
        topLeft: Point

        /** 
         * The top-right point of the rectangle.
         */
        topRight: Point

        /** 
         * The bottom-left point of the rectangle.
         */
        bottomLeft: Point

        /** 
         * The bottom-right point of the rectangle.
         */
        bottomRight: Point

        /** 
         * The left-center point of the rectangle.
         */
        leftCenter: Point

        /** 
         * The top-center point of the rectangle.
         */
        topCenter: Point

        /** 
         * The right-center point of the rectangle.
         */
        rightCenter: Point

        /** 
         * The bottom-center point of the rectangle.
         */
        bottomCenter: Point

        /** 
         * The area of the rectangle.
         */
        readonly area: number

        /** 
         * Specifies whether an item's bounds are to appear as selected.
         * 
         * Paper.js draws the bounds of items with selected bounds on top of
         * your project. This is very useful when debugging.
         */
        selected: boolean


        /** 
         * Creates a Rectangle object.
         * 
         * @param point - the top-left point of the rectangle
         * @param size - the size of the rectangle
         */
        constructor(point: PointLike, size: SizeLike)

        /** 
         * Creates a rectangle object.
         * 
         * @param x - the left coordinate
         * @param y - the top coordinate
         */
        constructor(x: number, y: number, width: number, height: number)

        /** 
         * Creates a rectangle object from the passed points. These do not
         * necessarily need to be the top left and bottom right corners, the
         * constructor figures out how to fit a rectangle between them.
         * 
         * @param from - the first point defining the rectangle
         * @param to - the second point defining the rectangle
         */
        constructor(from: PointLike, to: PointLike)

        /** 
         * Creates a new rectangle object from the passed rectangle object.
         */
        constructor(rectangle: RectangleLike)

        /** 
         * Creates a Rectangle object.
         * 
         * @param object - an object containing properties to be set on the
         * rectangle
         */
        constructor(object: object)

        /** 
         * Sets the rectangle to the passed values. Note that any sequence of
         * parameters that is supported by the various {@link Rectangle}
         * constructors also work for calls of `set()`.
         */
        set(...values: any[]): Rectangle

        /** 
         * Returns a copy of the rectangle.
         */
        clone(): Rectangle

        /** 
         * Checks whether the coordinates and size of the rectangle are equal to
         * that of the supplied rectangle.
         * 
         * @return true if the rectangles are equal
         */
        equals(rect: RectangleLike): boolean

        /** 
         * @return a string representation of this rectangle
         */
        toString(): string

        /** 
         * @return true if the rectangle is empty
         */
        isEmpty(): boolean

        /** 
         * Tests if the specified point is inside the boundary of the rectangle.
         * 
         * @param point - the specified point
         * 
         * @return true if the point is inside the rectangle's boundary
         */
        contains(point: PointLike): boolean

        /** 
         * Tests if the interior of the rectangle entirely contains the specified
         * rectangle.
         * 
         * @param rect - the specified rectangle
         * 
         * @return true if the rectangle entirely contains the specified
         * rectangle
         */
        contains(rect: RectangleLike): boolean

        /** 
         * Tests if the interior of this rectangle intersects the interior of
         * another rectangle. Rectangles just touching each other are considered as
         * non-intersecting, except if a `epsilon` value is specified by which this
         * rectangle's dimensions are increased before comparing.
         * 
         * @param rect - the specified rectangle
         * @param epsilon - the epsilon against which to compare the
         *     rectangle's dimensions
         * 
         * @return true if the rectangle and the specified rectangle
         *     intersect each other
         */
        intersects(rect: RectangleLike, epsilon?: number): boolean

        /** 
         * Returns a new rectangle representing the intersection of this rectangle
         * with the specified rectangle.
         * 
         * @param rect - the rectangle to be intersected with this
         * rectangle
         * 
         * @return the largest rectangle contained in both the specified
         * rectangle and in this rectangle
         */
        intersect(rect: RectangleLike): Rectangle

        /** 
         * Returns a new rectangle representing the union of this rectangle with the
         * specified rectangle.
         * 
         * @param rect - the rectangle to be combined with this rectangle
         * 
         * @return the smallest rectangle containing both the specified
         * rectangle and this rectangle
         */
        unite(rect: RectangleLike): Rectangle

        /** 
         * Adds a point to this rectangle. The resulting rectangle is the smallest
         * rectangle that contains both the original rectangle and the specified
         * point.
         * 
         * After adding a point, a call to {@link #contains} with the added
         * point as an argument does not necessarily return `true`. The {@link
         * Rectangle#contains(point)} method does not return `true` for points on
         * the right or bottom edges of a rectangle. Therefore, if the added point
         * falls on the left or bottom edge of the enlarged rectangle, {@link
         * Rectangle#contains(point)} returns `false` for that point.
         * 
         * @return the smallest rectangle that contains both the
         * original rectangle and the specified point
         */
        include(point: PointLike): Rectangle

        /** 
         * Returns a new rectangle expanded by the specified amount in horizontal
         * and vertical directions.
         * 
         * @param amount - the amount to expand the rectangle in
         * both directions
         * 
         * @return the expanded rectangle
         */
        expand(amount: number | SizeLike | PointLike): Rectangle

        /** 
         * Returns a new rectangle expanded by the specified amounts in horizontal
         * and vertical directions.
         * 
         * @param hor - the amount to expand the rectangle in horizontal
         * direction
         * @param ver - the amount to expand the rectangle in vertical
         * direction
         * 
         * @return the expanded rectangle
         */
        expand(hor: number, ver: number): Rectangle

        /** 
         * Returns a new rectangle scaled by the specified amount from its center.
         * 
         * @return the scaled rectangle
         */
        scale(amount: number): Rectangle

        /** 
         * Returns a new rectangle scaled in horizontal direction by the specified
         * `hor` amount and in vertical direction by the specified `ver` amount
         * from its center.
         * 
         * @return the scaled rectangle
         */
        scale(hor: number, ver: number): Rectangle

    }

    /** 
     * The Segment object represents the points of a path through which its
     * {@link Curve} objects pass. The segments of a path can be accessed through
     * its {@link Path#segments} array.
     * 
     * Each segment consists of an anchor point ({@link Segment#point}) and
     * optionally an incoming and an outgoing handle ({@link Segment#handleIn} and
     * {@link Segment#handleOut}), describing the tangents of the two {@link Curve}
     * objects that are connected by this segment.
     */
    class Segment  {
        /** 
         * The anchor point of the segment.
         */
        point: Point

        /** 
         * The handle point relative to the anchor point of the segment that
         * describes the in tangent of the segment.
         */
        handleIn: Point

        /** 
         * The handle point relative to the anchor point of the segment that
         * describes the out tangent of the segment.
         */
        handleOut: Point

        /** 
         * Specifies whether the segment is selected.
         */
        selected: boolean

        /** 
         * The index of the segment in the {@link Path#segments} array that the
         * segment belongs to.
         */
        readonly index: number

        /** 
         * The path that the segment belongs to.
         */
        readonly path: Path

        /** 
         * The curve that the segment belongs to. For the last segment of an open
         * path, the previous segment is returned.
         */
        readonly curve: Curve

        /** 
         * The curve location that describes this segment's position on the path.
         */
        readonly location: CurveLocation

        /** 
         * The next segment in the {@link Path#segments} array that the segment
         * belongs to. If the segments belongs to a closed path, the first segment
         * is returned for the last segment of the path.
         */
        readonly next: Segment

        /** 
         * The previous segment in the {@link Path#segments} array that the
         * segment belongs to. If the segments belongs to a closed path, the last
         * segment is returned for the first segment of the path.
         */
        readonly previous: Segment


        /** 
         * Creates a new Segment object.
         * 
         * @param point - the anchor point of the segment
         * @param handleIn - the handle point relative to the
         *     anchor point of the segment that describes the in tangent of the
         *     segment
         * @param handleOut - the handle point relative to the
         *     anchor point of the segment that describes the out tangent of the
         *     segment
         */
        constructor(point?: PointLike, handleIn?: PointLike, handleOut?: PointLike)

        /** 
         * Creates a new Segment object.
         * 
         * @param object - an object containing properties to be set on the
         *     segment
         */
        constructor(object: object)

        /** 
         * Checks if the segment has any curve handles set.
         * 
         * @see Segment#handleIn
         * @see Segment#handleOut
         * @see Curve#hasHandles()
         * @see Path#hasHandles()
         * 
         * @return true if the segment has handles set
         */
        hasHandles(): boolean

        /** 
         * Checks if the segment connects two curves smoothly, meaning that its two
         * handles are collinear and segment does not form a corner.
         * 
         * @see Point#isCollinear()
         * 
         * @return true if the segment is smooth
         */
        isSmooth(): boolean

        /** 
         * Clears the segment's handles by setting their coordinates to zero,
         * turning the segment into a corner.
         */
        clearHandles(): void

        /** 
         * Smooths the bezier curves that pass through this segment by taking into
         * account the segment's position and distance to the neighboring segments
         * and changing the direction and length of the segment's handles
         * accordingly without moving the segment itself.
         * 
         * Two different smoothing methods are available:
         * 
         * - `'catmull-rom'` uses the Catmull-Rom spline to smooth the segment.
         * 
         *     The optionally passed factor controls the knot parametrization of the
         *     algorithm:
         * 
         *     - `0.0`: the standard, uniform Catmull-Rom spline
         *     - `0.5`: the centripetal Catmull-Rom spline, guaranteeing no
         *         self-intersections
         *     - `1.0`: the chordal Catmull-Rom spline
         * 
         * - `'geometric'` use a simple heuristic and empiric geometric method to
         *     smooth the segment's handles. The handles were weighted, meaning that
         *     big differences in distances between the segments will lead to
         *     probably undesired results.
         * 
         *     The optionally passed factor defines the tension parameter (`0...1`),
         *     controlling the amount of smoothing as a factor by which to scale
         *     each handle.
         * 
         * @see PathItem#smooth([options])
         * 
         * @option [options.type='catmull-rom'] {String} the type of smoothing
         *     method: {@values 'catmull-rom', 'geometric'}
         * @option options.factor {Number} the factor parameterizing the smoothing
         *     method — default: `0.5` for `'catmull-rom'`, `0.4` for `'geometric'`
         * 
         * @param options - the smoothing options
         */
        smooth(options?: object): void

        /** 
         * Checks if the this is the first segment in the {@link Path#segments}
         * array.
         * 
         * @return true if this is the first segment
         */
        isFirst(): boolean

        /** 
         * Checks if the this is the last segment in the {@link Path#segments}
         * array.
         * 
         * @return true if this is the last segment
         */
        isLast(): boolean

        /** 
         * Reverses the {@link #handleIn} and {@link #handleOut} vectors of this
         * segment, modifying the actual segment without creating a copy.
         * 
         * @return the reversed segment
         */
        reverse(): Segment

        /** 
         * Returns the reversed the segment, without modifying the segment itself.
         * 
         * @return the reversed segment
         */
        reversed(): Segment

        /** 
         * Removes the segment from the path that it belongs to.
         * 
         * @return true if the segment was removed
         */
        remove(): boolean

        
        clone(): Segment

        /** 
         * @return a string representation of the segment
         */
        toString(): string

        /** 
         * Transform the segment by the specified matrix.
         * 
         * @param matrix - the matrix to transform the segment by
         */
        transform(matrix: Matrix): void

        /** 
         * Interpolates between the two specified segments and sets the point and
         * handles of this segment accordingly.
         * 
         * @param from - the segment defining the geometry when `factor` is
         *     `0`
         * @param to - the segment defining the geometry when `factor` is
         *     `1`
         * @param factor - the interpolation coefficient, typically between
         *     `0` and `1`, but extrapolation is possible too
         */
        interpolate(from: Segment, to: Segment, factor: number): void

    }

    
    class Shape extends Item {
        /** 
         * The type of shape of the item as a string.
         */
        type: string

        /** 
         * The size of the shape.
         */
        size: Size

        /** 
         * The radius of the shape, as a number if it is a circle, or a size object
         * for ellipses and rounded rectangles.
         */
        radius: number | Size


        /** 
         * Creates a new path item with same geometry as this shape item, and
         * inherits all settings from it, similar to {@link Item#clone}.
         * 
         * @see Path#toShape(insert)
         * 
         * @param insert - specifies whether the new path should be
         *     inserted into the scene graph. When set to `true`, it is inserted
         *     above the shape item
         * 
         * @return the newly created path item with the same geometry as
         *     this shape item
         */
        toPath(insert?: boolean): Path

    }
    namespace Shape {

        class Circle extends Shape {
            /** 
             * Creates a circular shape item.
             * 
             * @param center - the center point of the circle
             * @param radius - the radius of the circle
             */
            constructor(center: PointLike, radius: number)

            /** 
             * Creates a circular shape item from the properties described by an
             * object literal.
             * 
             * @param object - an object containing properties describing the
             *     shape's attributes
             */
            constructor(object: object)

        }

        class Rectangle extends Shape {
            /** 
             * Creates a rectangular shape item, with optionally rounded corners.
             * 
             * @param rectangle - the rectangle object describing the
             * geometry of the rectangular shape to be created
             * @param radius - the size of the rounded corners
             */
            constructor(rectangle: RectangleLike, radius?: SizeLike)

            /** 
             * Creates a rectangular shape item from a point and a size object.
             * 
             * @param point - the rectangle's top-left corner.
             * @param size - the rectangle's size.
             */
            constructor(point: PointLike, size: SizeLike)

            /** 
             * Creates a rectangular shape item from the passed points. These do not
             * necessarily need to be the top left and bottom right corners, the
             * constructor figures out how to fit a rectangle between them.
             * 
             * @param from - the first point defining the rectangle
             * @param to - the second point defining the rectangle
             */
            constructor(from: PointLike, to: PointLike)

            /** 
             * Creates a rectangular shape item from the properties described by an
             * object literal.
             * 
             * @param object - an object containing properties describing the
             *     shape's attributes
             */
            constructor(object: object)

        }

        class Ellipse extends Shape {
            /** 
             * Creates an elliptical shape item.
             * 
             * @param rectangle - the rectangle circumscribing the ellipse
             */
            constructor(rectangle: RectangleLike)

            /** 
             * Creates an elliptical shape item from the properties described by an
             * object literal.
             * 
             * @param object - an object containing properties describing the
             *     shape's attributes
             */
            constructor(object: object)

        }
    }

    /** 
     * The Size object is used to describe the size or dimensions of
     * something, through its {@link #width} and {@link #height} properties.
     */
    class Size  {
        /** 
         * The width of the size
         */
        width: number

        /** 
         * The height of the size
         */
        height: number


        /** 
         * Creates a Size object with the given width and height values.
         * 
         * @param width - the width
         * @param height - the height
         */
        constructor(width: number, height: number)

        /** 
         * Creates a Size object using the numbers in the given array as
         * dimensions.
         */
        constructor(array: any[])

        /** 
         * Creates a Size object using the coordinates of the given Size object.
         */
        constructor(size: SizeLike)

        /** 
         * Creates a Size object using the {@link Point#x} and {@link Point#y}
         * values of the given Point object.
         */
        constructor(point: PointLike)

        /** 
         * Creates a Size object using the properties in the given object.
         */
        constructor(object: object)

        /** 
         * Sets the size to the passed values. Note that any sequence of parameters
         * that is supported by the various {@link Size} constructors also work
         * for calls of `set()`.
         */
        set(...values: any[]): Size

        /** 
         * Checks whether the width and height of the size are equal to those of the
         * supplied size.
         * 
         * @param size - the size to compare to
         */
        equals(size: SizeLike): boolean

        /** 
         * Returns a copy of the size.
         */
        clone(): Size

        /** 
         * @return a string representation of the size
         */
        toString(): string

        /** 
         * Returns the addition of the supplied value to the width and height of the
         * size as a new size. The object itself is not modified!
         * 
         * @param number - the number to add
         * 
         * @return the addition of the size and the value as a new size
         */
        add(number: number): Size

        /** 
         * Returns the addition of the width and height of the supplied size to the
         * size as a new size. The object itself is not modified!
         * 
         * @param size - the size to add
         * 
         * @return the addition of the two sizes as a new size
         */
        add(size: SizeLike): Size

        /** 
         * Returns the subtraction of the supplied value from the width and height
         * of the size as a new size. The object itself is not modified!
         * The object itself is not modified!
         * 
         * @param number - the number to subtract
         * 
         * @return the subtraction of the size and the value as a new size
         */
        subtract(number: number): Size

        /** 
         * Returns the subtraction of the width and height of the supplied size from
         * the size as a new size. The object itself is not modified!
         * 
         * @param size - the size to subtract
         * 
         * @return the subtraction of the two sizes as a new size
         */
        subtract(size: SizeLike): Size

        /** 
         * Returns the multiplication of the supplied value with the width and
         * height of the size as a new size. The object itself is not modified!
         * 
         * @param number - the number to multiply by
         * 
         * @return the multiplication of the size and the value as a new size
         */
        multiply(number: number): Size

        /** 
         * Returns the multiplication of the width and height of the supplied size
         * with the size as a new size. The object itself is not modified!
         * 
         * @param size - the size to multiply by
         * 
         * @return the multiplication of the two sizes as a new size
         */
        multiply(size: SizeLike): Size

        /** 
         * Returns the division of the supplied value by the width and height of the
         * size as a new size. The object itself is not modified!
         * 
         * @param number - the number to divide by
         * 
         * @return the division of the size and the value as a new size
         */
        divide(number: number): Size

        /** 
         * Returns the division of the width and height of the supplied size by the
         * size as a new size. The object itself is not modified!
         * 
         * @param size - the size to divide by
         * 
         * @return the division of the two sizes as a new size
         */
        divide(size: SizeLike): Size

        /** 
         * The modulo operator returns the integer remainders of dividing the size
         * by the supplied value as a new size.
         * 
         * @return the integer remainders of dividing the size by the value
         * as a new size
         */
        modulo(value: number): Size

        /** 
         * The modulo operator returns the integer remainders of dividing the size
         * by the supplied size as a new size.
         * 
         * @return the integer remainders of dividing the sizes by each
         * other as a new size
         */
        modulo(size: SizeLike): Size

        /** 
         * Checks if this size has both the width and height set to 0.
         * 
         * @return true if both width and height are 0
         */
        isZero(): boolean

        /** 
         * Checks if the width or the height of the size are NaN.
         * 
         * @return true if the width or height of the size are NaN
         */
        isNaN(): boolean

        /** 
         * Returns a new size with rounded {@link #width} and {@link #height}
         * values. The object itself is not modified!
         */
        round(): Size

        /** 
         * Returns a new size with the nearest greater non-fractional values to the
         * specified {@link #width} and {@link #height} values. The object itself is
         * not modified!
         */
        ceil(): Size

        /** 
         * Returns a new size with the nearest smaller non-fractional values to the
         * specified {@link #width} and {@link #height} values. The object itself is
         * not modified!
         */
        floor(): Size

        /** 
         * Returns a new size with the absolute values of the specified
         * {@link #width} and {@link #height} values. The object itself is not
         * modified!
         */
        abs(): Size

        /** 
         * Returns a new size object with the smallest {@link #width} and
         * {@link #height} of the supplied sizes.
         * 
         * @return the newly created size object
         */
        static min(size1: SizeLike, size2: SizeLike): Size

        /** 
         * Returns a new size object with the largest {@link #width} and
         * {@link #height} of the supplied sizes.
         * 
         * @return the newly created size object
         */
        static max(size1: SizeLike, size2: SizeLike): Size

        /** 
         * Returns a size object with random {@link #width} and {@link #height}
         * values between `0` and `1`.
         * 
         * @return the newly created size object
         */
        static random(): Size

    }

    /** 
     * Style is used for changing the visual styles of items
     * contained within a Paper.js project and is returned by
     * {@link Item#style} and {@link Project#currentStyle}.
     * 
     * All properties of Style are also reflected directly in {@link Item},
     * i.e.: {@link Item#fillColor}.
     * 
     * To set multiple style properties in one go, you can pass an object to
     * {@link Item#style}. This is a convenient way to define a style once and
     * apply it to a series of items:
     */
    class Style  {
        /** 
         * The view that this style belongs to.
         */
        readonly view: View

        /** 
         * The color of the stroke.
         */
        strokeColor: Color | null

        /** 
         * The width of the stroke.
         */
        strokeWidth: number

        /** 
         * The shape to be used at the beginning and end of open {@link Path} items,
         * when they have a stroke.
         */
        strokeCap: string

        /** 
         * The shape to be used at the segments and corners of {@link Path} items
         * when they have a stroke.
         */
        strokeJoin: string

        /** 
         * Specifies whether the stroke is to be drawn taking the current affine
         * transformation into account (the default behavior), or whether it should
         * appear as a non-scaling stroke.
         */
        strokeScaling: boolean

        /** 
         * The dash offset of the stroke.
         */
        dashOffset: number

        /** 
         * Specifies an array containing the dash and gap lengths of the stroke.
         */
        dashArray: number[]

        /** 
         * The miter limit of the stroke. When two line segments meet at a sharp
         * angle and miter joins have been specified for {@link #strokeJoin}, it is
         * possible for the miter to extend far beyond the {@link #strokeWidth} of
         * the path. The miterLimit imposes a limit on the ratio of the miter length
         * to the {@link #strokeWidth}.
         */
        miterLimit: number

        /** 
         * The fill color.
         */
        fillColor: Color | null

        /** 
         * The fill-rule with which the shape gets filled. Please note that only
         * modern browsers support fill-rules other than `'nonzero'`.
         */
        fillRule: string

        /** 
         * The shadow color.
         */
        shadowColor: Color | null

        /** 
         * The shadow's blur radius.
         */
        shadowBlur: number

        /** 
         * The shadow's offset.
         */
        shadowOffset: Point

        /** 
         * The color the item is highlighted with when selected. If the item does
         * not specify its own color, the color defined by its layer is used instead.
         */
        selectedColor: Color | null

        /** 
         * The font-family to be used in text content.
         */
        fontFamily: string

        /** 
         * The font-weight to be used in text content.
         */
        fontWeight: string | number

        /** 
         * The font size of text content, as a number in pixels, or as a string with
         * optional units `'px'`, `'pt'` and `'em'`.
         */
        fontSize: number | string

        /** 
         * The text leading of text content.
         */
        leading: number | string

        /** 
         * The justification of text paragraphs.
         */
        justification: string


        /** 
         * Style objects don't need to be created directly. Just pass an object to
         * {@link Item#style} or {@link Project#currentStyle}, it will be converted
         * to a Style object internally.
         */
        constructor(style: object)

    }

    /** 
     * Symbols allow you to place multiple instances of an item in your
     * project. This can save memory, since all instances of a symbol simply refer
     * to the original item and it can speed up moving around complex objects, since
     * internal properties such as segment lists and gradient positions don't need
     * to be updated with every transformation.
     */
    class SymbolDefinition  {
        /** 
         * The project that this symbol belongs to.
         */
        readonly project: Project

        /** 
         * The item used as the symbol's definition.
         */
        item: Item


        /** 
         * Creates a Symbol definition.
         * 
         * @param item - the source item which is removed from the scene graph
         *     and becomes the symbol's definition.
         */
        constructor(item: Item, dontCenter?: boolean)

        /** 
         * Places in instance of the symbol in the project.
         * 
         * @param position - the position of the placed symbol
         */
        place(position?: PointLike): SymbolItem

        /** 
         * Returns a copy of the symbol.
         */
        clone(): SymbolDefinition

        /** 
         * Checks whether the symbol's definition is equal to the supplied symbol.
         * 
         * @return true if they are equal
         */
        equals(symbol: SymbolDefinition): boolean

    }

    /** 
     * A symbol item represents an instance of a symbol which has been
     * placed in a Paper.js project.
     */
    class SymbolItem extends Item {
        /** 
         * The symbol definition that the placed symbol refers to.
         */
        definition: SymbolDefinition


        /** 
         * Creates a new symbol item.
         * 
         * @param definition - the definition to place or an
         *     item to place as a symbol
         * @param point - the center point of the placed symbol
         */
        constructor(definition: SymbolDefinition | Item, point?: PointLike)

    }

    /** 
     * The TextItem type allows you to create typography. Its functionality
     *     is inherited by different text item types such as {@link PointText}, and
     *     {@link AreaText} (coming soon). They each add a layer of functionality
     *     that is unique to their type, but share the underlying properties and
     *     functions that they inherit from TextItem.
     */
    class TextItem extends Item {
        /** 
         * The text contents of the text item.
         */
        content: string

        /** 
         * The font-family to be used in text content.
         */
        fontFamily: string

        /** 
         * The font-weight to be used in text content.
         */
        fontWeight: string | number

        /** 
         * The font size of text content, as a number in pixels, or as a string with
         * optional units `'px'`, `'pt'` and `'em'`.
         */
        fontSize: number | string

        /** 
         * The text leading of text content.
         */
        leading: number | string

        /** 
         * The justification of text paragraphs.
         */
        justification: string


    }

    /** 
     * The Tool object refers to a script that the user can interact with by
     *     using the mouse and keyboard and can be accessed through the global
     *     `tool` variable. All its properties are also available in the paper
     *     scope.
     * 
     * The global `tool` variable only exists in scripts that contain mouse handler
     * functions ({@link #onMouseMove}, {@link #onMouseDown}, {@link #onMouseDrag},
     * {@link #onMouseUp}) or a keyboard handler function ({@link #onKeyDown},
     * {@link #onKeyUp}).
     */
    class Tool  {
        /** 
         * The minimum distance the mouse has to drag before firing the onMouseDrag
         * event, since the last onMouseDrag event.
         */
        minDistance: number

        /** 
         * The maximum distance the mouse has to drag before firing the onMouseDrag
         * event, since the last onMouseDrag event.
         */
        maxDistance: number

        
        fixedDistance: number

        /** 
         * The function to be called when the mouse button is pushed down. The
         * function receives a {@link ToolEvent} object which contains information
         * about the tool event.
         */
        onMouseDown: Function | null

        /** 
         * The function to be called when the mouse position changes while the mouse
         * is being dragged. The function receives a {@link ToolEvent} object which
         * contains information about the tool event.
         */
        onMouseDrag: Function | null

        /** 
         * The function to be called the mouse moves within the project view. The
         * function receives a {@link ToolEvent} object which contains information
         * about the tool event.
         */
        onMouseMove: Function | null

        /** 
         * The function to be called when the mouse button is released. The function
         * receives a {@link ToolEvent} object which contains information about the
         * tool event.
         */
        onMouseUp: Function | null

        /** 
         * The function to be called when the user presses a key on the keyboard.
         * The function receives a {@link KeyEvent} object which contains
         * information about the keyboard event.
         * 
         * If the function returns `false`, the keyboard event will be prevented
         * from bubbling up. This can be used for example to stop the window from
         * scrolling, when you need the user to interact with arrow keys.
         */
        onKeyDown: Function | null

        /** 
         * The function to be called when the user releases a key on the keyboard.
         * The function receives a {@link KeyEvent} object which contains
         * information about the keyboard event.
         * 
         * If the function returns `false`, the keyboard event will be prevented
         * from bubbling up. This can be used for example to stop the window from
         * scrolling, when you need the user to interact with arrow keys.
         */
        onKeyUp: Function | null


        /** 
         * Activates this tool, meaning {@link PaperScope#tool} will
         * point to it and it will be the one that receives tool events.
         */
        activate(): void

        /** 
         * Removes this tool from the {@link PaperScope#tools} list.
         */
        remove(): void

        /** 
         * Attach an event handler to the tool.
         * 
         * @param type - the event type: {@values 'mousedown', 'mouseup',
         *     'mousedrag', 'mousemove', 'keydown', 'keyup'}
         * @param function - the function to be called when the event
         *     occurs, receiving a {@link ToolEvent} object as its sole argument
         * 
         * @return this tool itself, so calls can be chained
         */
        on(type: string, callback: Function): Tool

        /** 
         * Attach one or more event handlers to the tool.
         * 
         * @param param - an object literal containing one or more of the
         *     following properties: {@values mousedown, mouseup, mousedrag,
         *     mousemove, keydown, keyup}
         * 
         * @return this tool itself, so calls can be chained
         */
        on(param: object): Tool

        /** 
         * Detach an event handler from the tool.
         * 
         * @param type - the event type: {@values 'mousedown', 'mouseup',
         *     'mousedrag', 'mousemove', 'keydown', 'keyup'}
         * @param function - the function to be detached
         * 
         * @return this tool itself, so calls can be chained
         */
        off(type: string, callback: Function): Tool

        /** 
         * Detach one or more event handlers from the tool.
         * 
         * @param param - an object literal containing one or more of the
         *     following properties: {@values mousedown, mouseup, mousedrag,
         *     mousemove, keydown, keyup}
         * 
         * @return this tool itself, so calls can be chained
         */
        off(param: object): Tool

        /** 
         * Emit an event on the tool.
         * 
         * @param type - the event type: {@values 'mousedown', 'mouseup',
         *     'mousedrag', 'mousemove', 'keydown', 'keyup'}
         * @param event - an object literal containing properties describing
         * the event
         * 
         * @return true if the event had listeners
         */
        emit(type: string, event: object): boolean

        /** 
         * Check if the tool has one or more event handlers of the specified type.
         * 
         * @param type - the event type: {@values 'mousedown', 'mouseup',
         *     'mousedrag', 'mousemove', 'keydown', 'keyup'}
         * 
         * @return true if the tool has one or more event handlers of
         * the specified type
         */
        responds(type: string): boolean

    }

    /** 
     * ToolEvent The ToolEvent object is received by the {@link Tool}'s mouse
     * event handlers {@link Tool#onMouseDown}, {@link Tool#onMouseDrag},
     * {@link Tool#onMouseMove} and {@link Tool#onMouseUp}. The ToolEvent
     * object is the only parameter passed to these functions and contains
     * information about the mouse event.
     */
    class ToolEvent extends Event {
        /** 
         * The type of tool event.
         */
        type: string

        /** 
         * The position of the mouse in project coordinates when the event was
         * fired.
         */
        point: Point

        /** 
         * The position of the mouse in project coordinates when the previous
         * event was fired.
         */
        lastPoint: Point

        /** 
         * The position of the mouse in project coordinates when the mouse button
         * was last clicked.
         */
        downPoint: Point

        /** 
         * The point in the middle between {@link #lastPoint} and
         * {@link #point}. This is a useful position to use when creating
         * artwork based on the moving direction of the mouse, as returned by
         * {@link #delta}.
         */
        middlePoint: Point

        /** 
         * The difference between the current position and the last position of the
         * mouse when the event was fired. In case of the mouseup event, the
         * difference to the mousedown position is returned.
         */
        delta: Point

        /** 
         * The number of times the mouse event was fired.
         */
        count: number

        /** 
         * The item at the position of the mouse (if any).
         * 
         * If the item is contained within one or more {@link Group} or
         * {@link CompoundPath} items, the most top level group or compound path
         * that it is contained within is returned.
         */
        item: Item


        /** 
         * @return a string representation of the tool event
         */
        toString(): string

    }

    /** 
     * Allows tweening `Object` properties between two states for a given
     * duration. To tween properties on Paper.js {@link Item} instances,
     * {@link Item#tween} can be used, which returns created
     * tween instance.
     * 
     * @see Item#tween(from, to, options)
     * @see Item#tween(to, options)
     * @see Item#tween(options)
     * @see Item#tweenTo(to, options)
     * @see Item#tweenFrom(from, options)
     */
    class Tween  {
        /** 
         * The function to be called when the tween is updated. It receives an
         * object as its sole argument, containing the current progress of the
         * tweening and the factor calculated by the easing function.
         */
        onUpdate: Function | null


        /** 
         * Creates a new tween.
         * 
         * @param object - the object to tween the properties on
         * @param from - the state at the start of the tweening
         * @param to - the state at the end of the tweening
         * @param duration - the duration of the tweening
         * @param easing - the type of the easing
         *     function or the easing function
         * @param start - whether to start tweening automatically
         */
        constructor(object: object, from: object, to: object, duration: number, easing?: string | Function, start?: boolean)

        /** 
         * Set a function that will be executed when the tween completes.
         * 
         * @param function - the function to execute when the tween
         *     completes
         */
        then(callback: Function): Tween

        /** 
         * Start tweening.
         */
        start(): Tween

        /** 
         * Stop tweening.
         */
        stop(): Tween

    }

    /** 
     * The View object wraps an HTML element and handles drawing and user
     * interaction through mouse and keyboard for it. It offer means to scroll the
     * view, find the currently visible bounds in project coordinates, or the
     * center, both useful for constructing artwork that should appear centered on
     * screen.
     */
    class View  {
        /** 
         * Controls whether the view is automatically updated in the next animation
         * frame on changes, or whether you prefer to manually call
         * {@link #update} or {@link #requestUpdate} after changes.
         * Note that this is `true` by default, except for Node.js, where manual
         * updates make more sense.
         */
        autoUpdate: boolean

        /** 
         * The underlying native element.
         */
        readonly element: HTMLCanvasElement

        /** 
         * The ratio between physical pixels and device-independent pixels (DIPs)
         * of the underlying canvas / device.
         * It is `1` for normal displays, and `2` or more for
         * high-resolution displays.
         */
        readonly pixelRatio: number

        /** 
         * The resoltuion of the underlying canvas / device in pixel per inch (DPI).
         * It is `72` for normal displays, and `144` for high-resolution
         * displays with a pixel-ratio of `2`.
         */
        readonly resolution: number

        /** 
         * The size of the view. Changing the view's size will resize it's
         * underlying element.
         */
        viewSize: Size

        /** 
         * The bounds of the currently visible area in project coordinates.
         */
        readonly bounds: Rectangle

        /** 
         * The size of the visible area in project coordinates.
         */
        readonly size: Size

        /** 
         * The center of the visible area in project coordinates.
         */
        center: Point

        /** 
         * The view's zoom factor by which the project coordinates are magnified.
         * 
         * @see #scaling
         */
        zoom: number

        /** 
         * The current rotation angle of the view, as described by its
         * {@link #matrix}.
         */
        rotation: number

        /** 
         * The current scale factor of the view, as described by its
         * {@link #matrix}.
         * 
         * @see #zoom
         */
        scaling: Point

        /** 
         * The view's transformation matrix, defining the view onto the project's
         * contents (position, zoom level, rotation, etc).
         */
        matrix: Matrix

        /** 
         * Handler function to be called on each frame of an animation.
         * The function receives an event object which contains information about
         * the frame event:
         * 
         * @see Item#onFrame
         * 
         * @option event.count {Number} the number of times the frame event was
         * fired
         * @option event.time {Number} the total amount of time passed since the
         * first frame event in seconds
         * @option event.delta {Number} the time passed in seconds since the last
         * frame event
         */
        onFrame: Function | null

        /** 
         * Handler function that is called whenever a view is resized.
         */
        onResize: Function | null

        /** 
         * The function to be called when the mouse button is pushed down on the
         * view. The function receives a {@link MouseEvent} object which contains
         * information about the mouse event.
         * Note that such mouse events bubble up the scene graph hierarchy, reaching
         * the view at the end, unless they are stopped before with {@link
         * Event#stopPropagation()} or by returning `false` from a handler.
         * 
         * @see Item#onMouseDown
         */
        onMouseDown: Function | null

        /** 
         * The function to be called when the mouse position changes while the mouse
         * is being dragged over the view. The function receives a {@link
         * MouseEvent} object which contains information about the mouse event.
         * Note that such mouse events bubble up the scene graph hierarchy, reaching
         * the view at the end, unless they are stopped before with {@link
         * Event#stopPropagation()} or by returning `false` from a handler.
         * 
         * @see Item#onMouseDrag
         */
        onMouseDrag: Function | null

        /** 
         * The function to be called when the mouse button is released over the item.
         * The function receives a {@link MouseEvent} object which contains
         * information about the mouse event.
         * 
         * @see Item#onMouseUp
         */
        onMouseUp: Function | null

        /** 
         * The function to be called when the mouse clicks on the view. The function
         * receives a {@link MouseEvent} object which contains information about the
         * mouse event.
         * Note that such mouse events bubble up the scene graph hierarchy, reaching
         * the view at the end, unless they are stopped before with {@link
         * Event#stopPropagation()} or by returning `false` from a handler.
         * 
         * @see Item#onClick
         */
        onClick: Function | null

        /** 
         * The function to be called when the mouse double clicks on the view. The
         * function receives a {@link MouseEvent} object which contains information
         * about the mouse event.
         * Note that such mouse events bubble up the scene graph hierarchy, reaching
         * the view at the end, unless they are stopped before with {@link
         * Event#stopPropagation()} or by returning `false` from a handler.
         * 
         * @see Item#onDoubleClick
         */
        onDoubleClick: Function | null

        /** 
         * The function to be called repeatedly while the mouse moves over the
         * view. The function receives a {@link MouseEvent} object which contains
         * information about the mouse event.
         * Note that such mouse events bubble up the scene graph hierarchy, reaching
         * the view at the end, unless they are stopped before with {@link
         * Event#stopPropagation()} or by returning `false` from a handler.
         * 
         * @see Item#onMouseMove
         */
        onMouseMove: Function | null

        /** 
         * The function to be called when the mouse moves over the view. This
         * function will only be called again, once the mouse moved outside of the
         * view first. The function receives a {@link MouseEvent} object which
         * contains information about the mouse event.
         * Note that such mouse events bubble up the scene graph hierarchy, reaching
         * the view at the end, unless they are stopped before with {@link
         * Event#stopPropagation()} or by returning `false` from a handler.
         * 
         * @see Item#onMouseEnter
         */
        onMouseEnter: Function | null

        /** 
         * The function to be called when the mouse moves out of the view.
         * The function receives a {@link MouseEvent} object which contains
         * information about the mouse event.
         * Note that such mouse events bubble up the scene graph hierarchy, reaching
         * the view at the end, unless they are stopped before with {@link
         * Event#stopPropagation()} or by returning `false` from a handler.
         * 
         * @see View#onMouseLeave
         */
        onMouseLeave: Function | null


        /** 
         * Removes this view from the project and frees the associated element.
         */
        remove(): void

        /** 
         * Updates the view if there are changes. Note that when using built-in
         * event hanlders for interaction, animation and load events, this method is
         * invoked for you automatically at the end.
         * 
         * @return true if the view was updated
         */
        update(): boolean

        /** 
         * Requests an update of the view if there are changes through the browser's
         * requestAnimationFrame() mechanism for smooth animation. Note that when
         * using built-in event handlers for interaction, animation and load events,
         * updates are automatically invoked for you automatically at the end.
         */
        requestUpdate(): void

        /** 
         * Makes all animation play by adding the view to the request animation
         * loop.
         */
        play(): void

        /** 
         * Makes all animation pause by removing the view from the request animation
         * loop.
         */
        pause(): void

        /** 
         * Checks whether the view is currently visible within the current browser
         * viewport.
         * 
         * @return true if the view is visible
         */
        isVisible(): boolean

        /** 
         * Checks whether the view is inserted into the browser DOM.
         * 
         * @return true if the view is inserted
         */
        isInserted(): boolean

        /** 
         * Translates (scrolls) the view by the given offset vector.
         * 
         * @param delta - the offset to translate the view by
         */
        translate(delta: PointLike): void

        /** 
         * Rotates the view by a given angle around the given center point.
         * 
         * Angles are oriented clockwise and measured in degrees.
         * 
         * @see Matrix#rotate(angle[, center])
         * 
         * @param angle - the rotation angle
         */
        rotate(angle: number, center?: PointLike): void

        /** 
         * Scales the view by the given value from its center point, or optionally
         * from a supplied point.
         * 
         * @param scale - the scale factor
         */
        scale(scale: number, center?: PointLike): void

        /** 
         * Scales the view by the given values from its center point, or optionally
         * from a supplied point.
         * 
         * @param hor - the horizontal scale factor
         * @param ver - the vertical scale factor
         */
        scale(hor: number, ver: number, center?: PointLike): void

        /** 
         * Shears the view by the given value from its center point, or optionally
         * by a supplied point.
         * 
         * @see Matrix#shear(shear[, center])
         * 
         * @param shear - the horizontal and vertical shear factors as a point
         */
        shear(shear: PointLike, center?: PointLike): void

        /** 
         * Shears the view by the given values from its center point, or optionally
         * by a supplied point.
         * 
         * @see Matrix#shear(hor, ver[, center])
         * 
         * @param hor - the horizontal shear factor
         * @param ver - the vertical shear factor
         */
        shear(hor: number, ver: number, center?: PointLike): void

        /** 
         * Skews the view by the given angles from its center point, or optionally
         * by a supplied point.
         * 
         * @see Matrix#shear(skew[, center])
         * 
         * @param skew - the horizontal and vertical skew angles in degrees
         */
        skew(skew: PointLike, center?: PointLike): void

        /** 
         * Skews the view by the given angles from its center point, or optionally
         * by a supplied point.
         * 
         * @see Matrix#shear(hor, ver[, center])
         * 
         * @param hor - the horizontal skew angle in degrees
         * @param ver - the vertical sskew angle in degrees
         */
        skew(hor: number, ver: number, center?: PointLike): void

        /** 
         * Transform the view.
         * 
         * @param matrix - the matrix by which the view shall be transformed
         */
        transform(matrix: Matrix): void

        /** 
         * Converts the passed point from project coordinate space to view
         * coordinate space, which is measured in browser pixels in relation to the
         * position of the view element.
         * 
         * @param point - the point in project coordinates to be converted
         * 
         * @return the point converted into view coordinates
         */
        projectToView(point: PointLike): Point

        /** 
         * Converts the passed point from view coordinate space to project
         * coordinate space.
         * 
         * @param point - the point in view coordinates to be converted
         * 
         * @return the point converted into project coordinates
         */
        viewToProject(point: PointLike): Point

        /** 
         * Determines and returns the event location in project coordinate space.
         * 
         * @param event - the native event object for which to determine the
         *     location.
         * 
         * @return the event point in project coordinates.
         */
        getEventPoint(event: Event): Point

        /** 
         * Attach an event handler to the view.
         * 
         * @param type - the type of event: {@values 'frame', 'resize',
         *     'mousedown', 'mouseup', 'mousedrag', 'click', 'doubleclick',
         *     'mousemove', 'mouseenter', 'mouseleave'}
         * @param function - the function to be called when the event
         *     occurs, receiving a {@link MouseEvent} or {@link Event} object as its
         *     sole argument
         * 
         * @return this view itself, so calls can be chained
         */
        on(type: string, callback: Function): View

        /** 
         * Attach one or more event handlers to the view.
         * 
         * @param param - an object literal containing one or more of the
         *     following properties: {@values frame, resize}
         * 
         * @return this view itself, so calls can be chained
         */
        on(param: object): View

        /** 
         * Detach an event handler from the view.
         * 
         * @param type - the event type: {@values 'frame', 'resize',
         *     'mousedown', 'mouseup', 'mousedrag', 'click', 'doubleclick',
         *     'mousemove', 'mouseenter', 'mouseleave'}
         * @param function - the function to be detached
         * 
         * @return this view itself, so calls can be chained
         */
        off(type: string, callback: Function): View

        /** 
         * Detach one or more event handlers from the view.
         * 
         * @param param - an object literal containing one or more of the
         *     following properties: {@values frame, resize}
         * 
         * @return this view itself, so calls can be chained
         */
        off(param: object): View

        /** 
         * Emit an event on the view.
         * 
         * @param type - the event type: {@values 'frame', 'resize',
         *     'mousedown', 'mouseup', 'mousedrag', 'click', 'doubleclick',
         *     'mousemove', 'mouseenter', 'mouseleave'}
         * @param event - an object literal containing properties describing
         * the event
         * 
         * @return true if the event had listeners
         */
        emit(type: string, event: object): boolean

        /** 
         * Check if the view has one or more event handlers of the specified type.
         * 
         * @param type - the event type: {@values 'frame', 'resize',
         *     'mousedown', 'mouseup', 'mousedrag', 'click', 'doubleclick',
         *     'mousemove', 'mouseenter', 'mouseleave'}
         * 
         * @return true if the view has one or more event handlers of
         * the specified type
         */
        responds(type: string): boolean

    }
}


declare module 'paper/dist/paper-core'
{
    const paperCore: Pick<paper.PaperScope, Exclude<keyof paper.PaperScope, 'PaperScript'>>;
    export = paperCore
}

declare module 'paper'
{
    const paperFull: paper.PaperScope;
    export = paperFull
}

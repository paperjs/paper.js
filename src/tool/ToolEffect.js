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

/**
 * @name ToolEffect
 *
 * @class An effect that draws the paths that it gets with a mouse tool, as if
 * drawn by hand along them: the tool receives the mouse events of a hand that
 * moves at most at its `speed`, slows down in turns as a car does with its
 * `grip`, and changes its speed with its `acceleration`, see
 * {@link #initialize(props)}. What the tool draws is the output. The events
 * also have the `path` that the hand draws along, and the `effect` instance
 * with its parameters.
 *
 * @extends Effect
 *
 * @example
 * // Draws a circle at every step of the hand:
 * new ToolEffect({
 *     type: 'dots',
 *     tool: {
 *         minDistance: 10,
 *         onMouseDrag: function(event) {
 *             new Path.Circle({
 *                 center: event.point,
 *                 radius: event.delta.length / 2,
 *                 fillColor: event.path.strokeColor
 *             });
 *         }
 *     }
 * });
 */
var ToolEffect = Effect.extend(new function() {
    // Sends the tool the mouse events of a hand drawing the path:
    function draw(tool, path, instance) {
        var parameters = instance._parameters,
            props = { path: path, effect: instance },
            length = path.getLength(),
            frame = 1 / 60,
            count = Math.max(1, Math.ceil(length / 2)),
            step = length / count,
            speeds = [],
            times = [0];

        function getSpeed(index) {
            // As a car in a turn of radius r: v = √(μ · r · g)
            var curvature = Math.abs(path.getCurvatureAt(index * step) || 0);
            return Math.min(parameters.speed, curvature
                    ? Math.sqrt(parameters.grip / curvature) : Infinity);
        }

        // Limits the speeds by how fast the hand can reach and leave them, from
        // the start on and from the end back:
        function accelerate(from, to, direction) {
            for (var i = from; i !== to; i += direction) {
                speeds[i + direction] = Math.min(speeds[i + direction],
                        Math.sqrt(speeds[i] * speeds[i]
                            + 2 * parameters.acceleration * step));
            }
        }

        function emit(type, time, offset) {
            var mouse = {};
            mouse[type.substr(5)] = true;
            tool._handleMouseEvent(type, {
                timeStamp: time * 1000,
                preventDefault: function() {},
                stopPropagation: function() {}
            }, path.getPointAt(Math.min(offset, length)), mouse, props);
        }

        for (var i = 0; i <= count; i++)
            speeds.push(getSpeed(i));
        // Without a limit to the acceleration, it starts and stops in motion:
        if (parameters.acceleration < Infinity) {
            speeds[0] = speeds[count] = 0;
            accelerate(0, count, 1);
            accelerate(count, 0, -1);
        }
        // The times at the steps, from the average speeds between them:
        for (var i = 1; i <= count; i++) {
            var speed = (speeds[i - 1] + speeds[i]) / 2;
            times.push(times[i - 1] + (speed > 0 ? step / speed : 0));
        }
        emit('mousedown', 0, 0);
        // The positions of the hand at each frame, between the steps:
        for (var i = 1, time = frame; i <= count; time += frame) {
            while (i < count && times[i] < time)
                i++;
            var t0 = times[i - 1],
                t1 = times[i],
                fraction = t1 > t0 ? Math.min((time - t0) / (t1 - t0), 1) : 1;
            if (time >= times[count]) {
                emit('mousedrag', times[count], length);
                break;
            }
            emit('mousedrag', time, (i - 1 + fraction) * step);
        }
        emit('mouseup', times[count], length);
    }

    // Plays the tool along each path, with this as the instance:
    function apply(event) {
        var art = event.art,
            tool = this.getEffect()._tool,
            parameters = this._parameters,
            project = paper.project,
            random = Math.random,
            seed = Math.abs(Math.floor(parameters.seed)) % 2147483646 + 1,
            paths = art instanceof Path ? [art]
                : art.getItems({ class: Path }),
            output = new Group({ insert: false }),
            created = null,
            scratch;
        try {
            // The tool draws into a project of its own, so that what it
            // creates doesn't land in the document, and with the same random
            // numbers each time:
            Math.random = function() {
                seed = seed * 16807 % 2147483647;
                return (seed - 1) / 2147483646;
            };
            scratch = new Project();
            if (!(tool instanceof Tool))
                tool = created = new Tool(tool);
            for (var i = 0, l = paths.length; i < l; i++)
                draw(tool, paths[i], this);
            var layer = scratch._children[0];
            if (layer)
                output.addChildren(layer.removeChildren());
        } finally {
            Math.random = random;
            if (created)
                created.remove();
            if (scratch)
                scratch.remove();
            if (project)
                project.activate();
        }
        return output;
    }

    return /** @lends ToolEffect# */{
        _class: 'ToolEffect',

        /**
         * Creates a tool effect and registers it under its type, as
         * {@link Effect} does, with the `tool` that draws it. The effect
         * declares the parameters of the hand in addition to its own: `speed`,
         * the fastest the hand moves in points per second (`300`), `grip`,
         * how fast it takes turns: in a turn of radius r, it moves at most at
         * the square root of r times the grip (`2000`), `acceleration`, how
         * fast it changes its speed in points per second squared (`3000`),
         * and `seed`, the seed of the random numbers that the tool gets from
         * `Math.random()`, so that it draws the same each time (`1`).
         *
         * @param {Object} props the properties of {@link Effect}, and the
         *     `tool`, or a plain object with its handlers and distances, that
         *     the effect creates a tool from each time it applies
         */
        initialize: function ToolEffect(props) {
            this._tool = props.tool;
            Effect.call(this, Base.set({}, props, {
                parameters: Base.set({
                    speed: { label: 'Speed', type: 'number', value: 300 },
                    grip: { label: 'Grip', type: 'number', value: 2000 },
                    acceleration: {
                        label: 'Acceleration', type: 'number', value: 3000
                    },
                    seed: { label: 'Seed', type: 'number', value: 1 }
                }, props.parameters),
                onApply: apply
            }));
        },

        /**
         * The tool that draws the effect, or the plain object that it creates
         * one from.
         *
         * @bean
         * @type Tool|Object
         */
        getTool: function() {
            return this._tool;
        }
    };
});

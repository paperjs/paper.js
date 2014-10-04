/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2014, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

 /**
  * @name Component
  * @class
  */
var Component = Base.extend(Callback, /** @lends Component# */{
    _class: 'Component',
    _events: [ 'onChange', 'onClick' ],

    // DOCS: All!

    // Meta-information, by type. This is stored in _meta on the components.
    _types: {
        'boolean': {
            type: 'checkbox',
            value: 'checked'
        },

        string: {
            type: 'text'
        },

        number: {
            type: 'number',
            number: true
        },

        button: {
            type: 'button'
        },

        text: {
            tag: 'div',
            // This will return the native textContent through DomElement.get():
            value: 'text'
        },

        slider: {
            type: 'range',
            number: true
        },

        list: {
            tag: 'select',

            setOptions: function() {
                DomElement.removeChildren(this._input);
                DomElement.create(Base.each(this._options, function(option) {
                    this.push('option', { value: option, text: option });
                }, []), this._input);
            }
        },

        color: {
            type: 'color',

            getValue: function(value) {
                // Always convert internal string representation back to a
                // paper.js color object.
                return new Color(value);
            },

            setValue: function(value) {
                // Only enfore hex values if the input field is indeed of
                // color type. This allows sketch.paperjs.org to plug in
                // the Spectrum.js library with alpha support.
                return new Color(value).toCSS(
                        DomElement.get(this._input, 'type') === 'color');
            }
        }
    },

    // Default values for internals
    _visible: true,
    _enabled: true,

    initialize: function Component(palette, parent, name, props, values, row) {
        if (!name)
            name = 'component-' + this._id;
        var value = Base.pick(values[name], props.value);
        this._id = Component._id = (Component._id || 0) + 1;
        this._palette = palette;
        this._parent = parent;
        this._name = name;
        // The row within which this component is contained. This can be a
        // shared row, e.g. when the parent component has a columns layout.
        this._row = row;
        var type = this._type = props.type in this._types
                ? props.type
                : 'options' in props
                    ? 'list'
                    : 'onClick' in props
                        ? 'button'
                        : value !== undefined
                            ? typeof value
                            : undefined,
            meta = this._meta = this._types[type] || { type: type },
            create = DomElement.create,
            element,
            className;
        if (!type) {
            // No type defined, so we're dealing with a layout component that
            // contains nested child components. See if they are to be aligned
            // as columns or rows, and lay things out accordingly.
            var columns = props.columns,
                // On the root element, we need to create the table and row even
                // if it's a columns layout.
                table = this._table = !(columns && row) && DomElement.create(
                    'table', { class: 'palettejs-pane' }, [ 'tbody' ]),
                tbody = this._tbody = table && table.firstChild,
                components = this._components = {},
                currentRow = row,
                numCells = 0;
            element = row && table;
            className = 'layout-' + (columns ? 'columns' : 'rows');
            this._numCells = 0;
            for (var key in props) {
                var component = props[key];
                if (Base.isPlainObject(component)) {
                    // Create the rows for vertical elements, as well as
                    // columns root elements.
                    if (table && !(columns && currentRow)) {
                        currentRow = DomElement.addChildren(tbody, ['tr', {
                            class: 'palettejs-row',
                            id: 'palettejs-row-' + key
                        }])[0];
                        // Set _row for the columns root element.
                        if (columns)
                            this._row = currentRow;
                    }
                    components[key] = new Component(palette, this, key,
                            component, values, currentRow);
                    // Keep track of the maximum amount of cells per row, so we
                    // can adjust colspan after.
                    numCells = Math.max(numCells, this._numCells);
                    // Do not reset cell counter if all components go to the
                    // same parent row.
                    if (!columns)
                        this._numCells = 0;
                    // Remove the entry now from the object that was provided to
                    // create the component since the leftovers will be injected
                    // into the created component through #_set() below.
                    delete props[key];
                }
            }
            this._numCells = numCells;
            // If aligning things horizontally, we need to tell the parent how
            // many cells there are all together.
            if (columns && parent)
                parent._numCells = numCells;
            Base.each(components, function(component, key) {
                // NOTE: Components with columns layout won't have their _cell
                // set.
                if (numCells > 2 && component._cell && !columns)
                    DomElement.set(component._cell, 'colspan', numCells - 1);
                // Replace each entry in values with getters/setters so we can
                // directly link the value to the component and observe change.
                Base.define(values, key, {
                    enumerable: true,
                    configurable: true,
                    get: function() {
                        return component.getValue();
                    },
                    set: function(val) {
                        component.setValue(val);
                    }
                });
            });
            // Add child components directly to this component, so we can access
            // it through the same path as in the components object literal that
            // was passed.
            Base.set(this, components);
        } else {
            var that = this;
            element = this._input = create(meta.tag || 'input', {
                class: 'palettejs-input',
                id: 'palettejs-input-' + name,
                type: meta.type,
                events: {
                    change: function() {
                        that.setValue(DomElement.get(this,
                                meta.value || 'value'));
                    },
                    click: function() {
                        that.fire('click');
                    }
                }
            });
            className = 'type-' + type;
        }
        if (element) {
            DomElement.addChildren(row, [
                this._labelCell = create('td', {
                    class: 'palettejs-label',
                    id: 'palettejs-label-' + name
                }),
                this._cell = create('td', {
                    class: 'palettejs-component palettejs-' + className,
                    id: 'palettejs-component-' + name
                }, [ element ])
            ]);
            // We just added two cells to the row:
            if (parent)
                parent._numCells += 2;
        }
        this._className = className;

        // Attach default 'change' even that delegates to the palette.
        this.attach('change', function(value) {
            if (!this._dontFire)
                palette.fire('change', this, this._name, value);
        });
        this._dontFire = true;
        // Now that everything is set up, copy over values fro, props.
        // NOTE: This triggers setters, which is why we set _dontFire = true,
        // and why we can only call this after everything else is set up (e.g.
        // setLabel() requires this._labelCell).
        // Exclude name because it's already set, and value since we want to set
        // it after range.
        this._set(props, { name: true, value: true });
        this.setValue(value);
        // Start firing change events after we have initialized.
        this._dontFire = false;
        values[name] = this._defaultValue = this._value;
    },

    getType: function() {
        return this._type;
    },

    getName: function() {
        return this._name;
    },

    getTitle: function() {
        return this._title;
    },

    setTitle: function(title) {
        this._title = title;
        if (this._tbody) {
            var node = this._titleNode;
            if (!node && title) {
                // Create a caption tag, and nest the title in a span inside,
                // so we can offer some more flexibility with CSS on it.
                node = this._titleNode = DomElement.insertBefore(this._tbody, [
                        'caption', [ 'span' ],
                    ]).firstChild;
            } else if (node && !title) {
                DomElement.remove(node);
            }
            DomElement.set(node, 'text', title);
        }
    },

    getPalette: function() {
        return this._palette;
    },

    getParent: function() {
        return this._parent;
    },

    _setLabel: function(label, nodeName, parent) {
        if (parent) {
            this[nodeName] = DomElement.set(
                    this[nodeName] || DomElement.addChild(parent,
                        ['label', { 'for': 'palettejs-input-' + this._name }]),
                    'text', label);
        }
    },

    getLabel: function() {
        return this._label;
    },

    setLabel: function(label) {
        this._label = label;
        this._setLabel(label, '_labelNode', this._labelCell);
    },

    getSuffix: function() {
        return this._suffix;
    },

    setSuffix: function(suffix) {
        this._suffix = suffix;
        this._setLabel(suffix, '_suffixNode', this._cell);
    },

    getOptions: function() {
        return this._options;
    },

    setOptions: function(options) {
        this._options = options;
        var setOptions = this._meta.setOptions;
        if (setOptions)
            setOptions.call(this);
    },

    getValue: function() {
        var value = this._value,
            getValue = this._meta.getValue;
        return getValue ? getValue.call(this, value) : value;
    },

    setValue: function(value) {
        if (this._components)
            return;
        var meta = this._meta,
            key = meta.value || 'value',
            setValue = meta.setValue;
        if (setValue)
            value = setValue.call(this, value);
        DomElement.set(this._input, key, value);
        // Read back and convert from input again, to make sure we're in sync
        value = DomElement.get(this._input, key);
        if (meta.number)
            value = parseFloat(value, 10);
        if (this._value !== value) {
            this._value = value;
            if (!this._dontFire)
                this.fire('change', this.getValue());
        }
    },

    getVisible: function() {
        return this._visible;
    },

    setVisible: function(visible) {
        // NOTE: Only set the visibility of the whole row if this is a row item,
        // in which case this._input is not defined.
        DomElement.toggleClass(this._cell || this._row, 'hidden', !visible);
        DomElement.toggleClass(this._labelCell, 'hidden', !visible);
        this._visible = !!visible;
    },

    getEnabled: function() {
        return this._enabled;
    },

    setEnabled: function(enabled, _fromParent) {
        if (_fromParent) {
            // When called from the parent component, we have to remember the
            // component's previous enabled state when disabling the palette,
            // so we can restore it when enabling the palette again.
            var prev = Base.pick(this._previousEnabled, this._enabled);
            this._previousEnabled = enabled ? undefined : prev; // clear
            enabled = enabled && prev;
        }
        if (this._components) {
            for (var i in this._components)
                this._components[i].setEnabled(enabled, true);
        } else {
            DomElement.set(this._input, 'disabled', !enabled);
        }
        this._enabled = !!enabled;
    },

    getRange: function() {
        return [parseFloat(DomElement.get(this._input, 'min')),
                parseFloat(DomElement.get(this._input, 'max'))];
    },

    setRange: function(min, max) {
        var range = Array.isArray(min) ? min : [min, max];
        DomElement.set(this._input, { min: range[0], max: range[1] });
    },

    getMin: function() {
        return this.getRange()[0];
    },

    setMin: function(min) {
        this.setRange(min, this.getMax());
    },

    getMax: function() {
        return this.getRange()[1];
    },

    setMax: function(max) {
        this.setRange(this.getMin(), max);
    },

    getStep: function() {
        return parseFloat(DomElement.get(this._input, 'step'));
    },

    setStep: function(step) {
        DomElement.set(this._input, 'step', step);
    },

    reset: function() {
        if (this._components) {
            for (var i in this._components)
                this._components[i].reset();
        } else {
            this.setValue(this._defaultValue);
        }
    }
});

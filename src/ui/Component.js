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
        },

        row: {}
    },

    // Default values for internals
    _visible: true,
    _enabled: true,

    initialize: function Component(pane, name, props, value, row, parent) {
        if (value === undefined)
            value = props.value;
        if (!name)
            name = 'component-' + this._id,
        this._id = Component._id = (Component._id || 0) + 1;
        this._pane = pane;
        this._name = name;
        this._row = row;
        this._parent = parent; // The parent component, if any.
        this._nested = !!parent;
        if (!parent)
            DomElement.set(row, 'id', 'palettejs-row-' + name);
        var type = this._type = props.type in this._types
                ? props.type
                : 'options' in props
                    ? 'list'
                    : 'onClick' in props
                        ? 'button'
                        : typeof value,
            meta = this._meta = this._types[type] || { type: type },
            that = this,
            create = DomElement.create;
        if (type === 'row') {
            var components = this._components = [];
            for (var key in props) {
                var entry = props[key];
                if (Base.isPlainObject(entry))
                    components.push(new Component(pane, key, entry,
                            pane._values[key], row, this));
            }
            pane._numCells = Math.max(components.length * 2, pane._numCells || 0);
        } else {
            DomElement.addChildren(row, [
                this._labelCell = create('td', {
                    class: 'palettejs-label',
                    id: 'palettejs-label-' + name
                }),
                this._cell = create('td', {
                    class: 'palettejs-component',
                    id: 'palettejs-component-' + name
                }, [
                    this._input = create(meta.tag || 'input', {
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
                    })
                ])
            ]);
        }
        // Attach default 'change' even that delegates to palette
        this.attach('change', function(value) {
            if (!this._dontFire)
                pane.fire('change', this, this._name, value);
        });
        this._dontFire = true;
        // Now that everything is set up, copy over values fro, props.
        // NOTE: This triggers setters, which is why we set _dontFire = true,
        // and why we can only call this after everything else is set up (e.g.
        // setLabel() requires this._labelCell).
        // Exclude name because it's already set, and value since we want to set
        // it after range.
        Base.set(this, props, { name: true, value: true });
        this.setValue(value);
        // Start firing change events after we have initialized.
        this._dontFire = false;
        //  Store link to component in the pane's components object.
        pane._components[name] = this;
        // Make sure each component has an entry in values also, so observers
        // get installed correctly in the Pane constructor.
        pane._values[name] = this._defaultValue = this._value;
    },

    getType: function() {
        return this._type;
    },

    getName: function() {
        return this._name;
    },

    _setLabel: function(label, nodeName, parent) {
        this[nodeName] = DomElement.set(this[nodeName]
                || parent.appendChild(DomElement.create('label',
                    { 'for': 'palettejs-input-' + this._name })),
                'text', label);
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
        this._setLabel(label, '_suffixNode', this._cell);
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

    setEnabled: function(enabled, _fromPalette) {
        if (_fromPalette) {
            // When called from Palette#setEnabled, we have to remember the
            // component's previous enabled state when disabling the palette,
            // so we can restore it when enabling the palette again.
            var prev = Base.pick(this._previousEnabled, this._enabled);
            this._previousEnabled = enabled ? undefined : prev; // clear
            enabled = enabled && prev;
        }
        if (this._input) {
            DomElement.set(this._input, 'disabled', !enabled);
        } else if (this._components) {
            for (var i = 0; i < this._components.length; i++) {
                this._components[i].setEnabled(enabled, _fromPalette);
            }
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
        this.setValue(this._defaultValue);
    }
});

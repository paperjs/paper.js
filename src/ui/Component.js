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

    initialize: function Component(obj) {
        this._id = Component._id = (Component._id || 0) + 1;
        var type = this._type = obj.type in this._types
            ? obj.type
            : 'options' in obj
                ? 'list'
                : 'onClick' in obj
                    ? 'button'
                    : typeof obj.value,
            meta = this._meta = this._types[type] || { type: type },
            name = this._name = obj.name || 'component-' + this._id,
            that = this;
        this._input = DomElement.create(meta.tag || 'input', {
            id: 'palettejs-input-' + name,
            type: meta.type,
            events: {
                change: function() {
                    that.setValue(
                        DomElement.get(this, meta.value || 'value'));
                },
                click: function() {
                    that.fire('click');
                }
            }
        });
        // Attach default 'change' even that delegates to palette
        this.attach('change', function(value) {
            if (!this._dontFire)
                this._palette.fire('change', this, this._name, value);
        });
        this._element = DomElement.create('tr',
                { class: 'palettejs-row', id: 'palettejs-row-' + name }, [
                    this._labelCell = DomElement.create('td',
                        { class: 'palettejs-label' }),
                    'td', { class: 'palettejs-input' }, [this._input]
               ]);
        this._dontFire = true;
        // Now that everything is set up, copy over values fro obj.
        // NOTE: This triggers setters, which is why we set _dontFire = true,
        // and why we can only call this after everything else is set up (e.g.
        // setLabel() requires this._labelCell).
        Base.set(this, obj);
        this._defaultValue = this._value; // after Base.set, through #setValue()
        // Start firing change events after we have initialized.
        this._dontFire = false;
    },

    getType: function() {
        return this._type;
    },

    getName: function() {
        return this._name;
    },

    getLabel: function() {
        return this._label;
    },

    setLabel: function(label) {
        this._label = label;
        DomElement.set(this._labelNode = this._labelNode
                || this._labelCell.appendChild(DomElement.create('label',
                    { 'for': 'palettejs-input-' + this._name })),
                'text', label);
    },

    getSuffix: function() {
        return this._suffix;
    },

    setSuffix: function(suffix) {
        this._suffix = suffix;
        DomElement.set(this._suffixNode = this._suffixNode
                || this._input.parentNode.appendChild(DomElement.create('label',
                    { 'for': 'palettejs-input-' + this._name })),
                'text', suffix);
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

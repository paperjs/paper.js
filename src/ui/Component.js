/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

var Component = this.Component = Base.extend(Callback, /** @lends Component# */{
	_events: [ 'onChange', 'onClick' ],

	_types: {
		'boolean': {
			type: 'checkbox',
			value: 'checked'
		},

		string: {
			type: 'text'
		},

		number: {
			type: 'number'
		},

		button: {
			type: 'button'
		},

		text: {
			tag: 'div',
			value: 'text'
		},

		slider: {
			type: 'range'
		},

		list: {
			tag: 'select',

			options: function() {
				DomElement.removeChildren(this.element);
				DomElement.create(Base.each(this._options, function(option) {
					this.push('option', { value: option, text: option });
				}, []), this.element);
			},

			value: function(value) {
				DomElement.set(
					DomElement.find('option[value="' + value + '"]', this.element),
					'selected', true);
			}
		}
	},

	initialize: function(obj) {
		this._type = obj.type
			|| ('options' in obj
				? 'list'
				: 'onClick' in obj
					? 'button'
					: typeof value);
		this._info = this._types[this._type] || { type: this._type };
		var that = this,
			fireChange = false;
		this.element = DomElement.create(this._info.tag || 'input', {
			type: this._info.type,
			events: {
				change: function() {
					var key = that._info.value;
					if (typeof key === 'function')
						key = null;
					var value = DomElement.get(that.element, key || 'value');
					if (fireChange) {
						that.palette.fire('change', that, that.name, value);
						that.fire('change', value);
					}
				},
				click: function() {
					that.fire('click');
				}
			}
		});
		Base.each(obj, function(value, key) {
			this[key] = value;
		}, this);
		this._defaultValue = this._value;
		// Only fire change events after we have initalized
		fireChange = true;
	},

	getType: function() {
		return this._type;
	},

	getOptions: function() {
		return this._options;
	},

	setOptions: function(options) {
		this._options = options;
		if (this._info.options)
			this._info.options.call(this);
	},

	getValue: function() {
		return this._value;
	},

	setValue: function(value) {
		var key = this._info.value;
		if (typeof key === 'function')
			key.call(this, value);
		else
			DomElement.set(this.element, key || 'value', value);
		this._value = value;
	},

	getRange: function() {
		return [toFloat(DomElement.get(this.element, 'min')),
				toFloat(DomElement.get(this.element, 'max'))];
	},

	setRange: function(min, max) {
		var range = Array.isArray(min) ? min : [min, max];
		DomElement.set(this.element, { min: range[0], max: range[1] });
	},

	getMin: function() {
		return getRange()[0];
	},

	setMin: function(min) {
		this.setRange(min, getMax());
	},

	getMax: function() {
		return getRange()[1];
	},

	setMax: function(max) {
		this.setRange(getMin(), max);
	},

	getStep: function() {
		return toFloat(DomElement.get(this.element, 'step'));
	},

	setStep: function(step) {
		DomElement.set(this.element, 'step', step);
	},

	reset: function() {
		this.setValue(this._defaultValue);
	}
});
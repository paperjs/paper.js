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
 * @name Base
 * @class
 * @private
 */
// Extend Base with utility functions used across the library.
Base.inject(/** @lends Base# */{
    enumerable: false,

    /**
     * Renders base objects to strings in object literal notation.
     */
    toString: function() {
        return this._id != null
            ?  (this._class || 'Object') + (this._name
                ? " '" + this._name + "'"
                : ' @' + this._id)
            : '{ ' + Base.each(this, function(value, key) {
                // Hide internal properties even if they are enumerable
                if (!/^_/.test(key)) {
                    var type = typeof value;
                    this.push(key + ': ' + (type === 'number'
                            ? Formatter.instance.number(value)
                            : type === 'string' ? "'" + value + "'" : value));
                }
            }, []).join(', ') + ' }';
    },

    /**
     * The class name of the object as a string, if the prototype defines a
     * `_class` value.
     *
     * @bean
     */
    getClassName: function() {
        return this._class || '';
    },

    /**
     * Imports (deserializes) the stored JSON data into the object, if the
     * classes match. If they do not match, a newly created object is returned
     * instead.
     *
     * @param {String} json the JSON data to import from
     */
    importJSON: function(json) {
        return Base.importJSON(json, this);
    },

    /**
     * Exports (serializes) this object to a JSON data object or string.
     *
     * @option [options.asString=true] {Boolean} whether the JSON is returned as
     *     a `Object` or a `String`
     * @option [options.precision=5] {Number} the amount of fractional digits in
     *     numbers used in JSON data
     *
     * @param {Object} [options] the serialization options
     * @return {String} the exported JSON data
     */
    exportJSON: function(options) {
        return Base.exportJSON(this, options);
    },

    // To support JSON.stringify:
    toJSON: function() {
        return Base.serialize(this);
    },

    /**
     * #set() is part of the mechanism for constructors which take one object
     * literal describing all the properties to be set on the created instance.
     * Through {@link Base.filter()} it supports `_filtered`
     * handling as required by the {@link Base.readNamed()} mechanism.
     *
     * @param {Object} props an object describing the properties to set
     * @param {Object} [exclude] an object that can define any properties as
     *     `true` that should be excluded
     * @return {Object} a reference to `this`, for chainability.
     */
    set: function(props, exclude) {
        if (props)
            Base.filter(this, props, exclude, this._prioritize);
        return this;
    }
}, /** @lends Base# */{
// Mess with indentation in order to get more line-space for the statics below.
// Explicitly deactivate the creation of beans, as we have functions here
// that look like bean getters but actually read arguments, see getNamed().
beans: false,
statics: /** @lends Base */{
    // Keep track of all named classes for serialization and exporting.
    exports: {},

    extend: function extend() {
        // Override Base.extend() to register named classes in Base.exports,
        // for deserialization and injection into PaperScope.
        var res = extend.base.apply(this, arguments),
            name = res.prototype._class;
        if (name && !Base.exports[name])
            Base.exports[name] = res;
        return res;
    },

    /**
     * Checks if two values or objects are equals to each other, by using their
     * equals() methods if available, and also comparing elements of arrays and
     * properties of objects.
     */
    equals: function(obj1, obj2) {
        if (obj1 === obj2)
            return true;
        // Call #equals() on both obj1 and obj2
        if (obj1 && obj1.equals)
            return obj1.equals(obj2);
        if (obj2 && obj2.equals)
            return obj2.equals(obj1);
        // Deep compare objects or arrays
        if (obj1 && obj2
                && typeof obj1 === 'object' && typeof obj2 === 'object') {
            // Compare arrays
            if (Array.isArray(obj1) && Array.isArray(obj2)) {
                var length = obj1.length;
                if (length !== obj2.length)
                    return false;
                while (length--) {
                    if (!Base.equals(obj1[length], obj2[length]))
                        return false;
                }
            } else {
                // Deep compare objects.
                var keys = Object.keys(obj1),
                    length = keys.length;
                // Ensure that both objects contain the same number of
                // properties before comparing deep equality.
                if (length !== Object.keys(obj2).length)
                    return false;
                while (length--) {
                    // Deep compare each member
                    var key = keys[length];
                    if (!(obj2.hasOwnProperty(key)
                            && Base.equals(obj1[key], obj2[key])))
                        return false;
                }
            }
            return true;
        }
        return false;
    },

    /**
     * When called on a subclass of Base, it reads arguments of the type of the
     * subclass from the passed arguments list or array, at the given index, up
     * to the specified length. When called directly on Base, it reads any value
     * without conversion from the passed arguments list or array. This is used
     * in argument conversion, e.g. by all basic types (Point, Size, Rectangle)
     * and also higher classes such as Color and Segment.
     *
     * @param {Array} list the list to read from, either an arguments object or
     *     a normal array
     * @param {Number} start the index at which to start reading in the list
     * @param {Object} options `options.readNull` controls whether null is
     *     returned or converted. `options.clone` controls whether passed
     *     objects should be cloned if they are already provided in the required
     *     type
     * @param {Number} length the amount of elements that can be read
     */
    read: function(list, start, options, amount) {
        // See if it's called directly on Base, and if so, read value and return
        // without object conversion.
        if (this === Base) {
            var value = this.peek(list, start);
            list.__index++;
            return value;
        }
        var proto = this.prototype,
            readIndex = proto._readIndex,
            begin = start || readIndex && list.__index || 0,
            length = list.length,
            obj = list[begin];
        amount = amount || length - begin;
        // When read() is called on a sub-class of which the object is already
        // an instance, or when there is only one value in the list and it's
        // null or undefined, return the obj.
        if (obj instanceof this
            || options && options.readNull && obj == null && amount <= 1) {
            if (readIndex)
                list.__index = begin + 1;
            return obj && options && options.clone ? obj.clone() : obj;
        }
        // Otherwise, create a new object and read through its initialize
        // function.
        obj = Base.create(proto);
        if (readIndex)
            obj.__read = true;
        obj = obj.initialize.apply(obj, begin > 0 || begin + amount < length
                ? Base.slice(list, begin, begin + amount)
                : list) || obj;
        if (readIndex) {
            list.__index = begin + obj.__read;
            // This is only in use in Rectangle so far: Nested calls to
            // `Base.readNamed()` would loose __filtered if it wasn't returned
            // on the object.
            var filtered = obj.__filtered;
            if (filtered) {
                list.__filtered = filtered;
                obj.__filtered = undefined;
            }
            obj.__read = undefined;
        }
        return obj;
    },

    /**
     * Allows peeking ahead in reading of values and objects from arguments
     * list through Base.read().
     *
     * @param {Array} list the list to read from, either an arguments object
     * or a normal array
     * @param {Number} start the index at which to start reading in the list
     */
    peek: function(list, start) {
        return list[list.__index = start || list.__index || 0];
    },

    /**
     * Returns how many arguments remain to be read in the argument list.
     */
    remain: function(list) {
        return list.length - (list.__index || 0);
    },

    /**
     * Reads all readable arguments from the list, handling nested arrays
     * separately.
     *
     * @param {Array} list the list to read from, either an arguments object
     *     or a normal array
     * @param {Number} start the index at which to start reading in the list
     * @param {Object} options `options.readNull` controls whether null is
     *     returned or converted. `options.clone` controls whether passed
     *     objects should be cloned if they are already provided in the
     *     required type
     * @param {Number} amount the amount of elements that should be read
     */
    readList: function(list, start, options, amount) {
        var res = [],
            entry,
            begin = start || 0,
            end = amount ? begin + amount : list.length;
        for (var i = begin; i < end; i++) {
            res.push(Array.isArray(entry = list[i])
                    ? this.read(entry, 0, options)
                    : this.read(list, i, options, 1));
        }
        return res;
    },

    /**
     * Allows using of `Base.read()` mechanism in combination with reading named
     * arguments form a passed property object literal. Calling
     * `Base.readNamed()` can read both from such named properties and normal
     * unnamed arguments through `Base.read()`. In use for example for
     * the various `Path` constructors in `Path.Constructors.js`.
     *
     * @param {Array} list the list to read from, either an arguments object or
     *     a normal array
     * @param {String} name the property name to read from
     * @param {Number} start the index at which to start reading in the list
     * @param {Object} options `options.readNull` controls whether null is
     *     returned or converted. `options.clone` controls whether passed
     *     objects should be cloned if they are already provided in the required
     *     type
     * @param {Number} amount the amount of elements that can be read
     */
    readNamed: function(list, name, start, options, amount) {
        var value = this.getNamed(list, name),
            hasValue = value !== undefined;
        if (hasValue) {
            // Create a _filtered object that inherits from `source`, and
            // override all fields that were already read with undefined.
            var filtered = list.__filtered;
            if (!filtered) {
                var source = this.getSource(list);
                filtered = list.__filtered = Base.create(source);
                // Point __unfiltered to the original, so `Base.filter()` can
                // use it to get all keys to iterate over.
                filtered.__unfiltered = source;
            }
            // delete wouldn't work since the masked parent's value would
            // shine through.
            filtered[name] = undefined;
        }
        return this.read(hasValue ? [value] : list, start, options, amount);
    },

    /**
     * If `list[0]` is a source object, calls `Base.readNamed()` for each key in
     * it that is supported on `dest`, consuming these values.
     *
     * @param {Array} list the list to read from, either an arguments object or
     *     a normal array
     * @param {Object} dest the object on which to set the supported properties
     * @return {Boolean} {@true if any property was read from the source object}
     */
    readSupported: function(list, dest) {
        var source = this.getSource(list),
            that = this,
            read = false;
        if (source) {
            // If `source` is a filtered object, we get the keys from the the
            // original object (it's parent / prototype). See _filtered
            // inheritance trick in the argument reading code.
            Object.keys(source).forEach(function(key) {
                if (key in dest) {
                    var value = that.readNamed(list, key);
                    // Due to the _filtered inheritance trick, undefined is used
                    // to mask already consumed named arguments.
                    if (value !== undefined) {
                        dest[key] = value;
                    }
                    read = true;
                }
            });
        }
        return read;
    },

    /**
     * @return the arguments object if the list provides one at `list[0]`
     */
    getSource: function(list) {
        var source = list.__source;
        if (source === undefined) {
            var arg = list.length === 1 && list[0];
            source = list.__source = arg && Base.isPlainObject(arg)
                ? arg : null;
        }
        return source;
    },

    /**
     * @return the named value if the list provides an arguments object,
     *     `null` if the named value is `null` or `undefined`, and
     *     `undefined` if there is no arguments object If no name is
     *     provided, it returns the whole arguments object
     */
    getNamed: function(list, name) {
        var source = this.getSource(list);
        if (source) {
            // Return the whole arguments object if no name is provided.
            return name ? source[name] : list.__filtered || source;
        }
    },

    /**
     * Checks if the argument list has a named argument with the given name. If
     * name is `null`, it returns `true` if there are any named arguments.
     */
    hasNamed: function(list, name) {
        return !!this.getNamed(list, name);
    },

    /**
     * Copies all properties from `source` over to `dest`, supporting
     * `_filtered` handling as required by {@link Base.readNamed()} mechanism,
     * as well as a way to exclude and prioritize properties.
     *
     * @param {Object} dest the destination that is to receive the properties
     * @param {Object} source the source from where to retrieve the properties
     *     to be copied
     * @param {Object} [exclude] an object that can define any properties as
     *     `true` that should be excluded when copying
     * @param {String[]} [prioritize] a list of keys that should be prioritized
     *     when copying, if they are defined in `source`, processed in the order
     *     of appearance
     */
    filter: function(dest, source, exclude, prioritize) {
        var processed;

        function handleKey(key) {
            if (!(exclude && key in exclude) &&
                !(processed && key in processed)) {
                // Due to the _filtered inheritance trick, undefined is used
                // to mask already consumed named arguments.
                var value = source[key];
                if (value !== undefined)
                    dest[key] = value;
            }
        }

        // If there are prioritized keys, process them first.
        if (prioritize) {
            var keys = {};
            for (var i = 0, key, l = prioritize.length; i < l; i++) {
                if ((key = prioritize[i]) in source) {
                    handleKey(key);
                    keys[key] = true;
                }
            }
            // Now reference the processed keys as processed, so that
            // handleKey() will not set them again below.
            processed = keys;
        }

        // If source is a filtered object, we get the keys from the the original
        // object (it's parent / prototype). See _filtered inheritance trick in
        // the argument reading code.
        Object.keys(source.__unfiltered || source).forEach(handleKey);
        return dest;
    },

    /**
     * Returns true if obj is either a plain object or an array, as used by many
     * argument reading methods.
     */
    isPlainValue: function(obj, asString) {
        return Base.isPlainObject(obj) || Array.isArray(obj)
                || asString && typeof obj === 'string';
    },

    /**
     * Serializes the passed object into a format that can be passed to
     * `JSON.stringify()` for JSON serialization.
     */
    serialize: function(obj, options, compact, dictionary) {
        options = options || {};

        var isRoot = !dictionary,
            res;
        if (isRoot) {
            options.formatter = new Formatter(options.precision);
            // Create a simple dictionary object that handles all the storing
            // and retrieving of dictionary definitions and references, e.g. for
            // symbols and gradients. Items that want to support this need to
            // define globally unique _id attribute.
            /**
             * @namespace
             * @private
             */
            dictionary = {
                length: 0,
                definitions: {},
                references: {},
                add: function(item, create) {
                    // See if we have reference entry with the given id already.
                    // If not, call create on the item to allow it to create the
                    // definition, then store the reference to it and return it.
                    var id = '#' + item._id,
                        ref = this.references[id];
                    if (!ref) {
                        this.length++;
                        var res = create.call(item),
                            name = item._class;
                        // Also automatically insert class for dictionary
                        // entries.
                        if (name && res[0] !== name)
                            res.unshift(name);
                        this.definitions[id] = res;
                        ref = this.references[id] = [id];
                    }
                    return ref;
                }
            };
        }
        if (obj && obj._serialize) {
            res = obj._serialize(options, dictionary);
            // If we don't serialize to compact form (meaning no type
            // identifier), see if _serialize didn't already add the class, e.g.
            // for classes that do not support compact form.
            var name = obj._class;
            // Enforce class names on root level, except if the class explicitly
            // asks to be serialized in compact form (Project).
            if (name && !obj._compactSerialize && (isRoot || !compact)
                    && res[0] !== name) {
                res.unshift(name);
            }
        } else if (Array.isArray(obj)) {
            res = [];
            for (var i = 0, l = obj.length; i < l; i++)
                res[i] = Base.serialize(obj[i], options, compact, dictionary);
        } else if (Base.isPlainObject(obj)) {
            res = {};
            var keys = Object.keys(obj);
            for (var i = 0, l = keys.length; i < l; i++) {
                var key = keys[i];
                res[key] = Base.serialize(obj[key], options, compact,
                        dictionary);
            }
        } else if (typeof obj === 'number') {
            res = options.formatter.number(obj, options.precision);
        } else {
            res = obj;
        }
        return isRoot && dictionary.length > 0
                ? [['dictionary', dictionary.definitions], res]
                : res;
    },

    /**
     * Deserializes from parsed JSON data. A simple convention is followed:
     * Array values with a string at the first position are links to
     * deserializable types through Base.exports, and the values following in
     * the array are the arguments to their initialize function. Any other value
     * is passed on unmodified. The passed json data is recoursively traversed
     * and converted, leaves first.
     */
    deserialize: function(json, create, _data, _setDictionary, _isRoot) {
        var res = json,
            isFirst = !_data,
            hasDictionary = isFirst && json && json.length
                && json[0][0] === 'dictionary';
        // A _data side-car to deserialize that can hold any kind of 'global'
        // data across a deserialization. It's currently only used to hold
        // dictionary definitions.
        _data = _data || {};
        if (Array.isArray(json)) {
            // See if it's a serialized type. If so, the rest of the array are
            // the arguments to #initialize(). Either way, we simply deserialize
            // all elements of the array.
            var type = json[0],
                // Handle stored dictionary specially, since we need to keep a
                // lookup table to retrieve referenced items from.
                isDictionary = type === 'dictionary';
            // First see if this is perhaps a dictionary reference, and if so
            // return its definition instead.
            if (json.length == 1 && /^#/.test(type)) {
                return _data.dictionary[type];
            }
            type = Base.exports[type];
            res = [];
            // Skip first type entry for arguments.
            // Pass true for _isRoot in children if we have a dictionary,
            // in which case we need to shift the root level one down.
            for (var i = type ? 1 : 0, l = json.length; i < l; i++) {
                res.push(Base.deserialize(json[i], create, _data,
                        isDictionary, hasDictionary));
            }
            if (type) {
                // Create serialized type and pass collected arguments to
                // constructor().
                var args = res;
                // If a create method is provided, handle our own creation. This
                // is used in #importJSON() to pass on insert = false to all
                // items except layers.
                if (create) {
                    res = create(type, args, isFirst || _isRoot);
                } else {
                    res = new type(args);
                }
            }
        } else if (Base.isPlainObject(json)) {
            res = {};
            // We need to set the dictionary object before further
            // deserialization, because serialized symbols may contain
            // references to serialized gradients
            if (_setDictionary)
                _data.dictionary = res;
            for (var key in json)
                res[key] = Base.deserialize(json[key], create, _data);
        }
        // Filter out deserialized dictionary:
        return hasDictionary ? res[1] : res;
    },

    exportJSON: function(obj, options) {
        var json = Base.serialize(obj, options);
        return options && options.asString == false
                ? json
                : JSON.stringify(json);
    },

    importJSON: function(json, target) {
        return Base.deserialize(
                typeof json === 'string' ? JSON.parse(json) : json,
                // Provide our own create function to handle target and
                // insertion.
                function(ctor, args, isRoot) {
                    // If a target is provided and its of the right type
                    // for the root item, import right into it.
                    var useTarget = isRoot && target
                            && target.constructor === ctor,
                        obj = useTarget ? target
                            : Base.create(ctor.prototype);
                    // NOTE: We don't set insert false for layers since we want
                    // these to be created on the fly in the active project into
                    // which we're importing (except for if it's a preexisting
                    // target layer).
                    if (args.length === 1 && obj instanceof Item
                            && (useTarget || !(obj instanceof Layer))) {
                        var arg = args[0];
                        if (Base.isPlainObject(arg)) {
                            arg.insert = false;
                            // When using target, make sure the `item.insert()`
                            // method is not overridden with the `arg.insert`
                            // property that was just set. Pass an exclude
                            // object to the call of `obj.set()` below (#1392).
                            if (useTarget) {
                                args = args.concat([Item.INSERT]);
                            }
                        }
                    }
                    // When reusing an object, initialize it through #set()
                    // instead of the constructor function:
                    (useTarget ? obj.set : ctor).apply(obj, args);
                    // Clear target to only use it once.
                    if (useTarget)
                        target = null;
                    return obj;
                });
    },

    /**
     * Utility function for pushing a large amount of items to an array.
     */
    push: function(list, items) {
        var itemsLength = items.length;
        // It seems for "small" amounts of items, this performs better,
        // but once it reaches a certain amount, some browsers start crashing:
        if (itemsLength < 4096) {
            list.push.apply(list, items);
        } else {
            // Use a loop as the best way to handle big arrays (see #1493).
            // Set new array length once before the loop for better performance.
            var startLength = list.length;
            list.length += itemsLength;
            for (var i = 0; i < itemsLength; i++) {
                list[startLength + i] = items[i];
            }
        }
        return list;
    },

    /**
     * Utility function for adding and removing items from a list of which each
     * entry keeps a reference to its index in the list in the private _index
     * property. Used for PaperScope#projects and Item#children.
     */
    splice: function(list, items, index, remove) {
        var amount = items && items.length,
            append = index === undefined;
        index = append ? list.length : index;
        if (index > list.length)
            index = list.length;
        // Update _index on the items to be added first.
        for (var i = 0; i < amount; i++)
            items[i]._index = index + i;
        if (append) {
            // Append them all at the end by using push
            Base.push(list, items);
            // Nothing removed, and nothing to adjust above
            return [];
        } else {
            // Insert somewhere else and/or remove
            var args = [index, remove];
            if (items)
                Base.push(args, items);
            var removed = list.splice.apply(list, args);
            // Erase the indices of the removed items
            for (var i = 0, l = removed.length; i < l; i++)
                removed[i]._index = undefined;
            // Adjust the indices of the items above.
            for (var i = index + amount, l = list.length; i < l; i++)
                list[i]._index = i;
            return removed;
        }
    },

    /**
     * Capitalizes the passed string: hello world -> Hello World
     */
    capitalize: function(str) {
        return str.replace(/\b[a-z]/g, function(match) {
            return match.toUpperCase();
        });
    },

    /**
     * Camelizes the passed hyphenated string: caps-lock -> capsLock
     */
    camelize: function(str) {
        return str.replace(/-(.)/g, function(match, chr) {
            return chr.toUpperCase();
        });
    },

    /**
     * Converts camelized strings to hyphenated ones: CapsLock -> caps-lock
     */
    hyphenate: function(str) {
        return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }
}});

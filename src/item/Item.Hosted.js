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

// Items backed by a host document, see Project#host. Each item of such a
// project is created as a shell from the host's record of it, and loads its
// content on first access to any of the fields that hold it.
new function() {
    // The fields that #_load() fills in, by the class that defines them:
    var contentFields = [
            [Item, ['_style', '_applyMatrix', '_opacity', '_blendMode',
                    '_pivot', '_data', '_textWrap']],
            [Path, ['_segments', '_closed', '_version', '_curves',
                    '_segmentSelection']],
            [CompoundPath, ['_children', '_namedChildren']],
            [HostItem, ['_values']],
            [TextItem, ['_story', '_orientation', '_layout', '_fontMetrics']],
            // The text path is a text's content, not one of its children:
            [PathText, ['_children', '_startOffset', '_endOffset',
                    '_alignment', '_spacing']],
            [AreaText, ['_children', '_columns', '_rows', '_gutter', '_inset',
                    '_verticalAlign']]
        ],
        // The fields that #_loadChildren() fills in on containers of hosted
        // items, Group and HostItem with _hasChildren:
        childrenFields = ['_children', '_namedChildren'],
        // The host boxes per item: bounds, strokeBounds and roughBounds.
        boxSize = 12,
        shellPrototypes = {},
        // The changes that outdate the host's boxes:
        boundsFlags = /*#=*/(ChangeFlag.GEOMETRY | ChangeFlag.STROKE),
        // Set while loading or invalidating, which aren't changes:
        isLoading = false;

    function defineValue(item, name, value) {
        Object.defineProperty(item, name, {
            value: value,
            writable: true,
            enumerable: true,
            configurable: true
        });
    }

    // Writes define the field on the item itself, where it hides the accessor.
    function defineLoader(shell, name, load) {
        Object.defineProperty(shell, name, {
            get: function() {
                this[load]();
                return this[name];
            },
            set: function(value) {
                defineValue(this, name, value);
            },
            configurable: true
        });
    }

    function getShellPrototype(ctor) {
        var proto = ctor && ctor.prototype,
            name = proto && proto._class,
            shell = shellPrototypes[name];
        if (!shell) {
            if (!(proto instanceof Item))
                throw new Error('Unknown item type: \'' + name + '\'.');
            shell = shellPrototypes[name] = Object.create(proto);
            var fields = shell._contentFields = [];
            contentFields.forEach(function(entry) {
                if (shell instanceof entry[0])
                    Base.push(fields, entry[1]);
            });
            fields.forEach(function(field) {
                defineLoader(shell, field, '_load');
            });
            if (shell instanceof Group || shell._hasChildren) {
                childrenFields.forEach(function(field) {
                    defineLoader(shell, field, '_loadChildren');
                });
            }
            // Fill the bounds cache from the host boxes, until the item or
            // one of its descendants changes and Paper.js measures it itself:
            shell._getCachedBounds = function(matrix, options, noInternal) {
                if (this._hostBounds) {
                    this._bounds = this._getHostBoundsCache();
                    this._hostBounds = false;
                }
                return proto._getCachedBounds.call(this, matrix, options,
                        noInternal);
            };
            // Loading isn't a change, so it mustn't clear caches either:
            shell._changed = function(flags) {
                if (!isLoading) {
                    if (flags & boundsFlags) {
                        for (var item = this; item; item = item._parent)
                            item._hostBounds = false;
                    }
                    proto._changed.call(this, flags);
                }
            };
            // Bounds unions skip empty items, so the record says whether the
            // item is empty, recursively for containers:
            shell.isEmpty = function(recursively) {
                return this._shell && !this.hasOwnProperty('_children')
                        ? this._empty
                        : proto.isEmpty.call(this, recursively);
            };
            shell.getStrokeScaling = function() {
                return this._shell
                        ? this._strokeScaling
                        : proto.getStrokeScaling.call(this);
            };
        }
        return shell;
    }

    // Sets the fields that the host's columns describe for item i.
    function setRecord(item, columns, i) {
        var flags = columns.flags[i],
            matrix = columns.matrices && columns.matrices[i];
        item._visible = !!(flags & 2);
        item._locked = !!(flags & 4);
        item._strokeScaling = !!(flags & 8);
        item._clipMask = !!(flags & 64);
        item._guide = !!(flags & 128);
        item._empty = !!(flags & 256);
        item._selection = item._selection & ~/*#=*/ItemSelection.ITEM
                | (flags & 1 ? /*#=*/ItemSelection.ITEM : 0);
        item._matrix._set.apply(item._matrix,
                (matrix || [1, 0, 0, 1, 0, 0]).concat([true]));
        item._boxes = columns.boxes;
        item._boxIndex = i * boxSize;
        item._bounds = undefined;
        item._hostBounds = true;
    }

    // Creates or reuses the items that the host's columns describe, as the
    // children of owner, an item or the project.
    function setChildren(owner, project, columns) {
        var keys = columns.keys,
            names = columns.names || {},
            itemsByKey = project._itemsByKey,
            parent = owner instanceof Item ? owner : null,
            children = [],
            namedChildren = {};
        for (var i = 0, l = keys.length; i < l; i++) {
            var key = keys[i],
                ctor = Base.exports[columns.typeNames[columns.types[i]]],
                item = itemsByKey[key],
                name = names[i];
            if (!item || item.constructor !== ctor) {
                item = itemsByKey[key] = Object.create(getShellPrototype(ctor));
                item._id = UID.get();
                item._key = key;
                item._project = project;
                item._matrix = new Matrix();
                item._matrix._owner = item;
                item._shell = true;
            }
            setRecord(item, columns, i);
            item._name = name || undefined;
            item._parent = parent;
            item._index = i;
            children.push(item);
            if (name) {
                (namedChildren[name] = namedChildren[name] || []).push(item);
                if (!(name in children))
                    children[name] = item;
            }
        }
        owner._children = children;
        owner._namedChildren = namedChildren;
        for (var i = 0, l = children.length; i < l; i++) {
            if (children[i]._selection)
                project._updateSelection(children[i]);
        }
    }

    // Loading and invalidating items isn't a change of the document, so we
    // keep it out of the change log:
    function whileLoading(project, callback) {
        var changes = project._changes;
        project._changes = null;
        isLoading = true;
        try {
            callback();
        } finally {
            project._changes = changes;
            isLoading = false;
        }
    }

    Item.inject(/** @lends Item# */{
        _key: null,

        /**
         * The key of the host's node that the item represents, in a project
         * backed by a host document, see {@link Project#host}. It can only be
         * set once, on an item created by a script, to register the key that
         * the host gave its new node.
         *
         * @bean
         * @type Number
         */
        getKey: function() {
            return this._key;
        },

        setKey: function(key) {
            var itemsByKey = this._project._itemsByKey;
            if (this._key != null)
                throw new Error('Unable to change the key of an item.');
            if (!itemsByKey)
                throw new Error('Unable to set a key in a project without a '
                        + 'host.');
            this._key = key;
            itemsByKey[key] = this;
        },

        _getHostBounds: function(options) {
            var boxes = this._boxes,
                i = this._boxIndex
                    + (options.handle ? 8 : options.stroke ? 4 : 0);
            return boxes
                    ? new Rectangle(boxes[i], boxes[i + 1], boxes[i + 2],
                        boxes[i + 3])
                    : new Rectangle();
        },

        _getHostBoundsCache: function() {
            // The boxes are in the item's own coordinates, so they only match
            // the bounds in the parent's coordinates without a matrix:
            var bounds = {},
                isIdentity = this._matrix.isIdentity(),
                nonscaling = !this._strokeScaling;
            [[0, 0], [1, 0], [1, 1]].forEach(function(entry) {
                var stroke = entry[0],
                    handle = entry[1],
                    key = '' + stroke + handle,
                    rect = this._getHostBounds({
                        stroke: stroke,
                        handle: handle
                    });
                bounds[key + 1] = {
                    rect: rect,
                    nonscaling: nonscaling,
                    internal: true
                };
                if (isIdentity) {
                    bounds[key + 0] = {
                        rect: rect.clone(),
                        nonscaling: nonscaling,
                        internal: false
                    };
                }
            }, this);
            return bounds;
        },

        _load: function() {
            var that = this;
            whileLoading(this._project, function() {
                that._loadContent();
            });
        },

        // Load the content in place, while loading. Also used for items that
        // a script created and keyed, which have no shell accessors:
        _loadContent: function() {
            var project = this._project,
                json = project._host.getItem(this._key),
                ctor = this.constructor,
                // Keep what the record set, and the children's own loading:
                kept = ['_id', '_parent', '_index', '_matrix'],
                values = {},
                that = this;
            if (this instanceof Group || this._hasChildren)
                Base.push(kept, childrenFields);
            // Start shells from the class defaults, so loading doesn't recurse
            // when it reads fields that it hasn't filled in yet:
            if (this._contentFields) {
                this._contentFields.forEach(function(name) {
                    defineValue(that, name, ctor.prototype[name]);
                });
            }
            kept.forEach(function(name) {
                if (that.hasOwnProperty(name))
                    values[name] = that[name];
            });
            // Initialize the content in place, through the constructor, then
            // put back what it reset:
            ctor.call(this, { insert: false, project: project });
            kept.forEach(function(name) {
                if (name in values) {
                    that[name] = values[name];
                } else {
                    delete that[name];
                }
            });
            Base.importJSON(json, this);
            this._shell = false;
        },

        _loadChildren: function() {
            var project = this._project,
                columns = project._host.getChildren(this._key),
                that = this;
            whileLoading(project, function() {
                setChildren(that, project, columns);
            });
        },

        // Deleting the loaded fields uncovers the shell's accessors again.
        // Items that a script created and keyed have none, so they reload
        // right away. Only called by Project#invalidate(), while loading:
        _unload: function() {
            if (!this._contentFields) {
                this._loadContent();
            } else if (!this._shell) {
                var that = this;
                this._contentFields.forEach(function(name) {
                    delete that[name];
                });
                this._shell = true;
            }
        },

        // Reload loaded children right away, so the ones that remain stay
        // inserted for the scripts that hold them. Only called by
        // Project#invalidate(), while loading:
        _reloadChildren: function() {
            if (this.hasOwnProperty('_children')) {
                var project = this._project,
                    children = this._children;
                for (var i = 0, l = children.length; i < l; i++) {
                    var child = children[i];
                    child._parent = child._index = null;
                    project._updateSelection(child, true);
                }
                setChildren(this, project,
                        project._host.getChildren(this._key));
            }
        }
    });

    TextItem.inject({
        // The host's layout of the text as the script holds it, also before
        // the host has its changes: the lines with their pieces, which take
        // what drawing needs from the styles of the story's runs, see
        // #_getPiece(), and their content from the story, see Project#host:
        _getHostLayout: function(host) {
            var that = this,
                story = this._story,
                content = story._content,
                layout = host.layOut(this.exportJSON({ asString: false }),
                        this._getStart(), this._key);
            this._visibleEnd = layout.end;
            return layout.lines.map(function(line) {
                line.pieces = line.pieces.map(function(placed) {
                    // The style of the run that the piece starts in, which any
                    // character property finds:
                    var style = story._getRangeStyles('fontSize', placed.start,
                            placed.end)[0],
                        piece = Base.set(that._getPiece(style), placed);
                    if (piece.content == null) {
                        piece.content = content.slice(piece.start, piece.end);
                        if (piece.capitals)
                            piece.content = piece.content.toUpperCase();
                    }
                    return piece;
                });
                return line;
            });
        }
    });

    // Hosted text is laid out by its host, as its document shows it, and by
    // Paper.js where the host doesn't lay text out:
    [PointText, PathText, AreaText].forEach(function(ctor) {
        ctor.inject({
            _layOut: function _layOut() {
                var host = this._project._host;
                return host && host.layOut
                        ? this._getHostLayout(host)
                        : _layOut.base.call(this);
            }
        });
    });

    Project.inject(/** @lends Project# */{
        /**
         * The host document that the project's items come from. Setting it
         * creates the project's layers from the host's records. All items
         * are created as shells that load their content and children from the
         * host on first access.
         *
         * The host provides:
         * - `getChildren(key)`, which returns the records of the children of
         *   the node with the given key, or of the top level for `null`, as
         *   columns: `keys`, `types` (indices into `typeNames`), `typeNames`,
         *   `flags` (selected: 1, visible: 2, locked: 4, strokeScaling: 8,
         *   clipMask: 64, guide: 128, empty: 256), `boxes` (bounds,
         *   strokeBounds and roughBounds in the item's coordinates, 12 numbers
         *   per item), and the sparse objects `names` and `matrices`.
         * - `getItem(key)`, which returns the node's own content in the form
         *   of {@link Item#importJSON(json)}, without children.
         * - `getAncestorKeys(key)`, which returns the keys from the top level
         *   down to the node's parent.
         * - Optionally `layOut(json, start, key)`, which lays out a text item,
         *   given in the form of {@link Item#exportJSON(options)} as the
         *   script holds it, from `start` in its story, and returns `{ end,
         *   lines }`: where its visible text ends, and its lines, each `{
         *   start, end, x, y, width, lineHeight, ascent, descent, pieces }`,
         *   with pieces `{ start, end, x, y, dx, width, rotation, size, ascent,
         *   descent, lineHeight }` and an optional `content`, as for a
         *   hyphen, all in the item's coordinates. `key` is null for text
         *   that the host doesn't know yet. Without it, Paper.js lays out text
         *   itself.
         *
         * @bean
         * @type Object
         */
        getHost: function() {
            return this._host;
        },

        setHost: function(host) {
            if (this._children.length)
                throw new Error('Unable to set the host of a project with '
                        + 'layers.');
            var that = this;
            this._host = host;
            this._itemsByKey = {};
            whileLoading(this, function() {
                setChildren(that, that, host.getChildren(null));
                that._activeLayer = that._children[0] || null;
            });
        },

        /**
         * Returns the item of the host's node with the given key, loading only
         * the children of its ancestors.
         *
         * @param {Number} key the key of the host's node
         * @return {Item} the item, or `null` if the host has no such node
         */
        getItemByKey: function(key) {
            var itemsByKey = this._itemsByKey,
                item = itemsByKey[key];
            if (!item || !item.isInserted()) {
                var keys = this._host.getAncestorKeys(key) || [];
                for (var i = 0, l = keys.length; i < l; i++) {
                    var ancestor = itemsByKey[keys[i]];
                    if (ancestor)
                        ancestor.getChildren();
                }
                item = itemsByKey[key];
            }
            return item && item.isInserted() ? item : null;
        },

        /**
         * Updates the items of changed host nodes, given in the column format
         * of the host's `getChildren()`, with two more flags: 16 when the
         * node's own content changed, so the item loads it again on next
         * access, and 32 when its list of children changed, so it loads them
         * again right away if it had loaded them, keeping the items of nodes
         * that remain. Nodes without items are skipped.
         *
         * @param {Object} columns the records of the changed nodes
         */
        invalidate: function(columns) {
            var itemsByKey = this._itemsByKey,
                keys = columns.keys,
                names = columns.names || {},
                that = this;
            whileLoading(this, function() {
                for (var i = 0, l = keys.length; i < l; i++) {
                    var item = itemsByKey[keys[i]],
                        flags = columns.flags[i];
                    if (item) {
                        if (flags & 16)
                            item._unload();
                        if (flags & 32)
                            item._reloadChildren();
                        if ((names[i] || undefined) !== item._name)
                            item.setName(names[i] || null);
                        if (item._parent)
                            Item._clearBoundsCache(item._parent);
                        Item._clearBoundsCache(item);
                        setRecord(item, columns, i);
                        item._globalMatrix = item._position = undefined;
                        that._updateSelection(item);
                    }
                }
            });
        }
    });
};

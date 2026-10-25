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
                    '_pivot', '_data', '_textWrap', '_effects']],
            [Path, ['_segments', '_closed', '_version', '_curves',
                    '_segmentSelection', '_strokeProfile']],
            [CompoundPath, ['_children', '_namedChildren']],
            [SymbolItem, ['_definition']],
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
    // A script's writes load first, so loading doesn't replace what they
    // write. Those of loading itself are what it loads:
    function defineLoader(shell, name, load) {
        Object.defineProperty(shell, name, {
            get: function() {
                this[load]();
                return this[name];
            },
            set: function(value) {
                if (!isLoading)
                    this[load]();
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
            if (name)
                Base.addNamed(children, namedChildren, name, item);
        }
        owner._children = children;
        owner._namedChildren = namedChildren;
        for (var i = 0, l = children.length; i < l; i++) {
            if (children[i]._selection)
                project._updateSelection(children[i]);
        }
    }

    // Loading and invalidating items isn't a change of the document, so we
    // keep it out of the change log. Loading linked text loads the children
    // of the containers of its other items while it loads. What it creates
    // belongs to the project that it loads for, which we make the active one
    // meanwhile, without activating it:
    function whileLoading(project, callback) {
        var changes = project._changes,
            loading = isLoading,
            active = paper.project;
        project._changes = null;
        isLoading = true;
        paper.project = project;
        try {
            callback();
        } finally {
            project._changes = changes;
            isLoading = loading;
            paper.project = active;
        }
    }

    // Imports the host's JSON, resolving its references to the definitions
    // that the host shares between items, see Project#host:
    function importJSON(project, json, target) {
        return Base.importJSON(json, target, function(key) {
            return getDefinition(project, key);
        });
    }

    // Each definition loads once, and keeps its key, which it exports as its
    // reference:
    function getDefinition(project, key) {
        var definitionsByKey = project._definitionsByKey,
            definition = definitionsByKey[key];
        if (!definition) {
            // Project#symbolDefinitions loads them outside of items, too:
            whileLoading(project, function() {
                definition = definitionsByKey[key] = importJSON(project,
                        project._host.getDefinition(key));
            });
            definition._key = key;
        }
        return definition;
    }

    // Items that move into a project with another host use copies of the
    // definitions of their host there, which the new host takes as new ones.
    // The project keeps one copy of each, for all the items that move:
    function copyDefinitions(project, item) {
        var copies = project._definitionCopies
                || (project._definitionCopies = {});

        function getCopy(definition) {
            var copy = copies[definition._id];
            if (!copy) {
                copy = copies[definition._id] = definition.clone();
                copy.project = project;
                // The items of the copy don't move, so we copy the
                // definitions that they use here:
                copyItem(copy._item);
                copy._item.getItems({}).forEach(copyItem);
            }
            return copy;
        }

        function copyItem(item) {
            var definition = item._definition,
                style = item._style;
            if (definition && definition._key != null)
                item.setDefinition(getCopy(definition));
            [style.getFillColor(true), style.getStrokeColor(true)].forEach(
                function(color) {
                    var pattern = color && color._type === 'pattern'
                            && color._components[0];
                    if (pattern && pattern._key != null)
                        color.setPattern(getCopy(pattern));
                }
            );
        }

        copyItem(item);
    }

    // Reloads a definition into the same object, so the colors and symbol
    // items that use it change along with it. One that the host no longer
    // has is emptied, and draws nothing:
    function reloadDefinition(project, definition) {
        var json = project._host.getDefinition(definition._key),
            loaded = json ? importJSON(project, json)
                : new definition.constructor(new Group({ insert: false }));
        // The loaded item is where its definition placed it:
        definition.setItem(loaded._item, true);
        definition._name = loaded._name;
        if (definition instanceof PatternDefinition) {
            definition.setTile(loaded._tile);
            definition.setSpacing(loaded._spacing);
        }
    }

    // The new definitions that the changed items use, which the host doesn't
    // have yet: those without a key, nested ones first. Items that are still
    // shells use only the host's:
    function getNewDefinitions(project) {
        var changes = project._changes || [],
            definitions = [],
            ids = {};

        function addDefinition(definition) {
            if (definition && definition._key == null && !ids[definition._id]) {
                ids[definition._id] = true;
                addDefinitions(definition._item);
                definitions.push(definition);
            }
        }

        function addDefinitions(item) {
            if (!item._shell) {
                var style = item._style;
                addDefinition(item._definition);
                [style.getFillColor(true), style.getStrokeColor(true)].forEach(
                    function(color) {
                        addDefinition(color && color._type === 'pattern'
                                && color._components[0]);
                    }
                );
                // The children of the host's items are logged themselves:
                if (item._key == null && item._children)
                    item._children.forEach(addDefinitions);
            }
        }

        for (var i = 0, l = changes.length; i < l; i++) {
            var item = changes[i].item,
                definition = changes[i].definition;
            if (item ? item.isInserted() : definition._key != null)
                addDefinitions(item || definition._item);
        }
        return definitions;
    }

    // The host's definitions of the given class, followed by the new ones:
    function getDefinitions(project, ctor) {
        var keys = project._host.getDefinitionKeys(ctor.prototype._class);
        return keys.map(function(key) {
            return getDefinition(project, key);
        }).concat(getNewDefinitions(project).filter(function(definition) {
            return definition instanceof ctor;
        }));
    }

    // Definitions that the host shares export as references to its keys:
    ItemDefinition.inject({
        _key: null,

        // The key of the host's definition, see Project#host. It can only be
        // set once, on a definition created by a script, to register the key
        // that the host gave its new definition:
        getKey: function() {
            return this._key;
        },

        setKey: function(key) {
            var definitionsByKey = this.project._definitionsByKey;
            if (this._key != null)
                throw new Error('Unable to change the key of a definition.');
            if (!definitionsByKey)
                throw new Error('Unable to set a key in a project without a '
                        + 'host.');
            this._key = key;
            definitionsByKey[key] = this;
        },

        setName: function setName(name) {
            if (this._key != null)
                throw new Error('Unable to rename a definition of the host.');
            setName.base.call(this, name);
        }
    });

    [SymbolDefinition, PatternDefinition].forEach(function(ctor) {
        ctor.inject({
            _serialize: function _serialize(options, dictionary) {
                return this._key != null
                        ? ['@' + this._key]
                        : _serialize.base.call(this, options, dictionary);
            }
        });
    });

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

        // An item that moves to a project with another host is new there: it
        // loads from its own host first, while still in its project, and then
        // drops its key. The children follow as _setProject() reaches them:
        _setProject: function _setProject(project, installEvents) {
            var from = this._project,
                host = from && from._host,
                isNewHost = host && host !== project._host;
            if (isNewHost && this._key != null) {
                if (this._shell)
                    this._load();
                if (this._contentFields && !this.hasOwnProperty('_children')
                        && (this instanceof Group || this._hasChildren))
                    this._loadChildren();
                delete from._itemsByKey[this._key];
                this._key = null;
            }
            _setProject.base.call(this, project, installEvents);
            // Copy the definitions once the item is in the new project, which
            // logs the change, as part of its insertion:
            if (isNewHost)
                copyDefinitions(project, this);
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
            // Linked text gives the keys of its story's text items, which
            // aren't a property of the item, see TextItem#_loadLinked():
            if (typeof json === 'string')
                json = JSON.parse(json);
            var linked = json[1].linked;
            delete json[1].linked;
            importJSON(project, json, this);
            this._shell = false;
            if (linked)
                this._loadLinked(linked);
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
            this._edited = false;
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
        // New text takes the project's current text style, when the host set
        // one, see Project#currentTextStyle:
        _getCurrentStyle: function _getCurrentStyle(project) {
            return project._currentTextStyle
                    || _getCurrentStyle.base.call(this, project);
        },

        // Text items that the host links share one story, in the order of the
        // keys: the first of them to load loads the story and the others,
        // which join it, as an item does that loads again after invalidate():
        _loadLinked: function(keys) {
            var project = this._project,
                that = this,
                items = keys.map(function(key) {
                    return key === that._key ? that : project.getItemByKey(key);
                }),
                story = null;
            for (var i = 0, l = items.length; i < l && !story; i++) {
                if (items[i] !== this && !items[i]._shell)
                    story = items[i]._story;
            }
            if (story) {
                this._story = story;
            } else {
                // importJSON() parses and deserializes the story's JSON:
                this.set(importJSON(project,
                        project._host.getStory(this._key)));
                for (var i = 0, l = items.length; i < l; i++) {
                    if (items[i] !== this)
                        items[i]._loadContent();
                }
                this._story._items = items;
            }
        },

        // A loaded text's path loads again into the path it has, so the
        // scripts that hold it keep it, as children do, see
        // #_reloadChildren(). Project#invalidate() calls what this returns
        // once it has unloaded all items, so linked text loads its story
        // anew:
        _unload: function _unload() {
            var path = !this._shell && this.getTextPath(),
                that = this;
            _unload.base.call(this);
            return path && function() {
                if (that._shell)
                    that._loadContent();
                var loaded = that.getTextPath();
                if (loaded && loaded !== path
                        && loaded.constructor === path.constructor) {
                    path._parent = path._index = null;
                    path.removeChildren();
                    path.copyContent(loaded);
                    path.copyAttributes(loaded);
                    that.setTextPath(path);
                }
            };
        },

        // The host's layout of the text as the script holds it, also before
        // the host has its changes: the lines with their pieces, which take
        // what drawing needs from the styles of the story's runs, see
        // #_getPiece(), and their content from the story, see Project#host:
        _getHostLayout: function(host) {
            var that = this,
                story = this._story,
                content = story._content,
                // Text the script didn't edit since it loaded is the host's
                // own, which it can lay out without the JSON:
                json = this._key != null && !this._edited ? null
                        : this.exportJSON(),
                layout = host.layOut(json, this._getStart(), this._key);
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
        _currentTextStyle: null,

        /**
         * The style new text items take in a hosted project, in place of
         * {@link #currentStyle}, when the host sets one: for hosts whose new
         * text has defaults of its own, such as a black fill without a stroke
         * whatever new paths take. Paths keep taking the current style.
         *
         * @bean
         * @type Style
         */
        getCurrentTextStyle: function() {
            return this._currentTextStyle;
        },

        setCurrentTextStyle: function(style) {
            if (!this._currentTextStyle)
                this._currentTextStyle = new Style(null, null, this);
            this._currentTextStyle.set(style);
        },

        // Items that the script changes are no longer as the host has them,
        // see TextItem#_getHostLayout(), until the host takes the changes:
        _changed: function _changed(flags, item) {
            _changed.base.call(this, flags, item);
            if (item && !isLoading)
                item._edited = true;
        },

        // The new definitions that the changed items use come first, nested
        // ones first, so the host can create them before the items that refer
        // to them. Other definitions without a key aren't the host's:
        takeChanges: function takeChanges() {
            var definitions = this._host && getNewDefinitions(this),
                changes = takeChanges.base.call(this);
            for (var i = 0, l = changes ? changes.length : 0; i < l; i++) {
                if (changes[i].item)
                    changes[i].item._edited = false;
            }
            return definitions && changes
                    ? definitions.map(function(definition) {
                        return {
                            definition: definition,
                            flags: /*#=*/Change.INSERTION
                        };
                    }).concat(changes.filter(function(change) {
                        return change.item || change.definition._key != null;
                    }))
                    : changes;
        },

        getSymbolDefinitions: function getSymbolDefinitions() {
            return this._host
                    ? getDefinitions(this, SymbolDefinition)
                    : getSymbolDefinitions.base.call(this);
        },

        getPatternDefinitions: function getPatternDefinitions() {
            return this._host
                    ? getDefinitions(this, PatternDefinition)
                    : getPatternDefinitions.base.call(this);
        },

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
         *   of {@link Item#importJSON(json)}, without children. Linked text
         *   gives `linked`, the keys of its story's text items in order, and
         *   leaves out its story.
         * - `getStory(key)`, for linked text, which returns its story with the
         *   key of any of its text items: `content` or `runs`, `paragraphs`,
         *   and the character and paragraph styles, as
         *   {@link Item#exportJSON(options)} writes them in the JSON of a
         *   text item.
         * - `getAncestorKeys(key)`, which returns the keys from the top level
         *   down to the node's parent.
         * - Optionally `layOut(json, start, key)`, which lays out a text item
         *   from `start` in its story, given as the JSON string that
         *   {@link Item#exportJSON(options)} writes of it as the script holds
         *   it, or as `null` where the script didn't change it since it
         *   loaded or the host took its changes with
         *   {@link Project#takeChanges()}, for the host to lay out its own
         *   node, and returns
         *   `{ end, lines }`: where its visible text ends, and
         *   its lines, each `{ start, end, x, y, width, lineHeight, ascent,
         *   descent, pieces }`, with pieces `{ start, end, x, y, dx, width,
         *   rotation, size, ascent, descent, lineHeight }` and an optional
         *   `content`, as for a hyphen, all in the item's coordinates. `key`
         *   is null for text that the host doesn't know yet. Without it,
         *   Paper.js lays out text itself.
         * - `getDefinition(key)`, for the pattern and symbol definitions that
         *   the host shares between its items, which the JSON of its items
         *   refers to as `['@key']`, as in `fillColor: ['pattern',
         *   ['@pattern/Dots'], matrix]` or `definition: ['@symbol/Star']`.
         *   It returns the definition in the form of
         *   {@link Item#exportJSON(options)}, with its whole item:
         *   `['PatternDefinition', item, { tile, spacing }]` or
         *   `['SymbolDefinition', item]`, always: for a key that it has no
         *   definition of, an empty one of the type, as
         *   `['SymbolDefinition', ['Group', {}]]`. Each definition loads
         *   once, and the JSON of the items that use it, as
         *   {@link Item#exportJSON(options)} writes it, refers to it by its
         *   key again. Definitions that scripts create have no key, and are
         *   written out whole, until the host sets their `key`, which it can
         *   only set once. {@link Project#takeChanges()} lists those that the
         *   changed items use first, nested ones first, as
         *   `{ definition, flags }` with the `ChangeFlag.INSERTION` flag,
         *   followed by the changes of the host's definitions. Renaming those
         *   isn't supported.
         * - `getDefinitionKeys(type)`, which returns the keys of all the
         *   host's definitions of the type, `'SymbolDefinition'` or
         *   `'PatternDefinition'`, for {@link #symbolDefinitions} and
         *   {@link #patternDefinitions}.
         *
         * Items that move into a project with another host load in full from
         * their own host first, and drop their keys, so they are new items
         * there. The symbol and pattern definitions of their host that they
         * use are copied without keys, once per project, so the new host
         * takes them as new ones too. Patterns in text runs aren't copied,
         * and linked text keeps its story with the items that stay.
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
            this._definitionsByKey = {};
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
         * that remain. Nodes without items are skipped. `definitions` lists
         * the keys of changed definitions of the host's `getDefinition()`,
         * which load again right away into the same objects, so the colors
         * and symbol items that use them change along. A definition that the
         * host no longer has, for which `getDefinition()` may return `null`
         * here, is emptied and draws nothing. The columns may hold only
         * definitions.
         *
         * @param {Object} columns the records of the changed nodes
         */
        invalidate: function(columns) {
            var itemsByKey = this._itemsByKey,
                definitionsByKey = this._definitionsByKey,
                keys = columns.keys || [],
                definitionKeys = columns.definitions || [],
                names = columns.names || {},
                reloads = [],
                that = this;
            whileLoading(this, function() {
                for (var i = 0, l = definitionKeys.length; i < l; i++) {
                    var definition = definitionsByKey[definitionKeys[i]];
                    if (definition)
                        reloadDefinition(that, definition);
                }
                for (var i = 0, l = keys.length; i < l; i++) {
                    var item = itemsByKey[keys[i]],
                        flags = columns.flags[i];
                    if (item) {
                        var reload = flags & 16 && item._unload();
                        if (reload)
                            reloads.push(reload);
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
                // What loads again right away, see TextItem#_unload():
                reloads.forEach(function(reload) {
                    reload();
                });
            });
        }
    });
};

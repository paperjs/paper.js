/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name HTMLItem
 * @class The HTMLItem item represents an DOM node sticked to Paper.js project coordinates.
 * @extends Item
 */

var HTMLItem = Item.extend(/** @lends HTMLItem# */{
    statics: {
        allHTMLItems: [],
        updateCoords: function () {
            for (var i = 0; i < HTMLItem.allHTMLItems.length; i++) {
                var newCoords = HTMLItem.allHTMLItems[i].canvasToDom(HTMLItem.allHTMLItems[i].x, HTMLItem.allHTMLItems[i].y);
                HTMLItem.allHTMLItems[i].node.style.left = newCoords.x + 'px';
                HTMLItem.allHTMLItems[i].node.style.top = newCoords.y + 'px';
            }
        }
    },
    //_boundsGetter: 'getBounds',
    _class: 'HTMLItem',
    _serializeFields: {
    },

    initialize: function HTMLItem(x, y) {
        if (x instanceof Object === true) {
            y = x.y;
            x = x.x;
        }

        this._id = HTMLItem._id = (HTMLItem._id || 0) + 1;
        if (!this._project) {
            var project = paper.project,
                layer = project.activeLayer;
            this._setProject(project);
        }

        if (HTMLItem.allHTMLItems.length === 0) {
            this._project.view.on('zoom', HTMLItem.updateCoords);
            this._project.view.on('scroll', HTMLItem.updateCoords);
        }

        this.x = x || 0;
        this.y = y || 0;

        this.node = document.createElement('div');
        this.node.style.position = 'absolute';
        var coord = this.canvasToDom(x, y);
        this.node.style.left = coord.x + 'px';
        this.node.style.top = coord.y + 'px';
        HTMLItem.allHTMLItems.push(this);
        this._project.view._element.parentNode.style.position = 'relative';
        this._project.view._element.parentNode.style.padding = '0';
        this._project.view._element.parentNode.style.margin = '0';
        this._project.view._element.parentNode.appendChild(this.node);
    },
    removeChild: function (node) {
        this.node.removeChild(node);
    },
    appendChild: function (node) {
        this.node.appendChild(node);
    },
    remove: function () {
        for (var i = 0; i < HTMLItem.allHTMLItems.length; i++) {
            if (HTMLItem.allHTMLItems[i] === this) {
                HTMLItem.allHTMLItems.splice(i, i + 1);
            }
        }
        this._project.view._element.parentNode.removeChild(this.node);
        if (HTMLItem.allHTMLItems.length === 0) {
            this._project.view.detach('zoom', HTMLItem.updateCoords);
            this._project.view.detach('fire', HTMLItem.updateCoords);
        }
    },
    canvasToDom: function (x, y) {
        var newX = (this._project.view._matrix._tx + x * this._project.view._matrix._a);
        var newY = (this._project.view._matrix._ty + y * this._project.view._matrix._a);
        return {x: newX, y: newY};
    },
    set: function (props) {
        if (props)
            this._set(props);
        return this;
    },
    _setProject: function (project) {
        if (this._project != project) {
            this._project = project;
            if (this._children) {
                for (var i = 0, l = this._children.length; i < l; i++) {
                    this._children[i]._setProject(project);
                }
            }
        }
    },
    /*_getBounds: function(getter, matrix) {
        var rect = new Rectangle(this._size).setCenter(0, 0);
        return matrix ? matrix._transformBounds(rect) : rect;
    },*/
    getId: function () {
        return this._id;
    },
    getType: function () {
        return this._type;
    },

    getName: function () {
        return this._name;
    },

    setName: function (name, unique) {
        if (this._name)
            this._removeFromNamed();
        if (name && this._parent) {
            var children = this._parent._children,
                namedChildren = this._parent._namedChildren,
                orig = name,
                i = 1;
            while (unique && children[name])
                name = orig + ' ' + (i++);
            (namedChildren[name] = namedChildren[name] || []).push(this);
            children[name] = this;
        }
        this._name = name || undefined;
        this._changed(32);
    }
});
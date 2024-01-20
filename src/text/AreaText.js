/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2016, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

 /**
  * @name AreaText
  *
  * @class An AreaText item represents a piece of typography in your Paper.js
  * project which starts from a certain point and extends by the amount of
  * characters contained in it.
  *
  * @extends TextItem
  */
 var AreaText = TextItem.extend(/** @lends AreaText# */{
   _class: 'AreaText',

   initialize: function AreaText() {
     this._anchor = [0,0];
     this._needsWrap = false;
     TextItem.apply(this, arguments);
   },

   /**
    * The AreaText's rectangle for wrapping
    *
    * @type Rectangle
    */

   getRectangle: function() {

     return this._rectangle;
   },

   setRectangle: function(/* rectangle */) {
       var rectangle = Rectangle.read(arguments);
       this._rectangle = rectangle;
       this.translate(rectangle.topLeft.subtract(this._matrix.getTranslation()));
       this._updateAnchor();
       this._needsWrap = true;
       this._changed(/*#=*/Change.GEOMETRY);
   },

   setContent: function(content) {
     this._content = '' + content;
     this._needsWrap = true;
     this._changed(/*#=*/Change.CONTENT);
   },

   getJustification: function() {
     return this._style._justification;
   },

   setJustification: function() {
     this._style.justification = arguments[0];
     this._updateAnchor();
   },

   _wrap: function(ctx) {
     // this._lines = this._content.split(/\r\n|\n|\r/mg);
     this._lines = [];

     var words = this._content.split(' '),
         line = '';

     for (var i = 0; i < words.length; i++) {
       var testLine = line + words[i] + ' ',
           metrics = ctx.measureText(testLine),
           testWidth = metrics.width;
       if (testWidth > this.rectangle.width && i > 0) {
         this._lines.push(line);
         line = words[i] + ' ';
       }
       else {
         line = testLine;
       }
     }
     this._lines.push(line);
   },

   _updateAnchor: function() {
     var justification = this._style.getJustification(),
         rectangle = this.getRectangle(),
         anchor = new Point(0,this._style.getFontSize());
     if (justification == 'center') {
       anchor = anchor.add([rectangle.width/2,0]);
     }
     else if (justification == 'right') {
       anchor = anchor.add([rectangle.width,0]);
     }
     this._anchor = anchor;
   },

   _getAnchor: function() {

     return this._anchor;
   },

   _draw: function(ctx, param, viewMatrix) {
       if (!this._content)
           return;
       this._setStyles(ctx, param, viewMatrix);
       var style = this._style,
           hasFill = style.hasFill(),
           hasStroke = style.hasStroke(),
           rectangle = this.rectangle,
           anchor = this._getAnchor(),
           leading = style.getLeading(),
           shadowColor = ctx.shadowColor;
       ctx.font = style.getFontStyle();
       ctx.textAlign = style.getJustification();
       if (this._needsWrap) {
         this._wrap(ctx);
         this._needsWrap = false;
       }
       var lines = this._lines;
       for (var i = 0, l = lines.length; i < l; i++) {
           if ((i+1) * leading > rectangle.height)
               return;
           // See Path._draw() for explanation about ctx.shadowColor
           ctx.shadowColor = shadowColor;
           var line = lines[i];
           if (hasFill) {
               ctx.fillText(line, anchor.x, anchor.y);
               ctx.shadowColor = 'rgba(0,0,0,0)';
           }
           if (hasStroke)
               ctx.strokeText(line, anchor.x, anchor.y);
           ctx.translate(0, leading);
       }
   },

   _getBounds: function(matrix, options) {

       var bounds = new Rectangle(
         0, 0,
         this.rectangle.width, this.rectangle.height
       );
       return matrix ? matrix._transformBounds(bounds, bounds) : bounds;
   }
 });

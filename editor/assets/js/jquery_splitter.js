/*!
 * JQuery Spliter Plugin
 * Copyright (C) 2010 Jakub Jankiewicz <http://jcubic.pl> 
 * Modifications for Paper.js by Juerg Lehni, 2012 <http://lehni.org> 
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 * 
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
(function($, undefined) {
    var count = 0,
        splitter_id = null,
        splitters = [],
        current_splitter = null;
    $.fn.split = function(options) {
        var settings = $.extend({
            limit: 100,
            orientation: 'horizontal',
            position: '50%',
            onDragStart: $.noop,
            onDragEnd: $.noop,
            onDrag: $.noop
        }, options || {});
        var children = this.children(),
            vertical = settings.orientation == 'vertical',
            first = vertical ? 'left' : 'top',
            second = vertical ? 'right' : 'bottom',
            panel_1 = children.first().addClass(first + '_panel'),
            panel_2 = panel_1.next().addClass(second + '_panel'),
            cls = vertical ? 'vsplitter' : 'hsplitter',
            size = vertical ? 'width' : 'height',
            coord = vertical ? 'pageX' : 'pageY',
            id = count++;
        this.addClass('splitter_panel');
        var splitter = $('<div/>').addClass(cls).mouseenter(function() {
            splitter_id = id;
        }).mouseleave(function() {
            splitter_id = null;
        }).insertAfter(panel_1);
        var position;
        var self = $.extend(this, {
            position: function(n) {
                if (n === undefined) {
                    return position;
                } else {
                    position = n;
                    var w = splitter[size]();
                        sw = Math.round(w / 2);
                    splitter.css(first, n - sw);
                    panel_1[size](n - sw);
                    panel_2[size](self[size]() - n - (w - sw));
                }
            },
            orientation: settings.orientation,
            limit: settings.limit,
            isActive: function() {
                return splitter_id === id;
            },
            destroy: function() {
                splitter.unbind('mouseenter');
                splitter.unbind('mouseleave');
                panel_1.removeClass(first + 'panel');
                panel_2.removeClass(second + 'panel');
                self.unbind('splitter.resize');
                splitters[id] = null;
                splitter.remove();
                var not_null = false;
                for (var i = splitters.length; i-- ;) {
                    if (splitters[i] !== null) {
                        not_null = true;
                        break;
                    }
                }
                //remove document events when no splitters
                if (!not_null) {
                    $(document.documentElement).unbind('.splitter');
                    splitters = [];
                }
            },
            mousedown: function(e) {
                $('<div class="splitterMask"></div>').insertAfter(self);
                $('body').css('cursor', vertical ? 'col-resize' : 'row-resize');
                settings.onDragStart(e);
                return false;
            },
            mouseup: function(e) {
                $('div.splitterMask').remove();
                $('body').css('cursor', 'auto');
                settings.onDragEnd(e);
            },
            mousemove: function(e) {
                var offset = self.offset();
                var x = e[coord] - offset[first];
                if(x <= self.limit) {
                    x = self.limit + 1;
                } else if (x >= self[size]() - self.limit) {
                    x = self[size]() - self.limit - 1;
                }
                if (x > self.limit &&
                    x < self[size]() - self.limit) {
                    self.position(x);
                    self.closest('.splitter_panel').trigger('splitter.resize');
                    return false;
                }
                settings.onDrag(e);
            }
        });
        
        self.bind('splitter.resize', function() {
            var pos = self.position();
            if (pos > self[size]()) {
                pos = self[size]() - self.limit - 1;
            } else if (pos < self.limit) {
                pos = self.limit + 1;
            }
            self.position(pos);
        });
        //inital position of splitter
        var m = settings.position.match(/^([0-9]+)(%)?$/),
            max = this[size](),
            pos = m[2] ? Math.round((max * +m[1]) / 100) : settings.position;
        if (pos > max - settings.limit) {
            pos = max - settings.limit;
        } else if (pos < settings.limit) {
            pos = settings.limit;
        }
        self.position(pos);
        if (splitters.length == 0) { // first time bind events to document
            $(document.documentElement).bind('mousedown.splitter', function(e) {
                if (splitter_id !== null) {
                    current_splitter = splitters[splitter_id];
                    return current_splitter.mousedown(e);
                }
            }).bind('mouseup.splitter', function(e) {
                if (current_splitter) {
                    current_splitter.mouseup(e);
                    current_splitter = null;
                }
            }).bind('mousemove.splitter', function(e) {
                if (current_splitter !== null)
                    return current_splitter.mousemove(e);
            });
        }
        splitters.push(self);
        return self;
    };
})(jQuery);

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
 * These tests are focused on user interactions.
 * They trigger events and check callbacks.
 * Warning: when running tests locally from `gulp test:browser` command, don't
 * move your mouse over the window because that could perturbate tests
 * execution.
 */
QUnit.module('Interactions');

//
// Mouse
//
test('Item#onMouseDown()', function(assert) {
    var done = assert.async();
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    var point = new Point(5, 5);
    item.onMouseDown = function(event) {
        equals(event.type, 'mousedown');
        equals(event.point, point);
        equals(event.target, item);
        equals(event.currentTarget, item);
        equals(event.delta, null);
        done();
    };
    triggerMouseEvent('mousedown', point);
});

test('Item#onMouseDown() with stroked item', function(assert) {
    var done = assert.async();
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.strokeColor = 'red';
    var point = new Point(0, 0);
    item.onMouseDown = function(event) {
        equals(event.type, 'mousedown');
        equals(event.point, point);
        equals(event.target, item);
        equals(event.currentTarget, item);
        equals(event.delta, null);
        done();
    };
    triggerMouseEvent('mousedown', point);
});

test('Item#onMouseDown() is not triggered when item is not filled', function(assert) {
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.onMouseDown = function(event) {
        throw 'this should not be called';
    };
    triggerMouseEvent('mousedown', new Point(5, 5));
    expect(0);
});

test('Item#onMouseDown() is not triggered when item is not visible', function(assert) {
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    item.visible = false;
    item.onMouseDown = function(event) {
        throw 'this should not be called';
    };
    triggerMouseEvent('mousedown', new Point(5, 5));
    expect(0);
});

test('Item#onMouseDown() is not triggered when item is locked', function(assert) {
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    item.locked = true;
    item.onMouseDown = function(event) {
        throw 'this should not be called';
    };
    triggerMouseEvent('mousedown', new Point(5, 5));
    expect(0);
});

test('Item#onMouseDown() is not triggered when another item is in front', function(assert) {
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    var item2 = item.clone();
    item.onMouseDown = function(event) {
        throw 'this should not be called';
    };
    triggerMouseEvent('mousedown', new Point(5, 5));
    expect(0);
});

test('Item#onMouseDown() is not triggered if event target is document', function(assert) {
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    item.onMouseDown = function(event) {
        throw 'this should not be called';
    };
    triggerMouseEvent('mousedown', new Point(5, 5), document);
    expect(0);
});

test('Item#onMouseMove()', function(assert) {
    var done = assert.async();
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    var point = new Point(5, 5);
    item.onMouseMove = function(event) {
        equals(event.type, 'mousemove');
        equals(event.point, point);
        equals(event.target, item);
        equals(event.currentTarget, item);
        equals(event.delta, null);
        done();
    };
    triggerMouseEvent('mousemove', point);
});

test('Item#onMouseMove() is not re-triggered if point is the same', function(assert) {
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    var point = new Point(5, 5);
    var counter = 0;
    item.onMouseMove = function(event) {
        equals(true, true);
    };
    triggerMouseEvent('mousemove', point);
    triggerMouseEvent('mousemove', point);
    expect(1);
});

test('Item#onMouseUp()', function(assert) {
    var done = assert.async();
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    var point = new Point(5, 5);
    item.onMouseUp = function(event) {
        equals(event.type, 'mouseup');
        equals(event.point, point);
        equals(event.target, item);
        equals(event.currentTarget, item);
        equals(event.delta, new Point(0, 0));
        done();
    };
    triggerMouseEvent('mousedown', point);
    triggerMouseEvent('mouseup', point);
});

test('Item#onMouseUp() is only triggered after mouse down', function(assert) {
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    item.onMouseUp = function(event) {
        throw 'this should not be called';
    };
    triggerMouseEvent('mouseup', new Point(5, 5));
    expect(0);
});

test('Item#onClick()', function(assert) {
    var done = assert.async();
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    var point = new Point(5, 5);
    item.onClick = function(event) {
        equals(event.type, 'click');
        equals(event.point, point);
        equals(event.target, item);
        equals(event.currentTarget, item);
        equals(event.delta, new Point(0, 0));
        done();
    };
    triggerMouseEvent('mousedown', point);
    triggerMouseEvent('mouseup', point);
});

test('Item#onClick() is not triggered if up point is not on item', function(assert) {
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    item.onClick = function(event) {
        throw 'this should not be called';
    };
    triggerMouseEvent('mousedown', new Point(5, 5));
    triggerMouseEvent('mouseup', new Point(15, 15));
    expect(0);
});

test('Item#onClick() is not triggered if down point is not on item', function(assert) {
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    item.onClick = function(event) {
        throw 'this should not be called';
    };
    triggerMouseEvent('mousedown', new Point(15, 15));
    triggerMouseEvent('mouseup', new Point(5, 5));
    expect(0);
});

test('Item#onDoubleClick()', function(assert) {
    var done = assert.async();
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    var point = new Point(5, 5);
    item.onDoubleClick = function(event) {
        equals(event.type, 'doubleclick');
        equals(event.point, point);
        equals(event.target, item);
        equals(event.currentTarget, item);
        equals(event.delta, new Point(0, 0));
        done();
    };
    triggerMouseEvent('mousedown', point);
    triggerMouseEvent('mouseup', point);
    triggerMouseEvent('mousedown', point);
    triggerMouseEvent('mouseup', point);
});

test('Item#onDoubleClick() is not triggered if both clicks are not on same item', function(assert) {
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    var item2 = item.clone().translate(5);
    item.onDoubleClick = function(event) {
        throw 'this should not be called';
    };
    triggerMouseEvent('mousedown', new Point(5, 5));
    triggerMouseEvent('mouseup', new Point(5, 5));
    triggerMouseEvent('mousedown', new Point(6, 6));
    triggerMouseEvent('mouseup', new Point(6, 6));
    expect(0);
});

test('Item#onDoubleClick() is not triggered if time between both clicks is too long', function(assert) {
    var done = assert.async();
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    var point = new Point(5, 5);
    item.onDoubleClick = function(event) {
        throw 'this should not be called';
    };
    triggerMouseEvent('mousedown', point);
    triggerMouseEvent('mouseup', point);
    setTimeout(function() {
        triggerMouseEvent('mousedown', point);
        triggerMouseEvent('mouseup', point);
        done();
    }, 301);
    expect(0);
});

test('Item#onDoubleClick() is not triggered if time between both mouse downs is too long (#1451)', function(assert) {
    var done = assert.async();
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    var point = new Point(5, 5);
    item.onDoubleClick = function(event) {
        throw 'this should not be called';
    };
    triggerMouseEvent('mousedown', point);
    setTimeout(function() {
        triggerMouseEvent('mouseup', point);
        triggerMouseEvent('mousedown', point);
        triggerMouseEvent('mouseup', point);
        done();
    }, 301);
    expect(0);
});

test('Item#onDoubleClick() is triggered if the second mouse down is held long (#1451)', function(assert) {
    var done = assert.async();
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    var point = new Point(5, 5);
    item.onDoubleClick = function(event) {
        equals(event.type, 'doubleclick');
        done();
    };
    triggerMouseEvent('mousedown', point);
    triggerMouseEvent('mouseup', point);
    triggerMouseEvent('mousedown', point);
    setTimeout(function() {
        triggerMouseEvent('mouseup', point);
    }, 301);
});

test('Item#onDoubleClick() is only triggered if both mouse downs are close (#1451)', function() {
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    var types = [];
    item.onClick = item.onDoubleClick = function(event) {
        types.push(event.type);
    };
    function click(x, y) {
        triggerMouseEvent('mousedown', new Point(x, y));
        triggerMouseEvent('mouseup', new Point(x, y));
    }
    click(5, 5);
    click(8, 5); // 3 pixels away
    click(1, 1);
    click(3, 2); // sqrt(5) pixels away
    equals(types.join(), 'click,click,click,doubleclick');
});

test('Item#onDoubleClick() is not triggered again by a third click', function() {
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    var types = [];
    item.onClick = item.onDoubleClick = function(event) {
        types.push(event.type);
    };
    for (var i = 0; i < 4; i++) {
        triggerMouseEvent('mousedown', new Point(5, 5));
        triggerMouseEvent('mouseup', new Point(5, 5));
    }
    equals(types.join(), 'click,doubleclick,click,doubleclick');
});

test('Item#onMouseEnter()', function(assert) {
    var done = assert.async();
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    var point = new Point(5, 5);
    item.onMouseEnter = function(event) {
        equals(event.type, 'mouseenter');
        equals(event.point, point);
        equals(event.target, item);
        equals(event.currentTarget, item);
        equals(event.delta, null);
        done();
    };
    triggerMouseEvent('mousemove', point);
});

test('Item#onMouseEnter() is only re-triggered after mouse leave', function(assert) {
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    item.onMouseEnter = function(event) {
        equals(true, true);
    };
    // enter
    triggerMouseEvent('mousemove', new Point(5, 5));
    triggerMouseEvent('mousemove', new Point(6, 6));
    triggerMouseEvent('mousemove', new Point(7, 7));
    // leave
    triggerMouseEvent('mousemove', new Point(11, 11));
    // re-enter
    triggerMouseEvent('mousemove', new Point(10, 10));
    expect(2);
});

test('Item#onMouseLeave()', function(assert) {
    var done = assert.async();
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    var point1 = new Point(5, 5);
    var point2 = new Point(15, 15);
    item.onMouseLeave = function(event) {
        equals(event.type, 'mouseleave');
        equals(event.point, point2);
        equals(event.target, item);
        equals(event.currentTarget, item);
        equals(event.delta, null);
        done();
    };
    triggerMouseEvent('mousemove', point1);
    triggerMouseEvent('mousemove', point2);
});

test('Item#onMouseLeave() when the mouse leaves the document', function(assert) {
    var done = assert.async();
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    var point1 = new Point(5, 5);
    var point2 = new Point(-5, 5);
    item.onMouseLeave = function(event) {
        equals(event.type, 'mouseleave');
        equals(event.point, point2);
        equals(event.target, item);
        done();
    };
    triggerMouseEvent('mousemove', point1);
    // A mouseout without relatedTarget means the mouse left the document:
    triggerMouseEvent('mouseout', point2);
});

test('Item#onMouseDrag()', function(assert) {
    var done = assert.async();
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    var point1 = new Point(5, 5);
    var point2 = new Point(15, 15);
    item.onMouseDrag = function(event) {
        equals(event.type, 'mousedrag');
        equals(event.point, point2);
        equals(event.target, item);
        equals(event.currentTarget, item);
        equals(event.delta, new Point(10, 10));
        done();
    };
    triggerMouseEvent('mousedown', point1);
    triggerMouseEvent('mousemove', point2);
});

test('Item#onMouseDrag() is not triggered after mouse up', function(assert) {
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    item.onMouseDrag = function(event) {
        equals(true, true);
    };
    triggerMouseEvent('mousedown', new Point(5, 5));
    triggerMouseEvent('mousemove', new Point(6, 6));
    triggerMouseEvent('mouseup', new Point(7, 7));
    triggerMouseEvent('mousemove', new Point(8, 8));
    expect(1);
});

test('Item#onMouseDrag() is not triggered if mouse down was on another item', function(assert) {
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    var item2 = item.clone().translate(10);
    item2.onMouseDrag = function(event) {
        throw 'this should not be called';
    };
    triggerMouseEvent('mousedown', new Point(5, 5));
    triggerMouseEvent('mousemove', new Point(11, 11));
    expect(0);
});

test('View#onMouseDrag() with a second touch outside of the view (#1875)', function() {
    var element = view.element,
        outside = document.createElement('div'),
        events = [];

    function createTouch(id, target, point) {
        return new Touch({
            identifier: id,
            target: target,
            clientX: point.x,
            clientY: point.y,
            pageX: point.x,
            pageY: point.y
        });
    }

    // Like the browser, list all touches on the screen, the ones on the
    // element of the event, and the ones that changed:
    function triggerTouchEvent(type, target, touches, targetTouches,
            changedTouches) {
        target.dispatchEvent(new TouchEvent(type, {
            bubbles: true,
            cancelable: true,
            touches: touches,
            targetTouches: targetTouches,
            changedTouches: changedTouches
        }));
    }

    view.onMouseDrag = view.onMouseUp = function(event) {
        events.push(event.type + ' ' + event.point + ' ' + event.delta);
    };
    var touch1 = createTouch(1, element, new Point(10, 10)),
        touch2 = createTouch(2, outside, new Point(80, 80));
    triggerTouchEvent('touchstart', element, [touch1], [touch1], [touch1]);
    // The view's touch events on the document only see the document, as the
    // elements aren't inserted:
    triggerTouchEvent('touchstart', document, [touch1, touch2], [touch2],
            [touch2]);
    // Moving the second touch doesn't drag:
    touch2 = createTouch(2, outside, new Point(90, 90));
    triggerTouchEvent('touchmove', document, [touch1, touch2], [touch2],
            [touch2]);
    // Moving the first touch does:
    touch1 = createTouch(1, element, new Point(20, 20));
    triggerTouchEvent('touchmove', document, [touch1, touch2], [touch1],
            [touch1]);
    // Ending the first touch ends the drag where it ended:
    triggerTouchEvent('touchend', document, [touch2], [], [touch1]);
    equals(events, [
        'mousedrag { x: 20, y: 20 } { x: 10, y: 10 }',
        'mouseup { x: 20, y: 20 } { x: 10, y: 10 }'
    ]);
});

test('Item#onMouseDown() after moving it from a removed group to a new group (#1791)', function() {
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    var count = 0;
    item.onMouseDown = function(event) {
        count++;
    };
    var group = new Group(item);
    group.remove();
    new Group(item);
    triggerMouseEvent('mousedown', new Point(5, 5));
    triggerMouseEvent('mouseup', new Point(5, 5));
    equals(count, 1);
});

test('Item#onMouseDown() after removing it from a removed group (#2079)', function() {
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    var count = 0;
    item.onMouseDown = function(event) {
        count++;
    };
    var group = new Group(item);
    group.remove();
    item.remove();
    project.activeLayer.addChild(item);
    triggerMouseEvent('mousedown', new Point(5, 5));
    triggerMouseEvent('mouseup', new Point(5, 5));
    equals(count, 1);
});

test('Item#onMouseDown() after removing the handler of an item in a removed group (#2079)', function() {
    var item = new Path.Rectangle(new Point(0, 0), new Size(10));
    item.fillColor = 'red';
    item.onMouseDown = function(event) {
        throw 'this should not be called';
    };
    var group = new Group(item);
    group.remove();
    item.onMouseDown = null;
    var item2 = new Path.Rectangle(new Point(0, 0), new Size(10));
    item2.fillColor = 'red';
    var count = 0;
    item2.onMouseDown = function(event) {
        count++;
    };
    triggerMouseEvent('mousedown', new Point(5, 5));
    triggerMouseEvent('mouseup', new Point(5, 5));
    equals(count, 1);
});

test('Item#onMouseDown() after moving another item to another project', function() {
    var item1 = new Path.Rectangle(new Point(0, 0), new Size(10)),
        item2 = new Path.Rectangle(new Point(20, 20), new Size(10));
    item1.fillColor = item2.fillColor = 'red';
    var count1 = 0,
        count2 = 0;
    item1.onMouseDown = function(event) {
        count1++;
    };
    item2.onMouseDown = function(event) {
        count2++;
    };
    var project1 = project,
        project2 = new Project(new Size(100, 100));
    project2.activeLayer.addChild(item2);
    project1.activate();
    triggerMouseEvent('mousedown', new Point(5, 5));
    triggerMouseEvent('mouseup', new Point(5, 5));
    triggerMouseEvent('mousedown', new Point(25, 25), project2.view.element);
    triggerMouseEvent('mouseup', new Point(25, 25));
    project2.remove();
    equals(count1, 1, 'item1 in project1');
    equals(count2, 1, 'item2 in project2');
});

test('Item#onMouseDown() is counted once for inserted items', function() {
    // There's no public way to observe a surplus of counted handlers, so we
    // check the view's internal counters.
    function getCount() {
        return view._itemEvents.native.mousedown || 0;
    }

    var item = new Path.Rectangle({
        point: [0, 0],
        size: [10, 10],
        insert: false
    });
    item.onMouseDown = function(event) {};
    equals(getCount, 0);
    project.activeLayer.addChild(item);
    equals(getCount, 1);
    item.remove();
    equals(getCount, 0);
    var layer = new Layer(item);
    equals(getCount, 1);
    layer.remove();
    equals(getCount, 0);
});

//
// Key
//
var getKeyEvents = function(triggerKeyEvents) {
    // Key events are only emitted on views that are visible in the DOM.
    var element = view.element,
        tool = new Tool(),
        events = [];
    element.style.position = 'fixed';
    element.style.top = element.style.left = 0;
    document.body.appendChild(element);
    tool.onKeyDown = tool.onKeyUp = function(event) {
        events.push(event.type + ' ' + event.key
                + (event.character ? ' ' + JSON.stringify(event.character) : '')
                + (event.modifiers.control ? ' +control' : '')
                + (event.modifiers.alt ? ' +alt' : '')
                + (event.modifiers.meta ? ' +meta' : ''));
    };
    triggerKeyEvents();
    tool.remove();
    document.body.removeChild(element);
    return events;
};

test('Key events with control, alt and meta without keypress (#1997, #1871)', function() {
    var agent = paper.agent,
        chrome = agent.chrome;
    // Firefox fires no keypress events for these combinations, simulate it
    // in any browser:
    agent.chrome = false;
    Base.each(['control', 'alt', 'meta'], function(name) {
        var modifierKey = Base.capitalize(name),
            modifiers = {};
        modifiers[name === 'control' ? 'ctrlKey' : name + 'Key'] = true;
        equals(getKeyEvents(function() {
            triggerKeyEvent('keydown', modifierKey, modifiers);
            triggerKeyEvent('keydown', 'a', modifiers);
            triggerKeyEvent('keyup', 'a', modifiers);
            triggerKeyEvent('keyup', modifierKey);
        }).join(', '), [
            'keydown ' + name + ' +' + name,
            'keydown a "a" +' + name,
            'keyup a "a" +' + name,
            'keyup ' + name
        ].join(', '), name);
    });
    agent.chrome = chrome;
});

test('Key events for space released while holding alt on macOS (#1801)', function() {
    // macOS turns space into a non-breaking space while alt is pressed:
    equals(getKeyEvents(function() {
        triggerKeyEvent('keydown', ' ');
        triggerKeyEvent('keypress', ' ');
        triggerKeyEvent('keydown', 'Alt', { altKey: true });
        triggerKeyEvent('keyup', '\xA0', { altKey: true });
        triggerKeyEvent('keyup', 'Alt');
    }).join(', '), [
        'keydown space " "',
        'keydown alt +alt',
        'keyup space " " +alt',
        'keyup alt'
    ].join(', '));
    equals(Key.modifiers.space, false, 'Key.modifiers.space');
    equals(Key.isDown('space'), false, "Key.isDown('space')");
});

test('Key events with keypress', function() {
    equals(getKeyEvents(function() {
        triggerKeyEvent('keydown', 'a');
        triggerKeyEvent('keypress', 'a');
        triggerKeyEvent('keyup', 'a');
        triggerKeyEvent('keydown', 'Shift', { shiftKey: true });
        triggerKeyEvent('keydown', 'A', { shiftKey: true });
        triggerKeyEvent('keypress', 'A', { shiftKey: true });
        triggerKeyEvent('keyup', 'A', { shiftKey: true });
        triggerKeyEvent('keyup', 'Shift');
        // Browsers that do fire keypress for control combinations must not
        // produce a second keydown event:
        triggerKeyEvent('keydown', 'Control', { ctrlKey: true });
        triggerKeyEvent('keydown', 'a', { ctrlKey: true });
        triggerKeyEvent('keypress', 'a', { ctrlKey: true });
        triggerKeyEvent('keyup', 'a', { ctrlKey: true });
        triggerKeyEvent('keyup', 'Control');
    }).join(', '), [
        'keydown a "a"',
        'keyup a "a"',
        'keydown shift',
        'keydown a "A"',
        'keyup a "A"',
        'keyup shift',
        'keydown control +control',
        'keydown a "a" +control',
        'keyup a "a" +control',
        'keyup control'
    ].join(', '));
});

var getViewKeyEvents = function(triggerKeyEvents) {
    // Insert a second view next to the one of the current project, both
    // visible, and log the key events that each of them receives.
    var view1 = view,
        project2 = new Project(new Size(100, 100)),
        view2 = project2.view,
        events = [];
    currentProject.activate();
    [view1, view2].forEach(function(view, index) {
        var element = view.element,
            name = 'view' + (index + 1);
        element.style.position = 'fixed';
        element.style.top = element.style.left = 0;
        document.body.appendChild(element);
        view.onKeyDown = view.onKeyUp = function(event) {
            events.push(name + ' ' + event.type + ' ' + event.key);
        };
    });
    triggerKeyEvents(view1, view2);
    document.body.removeChild(view1.element);
    document.body.removeChild(view2.element);
    project2.remove();
    return events.join(', ');
};

test('Key events reach the focused view when several are visible', function() {
    equals(getViewKeyEvents(function() {
        triggerKeyEvent('keydown', 'a');
        triggerKeyEvent('keypress', 'a');
        triggerKeyEvent('keyup', 'a');
    }), 'view1 keydown a, view1 keyup a');
});

test('Key events reach a newly visible view when the focused one is hidden (#1953)', function() {
    equals(getViewKeyEvents(function(view1) {
        view1.element.style.display = 'none';
        triggerKeyEvent('keydown', 'a');
        triggerKeyEvent('keypress', 'a');
        triggerKeyEvent('keyup', 'a');
    }), 'view2 keydown a, view2 keyup a');
});

//
// Tool
//
test('ToolEvent#count can be set', function() {
    var tool = new Tool(),
        counts = [];
    tool.onMouseDrag = function(event) {
        counts.push(event.count);
        if (event.count === 1)
            event.count = 10;
    };
    triggerMouseEvent('mousedown', new Point(0, 0));
    triggerMouseEvent('mousemove', new Point(5, 5));
    triggerMouseEvent('mousemove', new Point(6, 6));
    triggerMouseEvent('mousemove', new Point(7, 7));
    triggerMouseEvent('mouseup', new Point(7, 7));
    tool.remove();
    equals(counts.join(), '0,1,11');
});

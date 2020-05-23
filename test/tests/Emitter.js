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

QUnit.module('Emitter');

test('on()', function() {
    var emitter = new Item(),
        installed;
    // fake event type registration
    emitter._eventTypes = {
        mousemove: {
            install: function() {
                installed = true;
            }
        }
    };
    equals(function() {
        return !emitter.responds('mousemove');
    }, true);

    emitter.on('mousemove', function() {});
    equals(function() { return emitter.responds('mousemove'); }, true);
    equals(function() { return installed; }, true);

    // one time installation only
    installed = false;
    emitter.on('mousemove', function() {});
    equals(function() { return !installed; }, true);

    emitter.on('customUnregistered', function() {});
    equals(function() {
        return emitter.responds('customUnregistered');
    }, true);
});

test('off()', function() {
    var emitter = new Item(),
        uninstalled,
        called = 0,
        handler = function () {
            called++;
        },
        handler2 = function () {
        };

    emitter._eventTypes = {
        mousemove: {
            uninstall: function() {
                uninstalled = true;
            }
        }
    };

    emitter.on('mousemove', handler);
    emitter.on('mousemove', handler2);
    emitter.on('custom', handler);
    emitter.emit('mousemove');
    equals(function() { return called == 1; }, true);

    emitter.off('mousemove', handler2);
    emitter.emit('mousemove');
    equals(function() { return called == 2; }, true);
    equals(function() { return !uninstalled; }, true);

    emitter.off('mousemove', handler);
    emitter.emit('mousemove');
    equals(function() { return called == 2; }, true);
    equals(function() { return uninstalled; }, true);

    called = 0;
    emitter.emit('custom');
    equals(function() { return called == 1; }, true);
    emitter.off('custom', handler);
    emitter.emit('custom');
    equals(function() { return called == 1; }, true);
});

test('emit()', function() {
    var emitter = new Item(),
        called,
        handler = function (e) {
            called = e;
        };
    // fake event type registration
    emitter._eventTypes = {
        mousemove: {}
    };
    emitter.on('mousemove', handler);
    emitter.on('custom', handler);

    emitter.emit('mousemove', 'mousemove');
    equals(function() {
        return called == 'mousemove';
    }, true);

    emitter.emit('custom', 'custom');
    equals(function() {
        return called == 'custom';
    }, true);
});

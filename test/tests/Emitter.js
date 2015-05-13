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

module('Emitter');

test('on()', function() {
    var emitter = new Base(Emitter),
		installed;
	// fake event type registration
	emitter._eventTypes = {mouseMove: {install: function(){ installed = true;} } };
	equals(function() {
		return !emitter.responds('mouseMove');
	}, true);
    emitter.on('mouseMove', function() {});
	equals(function() {
        return emitter.responds('mouseMove')
    }, true);
	equals(function() { return installed; }, true);
	// one time installation only
	installed = false;
	emitter.on('mouseMove', function() {});
	equals(function() { return !installed; }, true);

	emitter.on('customUnregistered', function() {});
	equals(function() {
        return emitter.responds('customUnregistered')
    }, true);
});

test('off()', function() {
	var emitter = new Base(Emitter),
		uninstalled, called = 0,
		handler = function () {called++},
		handler2 = function () {};
	emitter._eventTypes = {mouseMove: {uninstall: function(){ uninstalled = true;} } };

	emitter.on('mouseMove', handler);
	emitter.on('mouseMove', handler2);
	emitter.on('custom', handler);
	emitter.emit('mouseMove');
	equals(function() {	return called == 1; }, true);

	emitter.off('mouseMove', handler2);
	emitter.emit('mouseMove');
	equals(function() {	return called == 2; }, true);
	equals(function() { return !uninstalled }, true);

	emitter.off('mouseMove', handler);
	emitter.emit('mouseMove');
	equals(function() {	return called == 2; }, true);
	equals(function() { return uninstalled }, true);

	called = 0;
	emitter.emit('custom');
	equals(function() {	return called == 1; }, true);
	emitter.off('custom', handler);
	emitter.emit('custom');
	equals(function() {	return called == 1; }, true);
});

test('emit()', function() {
	var emitter = new Base(Emitter),
		called,
		handler = function (e) {called = e};
	// fake event type registration
	emitter._eventTypes = {mouseMove: {} };
	emitter.on('mouseMove', handler);
	emitter.on('custom', handler);

	emitter.emit('mouseMove', 'mouseMove');
	equals(function() {
		return called == 'mouseMove';
	}, true);

	emitter.emit('custom', 'custom');
	equals(function() {
		return called == 'custom';
	}, true);
});

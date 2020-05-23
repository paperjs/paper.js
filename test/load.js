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

/*#*/ include('helpers.js');
// We need to load resemble.js after helpers.js, since for Node, helpers makes
// sure window, document and Image are made global first.
/*#*/ include('../node_modules/resemblejs/resemble.js', { namespace: 'resemble' });
/*#*/ include('tests/load.js');

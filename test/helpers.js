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

import { test as vitestTest, expect } from 'vitest'
import resemble from 'resemblejs'
import paper from 'paper'

const {
  Base,
  CompoundPath,
  Group,
  Item,
  PathItem,
  Project,
  Raster,
  Shape,
  Size,
  TextItem,
  View,
  document,
  window
} = paper

export const isNodeContext = !!paper.agent.node

// Text is measured in a font of the tests' own, the same on all systems, Inter
// from assets/fonts (OFL), named so that an installed one isn't used:
export const testFontFamily = 'Inter Test'

if (isNodeContext) {
  // Resemble.js needs the Image constructor global:
  globalThis.Image = window.Image
  const { registerFont } = await import('canvas')
  registerFont('assets/fonts/Inter-Regular.ttf', { family: testFontFamily })
} else {
  // Browsers load fonts as they're used, so load it before the tests, and run
  // them also if it fails, so that only the text tests fail:
  try {
    const font = new FontFace(
      testFontFamily,
      'url(/assets/fonts/Inter-Regular.ttf)'
    )
    document.fonts.add(await font.load())
  } catch {}
}

// Every assertion goes through push(), as one soft assertion, so a test goes
// on after a failure, and reports all of them, as with QUnit before:
expect.extend({
  toPass(received, actual, expected) {
    return {
      pass: received,
      message: () => `expected ${dump(actual)} to equal ${dump(expected)}`,
      actual,
      expected
    }
  }
})

function dump(value) {
  if (value instanceof Base || typeof value === 'function') {
    return String(value)
  }
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

export function push(result, actual, expected, message) {
  expect.soft(!!result, message).toPass(actual, expected)
}

export function pushFailure(message) {
  push(false, null, null, message)
}

export function ok(result, message) {
  push(result, result, true, message)
}

function strictEqual(actual, expected, message) {
  push(actual === expected, actual, expected, message)
}

// Report errors that are only logged to the console as failures:
const consoleError = console.error
console.error = function (...args) {
  if (expect.getState().currentTestName) pushFailure(args.join(' '))
  consoleError.apply(this, args)
}

// The project of the running test, see test():
export let currentProject

// Run each test in a project of its own, with a 100 × 100 view to make the
// interactions tests simpler by working with integers. `assert.async()`
// returns a function that the test calls when done, as in QUnit:
export function test(name, run) {
  return vitestTest(name, async () => {
    currentProject = new Project(new Size(100, 100))
    const pending = []
    try {
      run({
        async() {
          let done
          pending.push(new Promise(resolve => (done = resolve)))
          return done
        }
      })
      await Promise.all(pending)
    } finally {
      // Remove the projects once done, also those that the test created, so
      // their views can't draw after it, and reset the state for the
      // interactions tests:
      for (const project of [...paper.projects]) project.remove()
      View._resetState()
    }
  })
}

// Compares actual with expected by the type of expected. Functions as actual
// are called, with their source as the message.
export function equals(actual, expected, message, options) {
  if (typeof actual === 'function') {
    if (!message) message = getFunctionMessage(actual)
    actual = actual()
  }
  // Get the comparator based on the expected value's type only and ignore the
  // actual value's type:
  let type = typeof expected
  let cls
  type = (
    (expected === null && 'Null') ||
    (type === 'number' && 'Number') ||
    (type === 'boolean' && 'Boolean') ||
    (type === 'undefined' && 'Undefined') ||
    (Array.isArray(expected) && 'Array') ||
    (expected instanceof window.Element && 'Element') ||
    (cls = expected && expected._class) || // check _class 2nd last
    (type === 'object' && 'Object')
  ) // Object as catch-all
  const comparator = type && comparators[type]
  if (!message) message = type ? type.toLowerCase() : 'value'
  if (comparator) {
    comparator(actual, expected, message, options)
  } else if (expected && expected.equals) {
    // Fall back to equals:
    push(expected.equals(actual), actual, expected, message)
  } else {
    // Finally perform a strict compare:
    push(actual === expected, actual, expected, message)
  }
  if (options && options.cloned && cls) {
    const identical = identicalAfterCloning[cls]
    push(
      identical ? actual === expected : actual !== expected,
      actual,
      identical ? expected : 'not ' + expected,
      message + ': identical after cloning'
    )
  }
}

// A list of classes that should be identical after their owners were cloned:
const identicalAfterCloning = {
  Gradient: true,
  SymbolDefinition: true
}

function compareProperties(actual, expected, properties, message, options) {
  for (const key of properties) {
    equals(actual[key], expected[key], message + ' (#' + key + ')', options)
  }
}

// Compares 2 image data with resemble.js:
function compareImageData(
  imageData1,
  imageData2,
  tolerance,
  message,
  description
) {
  tolerance = (tolerance || 1e-4) * 100
  let result
  resemble.compare(
    imageData1,
    imageData2,
    {
      output: {
        errorColor: { red: 255, green: 51, blue: 0 },
        errorType: 'flat',
        transparency: 1
      },
      ignore: ['antialiasing']
    },
    // When working with imageData, this call is synchronous:
    (error, data) => {
      if (error) {
        console.error(error)
      } else {
        result = data
      }
    }
  )
  // Compare with tolerance in percentage:
  const fixed = tolerance < 1 ? (1 / tolerance + '').length - 1 : 0
  const identical = result ? 100 - result.misMatchPercentage : 0
  const text = identical.toFixed(fixed) + '% identical'
  push(
    Math.abs(100 - identical) <= tolerance,
    text + (description || ''),
    (100).toFixed(fixed) + '% identical',
    message
  )
}

export function comparePixels(actual, expected, message, options) {
  function rasterize(item, group, resolution) {
    let raster = null
    if (group) {
      const parent = item.parent
      const index = item.index
      group.addChild(item)
      raster = group.rasterize(resolution, false)
      if (parent) {
        parent.insertChild(index, item)
      } else {
        item.remove()
      }
    }
    return raster
  }

  if (!expected) {
    return strictEqual(actual, expected, message)
  } else if (!actual) {
    // In order to compare pixels, just create an empty item that can be
    // rasterized to an empty raster:
    actual = new Group()
  }

  options = options || {}
  // In order to properly compare pixel by pixel, we need to put each item into
  // a group with a white background of the united dimensions of the bounds of
  // both items before rasterizing:
  const resolution = options.resolution || 72
  const actualBounds = actual.strokeBounds
  const expectedBounds = expected.strokeBounds
  const bounds = actualBounds.isEmpty()
    ? expectedBounds
    : expectedBounds.isEmpty()
      ? actualBounds
      : actualBounds.unite(expectedBounds)
  if (bounds.isEmpty()) {
    strictEqual('empty', 'empty', message)
    return
  }
  const group = (
    actual &&
    expected &&
    new Group({
      insert: false,
      children: [
        new Shape.Rectangle({
          rectangle: bounds,
          fillColor: 'white'
        })
      ]
    })
  )
  const actualRaster = rasterize(actual, group, resolution)
  const expectedRaster = rasterize(expected, group, resolution)
  if (!actualRaster || !expectedRaster) {
    push(
      false,
      null,
      null,
      'Unable to compare rasterized items: ' +
      (!actualRaster ? 'actual' : 'expected') +
      ' item is null'
    )
  } else {
    // Compare the two rasterized items:
    const description =
      actual instanceof PathItem && expected instanceof PathItem
        ? '\nExpected:\n' +
          expected.pathData +
          '\nActual:\n' +
          actual.pathData
        : ''
    compareImageData(
      actualRaster.getImageData(),
      expectedRaster.getImageData(),
      options.tolerance,
      message,
      description
    )
  }
}

function compareItem(actual, expected, message, options, properties) {
  options = options || {}
  if (options.rasterize) {
    comparePixels(actual, expected, message, options)
  } else if (!actual || !expected) {
    strictEqual(actual, expected, message)
  } else {
    if (options.cloned) {
      push(
        actual.id !== expected.id,
        actual.id,
        'not ' + expected.id,
        message + ' (not #id)'
      )
    }
    strictEqual(
      actual.constructor,
      expected.constructor,
      message + ' (#constructor)'
    )
    // When item is cloned and has a name, the name will be versioned:
    equals(
      actual.name,
      options.cloned && expected.name
        ? expected.name + ' 1'
        : expected.name,
      message + ' (#name)'
    )
    compareProperties(
      actual,
      expected,
      [
        'children',
        'bounds',
        'position',
        'matrix',
        'data',
        'opacity',
        'locked',
        'visible',
        'blendMode',
        'selected',
        'fullySelected',
        'clipMask',
        'guide'
      ],
      message,
      options
    )
    if (properties) {
      compareProperties(actual, expected, properties, message, options)
    }
    // Style:
    const styles = [
      'fillColor',
      'strokeColor',
      'strokeCap',
      'strokeJoin',
      'dashArray',
      'dashOffset',
      'miterLimit'
    ]
    if (expected instanceof TextItem) {
      styles.push(
        'fontSize',
        'font',
        'leading',
        'tracking',
        'justification'
      )
    }
    compareProperties(
      actual.style,
      expected.style,
      styles,
      message + ' (#style)',
      options
    )
  }
}

// A list of comparator functions, based on `expected` type. See equals() for
// an explanation of how the type is determined.
const comparators = {
  Null: strictEqual,
  Undefined: strictEqual,
  Boolean: strictEqual,

  Object(actual, expected, message) {
    push(Base.equals(actual, expected), actual, expected, message)
  },

  Element(actual, expected, message, options) {
    // Convention: Loop through the attribute lists of both actual and expected
    // element, and compare values even if they may be inherited. This is to
    // handle styling values on SVGElement items more flexibly.
    equals(
      actual && actual.tagName,
      expected.tagName,
      (message || '') + ' (#tagName)',
      options
    )
    for (const attr of expected.attributes) {
      if (attr.specified) {
        equals(
          actual && actual.getAttribute(attr.name),
          attr.value,
          (message || '') + ' (#' + attr.name + ')',
          options
        )
      }
    }
  },

  Base(actual, expected, message, options) {
    comparators.Object(actual, expected, message, options)
  },

  Number(actual, expected, message, options) {
    // Compare with a default tolerance of 1e-5:
    const result = (
      Math.abs(actual - expected) <=
      Base.pick(options && options.tolerance, 1e-5)
    )
    push(result, result ? expected : actual, expected, message)
  },

  Array(actual, expected, message, options) {
    strictEqual(actual.length, expected.length, message + ' (#length)')
    for (let i = 0, l = actual.length; i < l; i++) {
      equals(
        actual[i],
        expected[i],
        (message || '') + '[' + i + ']',
        options
      )
    }
  },

  Point(actual, expected, message, options) {
    comparators.Number(actual.x, expected.x, message + ' (#x)', options)
    comparators.Number(actual.y, expected.y, message + ' (#y)', options)
  },

  Size(actual, expected, message, options) {
    comparators.Number(
      actual.width,
      expected.width,
      message + ' (#width)',
      options
    )
    comparators.Number(
      actual.height,
      expected.height,
      message + ' (#height)',
      options
    )
  },

  Rectangle(actual, expected, message, options) {
    comparators.Point(actual, expected, message, options)
    comparators.Size(actual, expected, message, options)
  },

  Matrix(actual, expected, message, options) {
    comparators.Array(actual.values, expected.values, message, options)
  },

  Color(actual, expected, message, options) {
    if (actual && expected) {
      equals(actual.type, expected.type, message + ' (#type)', options)
      // NOTE: This also compares gradients, with identity checks and all.
      equals(
        actual.components,
        expected.components,
        message + ' (#components)',
        options
      )
    } else {
      push(expected.equals(actual), actual, expected, message)
    }
  },

  Segment(actual, expected, message, options) {
    compareProperties(
      actual,
      expected,
      ['handleIn', 'handleOut', 'point', 'selected'],
      message,
      options
    )
  },

  SegmentPoint(actual, expected, message, options) {
    comparators.Point(actual, expected, message, options)
    comparators.Boolean(
      actual.selected,
      expected.selected,
      message + ' (#selected)',
      options
    )
  },

  Item: compareItem,

  Group(actual, expected, message, options) {
    compareItem(actual, expected, message, options, ['clipped'])
  },

  Layer(actual, expected, message, options) {
    compareItem(actual, expected, message, options)
    const sameProject = actual.project === expected.project
    const sharedProject = !(options && options.dontShareProject)
    push(
      sharedProject ? sameProject : !sameProject,
      actual.project,
      sharedProject ? expected.project : 'not ' + expected.project,
      message + ' (#project)'
    )
  },

  Path(actual, expected, message, options) {
    compareItem(actual, expected, message, options, [
      'segments',
      'closed',
      'clockwise'
    ])
  },

  CompoundPath(actual, expected, message, options) {
    compareItem(actual, expected, message, options)
  },

  Raster(actual, expected, message, options) {
    const pixels = options && options.pixels
    const properties = ['size', 'width', 'height', 'resolution']
    if (!pixels) properties.push('source', 'image')
    compareItem(actual, expected, message, options, properties)
    if (pixels) {
      comparePixels(actual, expected, message, options)
    } else {
      equals(
        actual.toDataURL(),
        expected.toDataURL(),
        message + ' (#toDataUrl())'
      )
    }
  },

  Shape(actual, expected, message, options) {
    compareItem(actual, expected, message, options, [
      'shape', 'size', 'radius'
    ])
  },

  PointText(actual, expected, message, options) {
    compareItem(actual, expected, message, options, ['content', 'point'])
  },

  SymbolItem(actual, expected, message, options) {
    compareItem(
      actual,
      expected,
      message,
      // Cloning SymbolItems does not result in cloned SymbolDefinitions:
      options && options.cloned
        ? Base.set({}, options, { cloned: false })
        : options,
      ['symbol']
    )
  },

  SymbolDefinition(actual, expected, message, options) {
    equals(
      actual.definition,
      expected.definition,
      message + ' (#definition)',
      options
    )
  },

  Project(actual, expected, message, options) {
    compareProperties(actual, expected, ['layers'], message, options)
  }
}

// Returns the body of a function, as the message of the assertion it makes:
export function getFunctionMessage(func) {
  let message = func
    .toString()
    .replace(/^\s*(?:function[^{]*\{|\([^)]*\)\s*=>\s*\{?)/, '')
    .replace(/\}?\s*$/, '')
    .replace(/^\s+|\s+$/g, '')
  if (/^return /.test(message)) {
    message = message.replace(/^return /, '').replace(/;$/, '')
  }
  return message
}

export function compareBoolean(actual, expected, message, options) {
  expected = typeof expected === 'string' ? PathItem.create(expected) : expected
  if (typeof actual === 'function') {
    if (!message) message = getFunctionMessage(actual)
    actual = actual()
  }
  let parent
  let index
  const style = {
    strokeColor: 'black',
    fillColor: (
      (
        expected && (
          expected.closed || (
            expected.firstChild &&
            expected.firstChild.closed &&
            'yellow'
          )
        )
      ) ||
      null
    )
  }
  if (actual) {
    parent = actual.parent
    index = actual.index
    // Remove it from parent already now, in case we're comparing children of
    // compound-paths, so we can apply styling to them.
    if (parent && parent instanceof CompoundPath) {
      actual.remove()
    } else {
      parent = null
    }
    actual.style = style
  }
  if (expected) {
    expected.style = style
  }
  equals(actual, expected, message, Base.set({ rasterize: true }, options))
  if (parent) {
    // Insert it back:
    parent.insertChild(index, actual)
  }
}

export function createSVG(str, attrs) {
  // Similar to SvgElement.create():
  const node = document.createElementNS('http://www.w3.org/2000/svg', str)
  for (const key in attrs) node.setAttribute(key, attrs[key])
  // Paper.js paths do not have a fill by default, SVG does:
  node.setAttribute('fill', 'none')
  return node
}

export function compareSVG(done, actual, expected, message, options) {
  function getItem(item) {
    return item instanceof Item
      ? item
      : typeof item === 'string'
        ? new Raster({
            source: 'data:image/svg+xml;base64,' + window.btoa(item),
            insert: false
          })
        : null
  }

  actual = getItem(actual)
  expected = getItem(expected)
  actual.position = expected.position

  function compare() {
    comparePixels(
      actual,
      expected,
      message,
      Base.set({ tolerance: 1e-3, resolution: 72 }, options)
    )
    done()
  }

  if (expected instanceof Raster) {
    expected.onLoad = compare
  } else if (actual instanceof Raster) {
    actual.onLoad = compare
  } else {
    compare()
  }
}

//
// Interactions helpers
//

export function triggerMouseEvent(type, point, target, flags) {
  // Depending on event type, events have to be triggered on different elements
  // due to the event handling implementation (see `viewEvents` and `docEvents`
  // in View.js). And we cannot rely on the fact that event will bubble from
  // canvas to document, since the canvas used in tests is not inserted in DOM.
  target = target || (type === 'mousedown' ? paper.view.element : document)
  const event = new window.MouseEvent(
    type,
    Base.set(
      {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: point.x,
        clientY: point.y,
        screenX: point.x,
        screenY: point.y
      },
      flags
    )
  )
  target.dispatchEvent(event)
  return event
}

export function triggerKeyEvent(type, key, modifiers) {
  const event = new window.KeyboardEvent(
    type,
    Base.set(
      {
        bubbles: true,
        cancelable: true,
        key,
        charCode: type === 'keypress' ? key.charCodeAt(0) : 0
      },
      modifiers
    )
  )
  document.dispatchEvent(event)
}

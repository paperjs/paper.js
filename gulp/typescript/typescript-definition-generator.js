/**
 * This script generates a type definition by taking JSDoc roughly parsed data,
 * formatting it and passing it to a mustache template.
 */

const fs = require('fs');
const mustache = require('mustache');

// Retrieve JSDoc data.
const data = JSON.parse(fs.readFileSync(__dirname + '/typescript-definition-data.json', 'utf8'));
const classes = data.classes;

// Format classes.
classes.forEach(cls => {
    // Format class.
    // Store name as `className` and not simply `name`, to avoid name conflict
    // in static constructors block.
    cls.className = cls._name;
    // Store closest parent if there is one.
    cls.extends = cls.inheritsFrom && cls.inheritsFrom.length > 0
        ? cls.inheritsFrom[0]
        : null;
    // Store comment using class tag as description.
    cls.comment = formatComment(cls.comment, 'class');

    // Build a filter for deprecated or inherited methods or properties.
    const filter = it => !it.deprecated && it.memberOf == cls.alias && !it.isNamespace;

    // Format properties.
    cls.properties = cls.properties
        .filter(filter)
        .map(it => ({
            name: it._name,
            type: formatType(it.type, { isProperty: true, isSettableProperty: !it.readOnly }),
            static: formatStatic(it.isStatic),
            readOnly: formatReadOnly(it.readOnly),
            comment: formatComment(it.comment)
        }));

    // Format methods.
    const methods = cls.methods
        .filter(filter)
        .map(it => {
            const name = formatMethodName(it._name);
            const isStaticConstructor = it.isStatic && it.isConstructor;
            return {
                name: name,
                // Constructors don't need return type.
                type: !it.isConstructor
                    ? formatType(getMethodReturnType(it), { isMethodReturnType: true })
                    : '',
                static: formatStatic(it.isStatic),
                // This flag is only used below to filter methods.
                isStaticConstructor: isStaticConstructor,
                comment: formatComment(it.comment, 'desc', it.isConstructor),
                params: it._params
                    ? it._params
                    // Filter internal parameters (starting with underscore).
                        .filter(it => !/^_/.test(it.name))
                        .map(it => formatParameter(it, isStaticConstructor && cls))
                        .join(', ')
                    : ''
            };
        })
        .sort(sortMethods);

    // Divide methods in 2 parts: static constructors and other. Because static
    // constructors need a special syntax in type definition.
    cls.methods = [];
    cls.staticConstructors = [];
    methods.forEach(method => {
        if (method.isStaticConstructor) {
            // Group static constructors by method name.
            let staticConstructors = cls.staticConstructors.find(it => it.name === method.name);
            if (!staticConstructors) {
                staticConstructors = {
                    name: method.name,
                    constructors: []
                };
                cls.staticConstructors.push(staticConstructors);
            }
            staticConstructors.constructors.push(method);
        } else {
            cls.methods.push(method);
        }
    });
    // Store a conveniance flag to check whether class has static constructors.
    cls.hasStaticConstructors = cls.staticConstructors.length > 0;
});

// PaperScope class needs to be handled slightly differently because it "owns"
// all the other classes as properties. Eg. we can do `new paperScope.Path()`.
// So we add a `classesPointers` property that the template will use.
const paperScopeClass = classes.find(_ => _.className === 'PaperScope');
paperScopeClass.classesPointers = classes.filter(_ => _.className !== 'PaperScope').map(_ => ({ name: _.className }));

// Since paper.js module is at the same time a PaperScope instance, we need to
// duplicate PaperScope instance properties and methods in the module scope.
// For that, we expose a special variable to the template.
const paperInstance = { ...paperScopeClass };
// We filter static properties and methods for module scope.
paperInstance.properties = paperInstance.properties.filter(_ => !_.static);
paperInstance.methods = paperInstance.methods.filter(_ => !_.static && _.name !== 'constructor');

// Format data trough a mustache template.
// Prepare data for the template.
const context = {
    paperInstance: paperInstance,
    classes: classes,
    version: data.version,
    date: data.date,
    // {{#doc}} blocks are used in template to automatically generate a JSDoc
    // comment with a custom indent.
    doc: () => formatJSDoc
};
// Retrieve template content.
const template = fs.readFileSync(__dirname + '/typescript-definition-template.mustache', 'utf8');
// Render template.
const output = mustache.render(template, context);
// Write output in a file.
fs.writeFileSync(__dirname + '/../../dist/paper.d.ts', output, 'utf8');


//
// METHODS
//

function formatReadOnly(isReadOnly) {
    return isReadOnly ? 'readonly ' : null;
}

function formatStatic(isStatic) {
    return isStatic ? 'static ' : null;
}

function formatType(type, options) {
    return ': ' + parseType(type, options);
}

function parseType(type, options) {
    // Always return a type even if input type is empty. In that case, return
    // `void` for method return type and `any` for the rest.
    if (!type) {
        return options.isMethodReturnType ? 'void' : 'any';
    }
    // Prefer `any[]` over `Array<any>` to be more consistent with other types.
    if (type === 'Array') {
        return 'any[]';
    }
    // Handle any type: `*` => `any`
    type = type.replace('*', 'any');
    // Check if type is a "rest" type (meaning that an infinite number of
    // parameter of this type can be passed). In that case, we need to remove
    // `...` prefix and add `[]` as a suffix:
    // - `...Type` => `Type[]`
    // - `...(TypeA|TypeB)` => `(TypeA|TypeB)[]`
    const isRestType = type.startsWith('...');
    if (isRestType) {
        type = type.replace(/^\.\.\./, '');
    }
    // Handle multiple types possibility by splitting on `|` then re-joining
    // back parsed types.
    type = type.split('|').map(splittedType => {
        // Get type without array suffix `[]` for easier matching.
        const singleType = splittedType.replace(/(\[\])+$/, '');
        // Handle eventual type conflict in static constructors block. For
        // example, in `Path.Rectangle(rectangle: Rectangle)` method,
        // `rectangle` parameter type must be mapped to `paper.Rectangle` as it
        // is declared inside a `Path` namespace and would otherwise be wrongly
        // assumed as being the type of `Path.Rectangle` class.
        if (options.staticConstructorClass && options.staticConstructorClass.methods.find(it => it.isStatic && it.isConstructor && formatMethodName(it._name) === singleType)
        ) {
            return 'paper.' + splittedType;
        }
        // Convert primitive types to their lowercase equivalent to suit
        // typescript best practices.
        if (['Number', 'String', 'Boolean', 'Object'].indexOf(singleType) >= 0) {
            splittedType = splittedType.toLowerCase();
        }
        // Properties `object` type need to be turned into `any` to avoid
        // errors when reading object properties. Eg. if `property` is of type
        // `object`, `property.key` access is forbidden.
        if (options.isProperty && splittedType === 'object') {
            return 'any';
        }
        return splittedType;
    }).join(' | ');
    if (isRestType) {
        type += '[]';
    }

    // We declare settable properties as nullable to be compatible with
    // TypeScript `strictNullChecks` option (#1664).
    if (options.isSettableProperty && type !== 'any') {
        type += ' | null';
    }

    return type;
}

function formatMethodName(methodName) {
    // Overloaded methods were parsed as `method^0`, `method^1`... here, we
    // turn them back to `method` as typescript allow overloading.
    methodName = methodName.replace(/\^[0-9]+$/, '');
    // Real contructors are called `initialize` in the library.
    methodName = methodName.replace(/^initialize$/, 'constructor');
    return methodName;
}

function formatParameter(param, staticConstructorClass) {
    let content = '';
    // Handle rest parameter pattern `...Type`. Parameter name needs to be
    // prefixed with `...` as in ES6. E.g. `...parameter: type[]`.
    if (param.type.match(/^\.\.\.(.+)$/)) {
        content += '...';
    }
    content += formatParameterName(param.name);
    // Optional parameters are formatted as: `parameter?: type`.
    if (param.isOptional) {
        content += '?';
    }
    content += formatType(param.type, { staticConstructorClass });
    return content;
}

function formatParameterName(parameterName) {
    // Avoid usage of reserved keyword as parameter name.
    // E.g. `function` => `callback`.
    if (parameterName === 'function') {
        return 'callback';
    }
    return parameterName;
}

function formatComment(comment, descriptionTagName = 'desc', skipReturn = false) {
    const tags = comment.tags;
    let content = '';

    // Retrieve description tag.
    const descriptionTag = tags.find(it => it.title === descriptionTagName);
    if (descriptionTag) {
        // Don't display group titles.
        content += descriptionTag.desc.replace(/\{@grouptitle .+?\}/g, '').trim();
    }

    // Preserve some of the JSDoc tags that can be usefull even in type
    // definition. Format their values to make sure that only informations
    // that make sense are kept. E.g. method parameters types are already
    // provided in the signature...
    content += formatCommentTags(tags, 'see');
    content += formatCommentTags(tags, 'option');
    content += formatCommentTags(tags, 'param', it => it.name + ' - ' + it.desc);

    if (!skipReturn) {
        content += formatCommentTags(tags, 'return', it => it.desc.trim().replace(/^\{|\}$/g, '').replace(/@([a-zA-Z]+)/, '$1'));
    }

    // Make sure links are followable (e.g. by IDEs) by removing parameters.
    // {@link Class#method(param)} => {@link Class#method}
    content = content.replace(/(\{@link [^\}]+?)\(.*?\)(\})/g, '$1$2');

    content = content.trim();
    return content;
}

function formatCommentTags(tags, tagName, formatter) {
    let content = '';
    // Default formatter simply outputs description.
    formatter = formatter || (it => it.desc);
    // Only keep tags that have a description.
    tags = tags.filter(it => it.desc && it.title === tagName);
    if (tags.length > 0) {
        content += '\n';
        // Display tag as it was in original JSDoc, followed by formatted value.
        tags.forEach(it => content += '\n@' + tagName + ' ' + formatter(it));
    }
    return content;
}

/**
 * This outputs a JSDoc comment indented at the given offset and including the
 * parsed comment for current mustache block.
 * @param {Number} offset the number of spaces to use for indentation
 * @param {Function} render the mustache render method
 * @return {string} the formatted JSDoc comment
 */
function formatJSDoc(offset, render) {
    // First render current block comment. Use `{{&}}` syntax to make sure
    // special characters are not escaped.
    let content = render('{{&comment}}');
    if (!content) {
        return '';
    }

    // Build indentation.
    offset = parseInt(offset);
    if (offset > 0) {
        offset++;
    }
    const indentation = new Array(offset).join(' ');

    // Prefix each line with the indentation.
    content = content.split('\n')
        .map(_ => indentation + ' * ' + _)
        .join('\n');

    // Wrap content in JSDoc delimiters: `/**` and `*/`.
    return '/** \n' + content + '\n' + indentation + ' */';
}

function getMethodReturnType(method) {
    return method.returnType || method.returns.length > 0 && method.returns[0].type;
}

function sortMethods(methodA, methodB) {
    // This places constructors before other methods as it is a best practice.
    // This also place constructors with only one object parameter after other
    // constructors to avoid type inference errors due to constructors
    // overloading order. E.g. if `constructor(object: object)` is defined
    // before `constructor(instance: Class)`, calling `constructor(instance)`
    // will always be mapped to `contructor(object: object)`, since everything
    // is an object in JavaScript. This is problematic because most of Paper.js
    // classes have a constructor accepting an object.
    const aIsContructor = methodA.name === 'constructor';
    const bIsContructor = methodB.name === 'constructor';
    if (aIsContructor && bIsContructor) {
        if (methodA.params === 'object: object') {
            return 1;
        }
        if (methodB.params === 'object: object') {
            return -1;
        }
    } else if (aIsContructor) {
        return -1;
    } else if (bIsContructor) {
        return 1;
    }
    return 0;
}

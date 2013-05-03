
Vector boolean operations on paperjs objects.
This is mostly written for clarity (I hope it is clear) and compatibility,
not optimised for performance, and has to be tested heavily for stability.

(Looking up to Java's Area path boolean algorithms for stability,
but the code is too complex —mainly because the operations are stored and
enumerable, such as quadraticCurveTo, cubicCurveTo etc.; and is largely
undocumented to directly adapt from)

Supported
- paperjs Path and CompoundPath objects
- Boolean Union
- Boolean Intersection
- Boolean Subtraction
- Resolving a self-intersecting Path

Not supported yet ( which I would like to see supported )
- Boolean operations between self-intersecting Paths
- Paths are clones of each other that ovelap exactly on top of each other!

This is meant to be integrated into the paperjs library in the near future.

------
Harikrishnan Gopalakrishnan
http://hkrish.com/playground/paperjs/booleanStudy.html

------
Paperjs
Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
http://paperjs.org/license/

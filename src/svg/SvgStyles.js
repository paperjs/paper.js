var SvgStyles = Base.each({
	fillColor: 'fill',
	strokeColor: 'stroke',
	strokeWidth: 'stroke-width',
	strokeCap: 'stroke-linecap',
	strokeJoin: 'stroke-linejoin',
	miterLimit: 'stroke-miterlimit',
	dashArray: 'stroke-dasharray',
	dashOffset: 'stroke-dashoffset'
}, function(attr, prop) {
	this.attributes[attr] = this.properties[prop] = {
		type: /Color$/.test(prop)
			? 'color'
			: prop == 'dashArray'
				? 'array'
				: 'value',
		property: prop,
		attribute: attr,
		getter: 'get' + Base.capitalize(prop)
	};
}, {
	properties: {},
	attributes: {}
});

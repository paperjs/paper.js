/**
 * @name Format
 * @namespace
 * @private
 */
var Format = new function() {
	// Cache for precision values, linking prec -> Math.pow(10, prec)
	var precisions = {};

	function number(val, prec) {
		prec = prec
				? precisions[prec] || (precisions[prec] = Math.pow(10, prec))
				: 100000; // Default is 5
		return Math.round(val * prec) / prec;
	}

	function point(val, prec, separator) {
		return number(val.x, prec) + (separator || ',') + number(val.y, prec);
	}

	function size(val, prec, separator) {
		return number(val.width, prec) + (separator || ',')
				+ number(val.height, prec);
	}

	function rectangle(val, prec, separator) {
		return point(val, prec, separator) + (separator || ',')
				+ size(val, prec, separator);
	}

	return {
		/**
		 * Utility function for rendering numbers as strings at a precision of
		 * up to the amount of fractional digits.
		 *
		 * @param {Number} num the number to be converted to a string
		 * @param {Number} [precision=5] the amount of fractional digits.
		 */
		number: number,
		point: point,
		size: size,
		rectangle: rectangle
	};
};

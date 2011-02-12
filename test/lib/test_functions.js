function compareSegmentLists(list1, list2) {
	equal(list1.length, list2.length, 'segment count');
	if(list1.length == list2.length) {
		for(var i = 0, l = list1.length; i < l; i++) {
			compareSegments(list1[i], list2[i]);
		}
	}
}

function compareSegments(segment1, segment2) {
	var points = ['point', 'handleIn', 'handleOut'];
	for(var i = 0; i < 3; i++) {
		equals(!!segment1[points[i]], !!segment2[points[i]], 'have ' + points[i]);
		if(segment1[points[i]] && segment2[points[i]])
			comparePoints(segment1[points[i]], segment2[points[i]], points[i]);
	}
}

function comparePoints(point1, point2, message) {
	equals(Math.round(point1.x * 100), Math.round(point2.x * 100), message + ' x');
	equals(Math.round(point1.y * 100), Math.round(point2.y * 100), message + ' y');
}
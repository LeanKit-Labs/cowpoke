const toArray = require("../../src/strToArray");

function arraysEqual(arr1, arr2) {
	if (arr1.length !== arr2.length) {
		return false;
	} 
	for (var i = arr1.length; i--;) {
		if (arr1[i] !== arr2[i]) {
			return false;
		}
	}

	return true;
}

describe("Should parse a comma sperated list", () => {
	
	it("should handle empty string",  (done) => {
		if (toArray("", ",").length === 0) {
			done();
		}
	});
	it("should handle null string",  (done) => {
		if (toArray(null, ",").length === 0) {
			done();
		}
	});
	it("should handle undefiend string",  (done) => {
		if (toArray(undefined, ",").length === 0) {
			done();
		}
	});
	it("should handle trailing comma string",  (done) => {
		if (arraysEqual(toArray("abc,", ","), ["abc"])) {
			done();
		}
	});
	it("should handle leading comma string",  (done) => {
		if (arraysEqual(toArray(",abc", ","), ["abc"])) {
			done();
		}
	});
	it("should handle multiple elements string",  (done) => {
		if (arraysEqual(toArray("abc,efg", ","), ["abc", "efg"])) {
			done();
		}
	});
	it("should handle single elements string",  (done) => {
		if (arraysEqual(toArray("abc", ","), ["abc"])) {
			done();
		}
	});
	it("should handle an all whitespace entry", (done) => {
		if (arraysEqual(toArray("abc, ,efg", ","), ["abc","efg"])) {
			done();
		}
	});
	
});

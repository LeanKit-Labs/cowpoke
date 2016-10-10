module.exports = function(str, delm) {
	if (str) {
		return str.split(delm).map(elm => elm.trim()).filter(elm => elm !== "");
	} else {
		return [];
	}
};

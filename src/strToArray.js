module.exports = function( str, delm ) {
	return str ? str.split( delm ).map( elm => elm.trim() ).filter( elm => elm !== "" ) : [];
};

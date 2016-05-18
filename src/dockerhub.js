var rp = require( "request-promise" );
var urlencode = require( "urlencode" );
var when = require( "when" );

function onRequest( body ) {
	return body;
}

function onError( err ) {
	console.error( "There was an error checking a tags existance on docker hub, ", err );
	return [];
}

function listTags( namesapce, name ) {
	var options = {
		uri: "https://registry.hub.docker.com/v1/repositories/" + urlencode( namesapce ) + "/" + urlencode( name ) + "/tags",
		json: true,
		headers: {
			Authorization: "Basic " + new Buffer( process.env.DOCKER_USER + ":" + process.env.DOCKER_PASS ).toString( "base64" )
		}
	};
	return rp( options ).then( onRequest ).catch( onError );
}

function checkExistance( namesapce, name, tag ) {
	return listTags( namesapce, name ).then( function( tags ) {
		var arrayFound = tags.filter( function( item ) {
			return item.name == tag;
		} );
		return arrayFound.length !== 0;
	} );
}

module.exports = {
	checkExistance: checkExistance,
	listTags: listTags
};

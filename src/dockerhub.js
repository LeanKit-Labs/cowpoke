var rp = require( "request-promise" );
var urlencode = require( "urlencode" );
var util = require( "./util" );
var format = require( "util" ).format;

var uri = "https://registry.hub.docker.com/v2/%s/%s/tags/list";
var authUriu = "https://auth.docker.io/token?service=registry.docker.io&scope=repository:%s/%s:pull"

function onRequest( body ) {
	return body;
}

function onError( err ) {
	console.error( "There was an error checking a tags existance on docker hub. Request Error: ", err.message );
	return undefined;
}
function auth( namesapce, name ) {
	var options = {
		uri: format( authUriu, urlencode( namesapce ), urlencode( name ) ),
		json: true,
		headers: {
			Authorization: "Basic " + new Buffer( process.env.DOCKER_USER + ":" + process.env.DOCKER_PASS ).toString( "base64" )
		}
	};
	return rp( options ).then( function(res) {
		return res.token;
	}, onError ).catch( onError );
}

function listTags( namesapce, name, token ) {
	var options = {
		uri: format( uri, urlencode( namesapce ), urlencode( name ) ),
		json: true,
		headers: {
			Authorization: "Bearer " + token
		}
	};
	return rp( options ).then( function (res) {
		return res.tags;
	}, onError ).catch( onError );
}

function checkExistance( image ) {
	var info = util.getImageInfo( image );
	return auth(info.docker.repo, info.docker.image).then(listTags.bind( null, info.docker.repo, info.docker.image )).then( function( tags ) {
		if ( tags ) {
			var arrayFound = tags.filter( function( item ) {
				return item === info.docker.tag;
			} );
			return arrayFound.length !== 0;
		} else {
			return undefined;
		}
	} );
}

module.exports = {
	checkExistance: checkExistance
};

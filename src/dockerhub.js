var rp = require( "request-promise" );
var urlencode = require( "urlencode" );
var when = require( "when" );
var parallel = require( "when/parallel" );
var util = require( "./util" );
var format = require( "util" ).format;

var uri = "https://registry.hub.docker.com/v1/repositories/%s/%s/tags";

function onRequest( body ) {
	return body;
}

function onError( err ) {
	console.error( "There was an error checking a tags existance on docker hub. Request Error: ", err.message );
	return undefined;
}

function find ( data, valueToFind, foundToken ) {
	for ( var element in data ) {
		if ( foundToken.found ) {
			break;
		} else if ( data[element].name === valueToFind) {
			foundToken.found = true;
			return true;
		}
	}
	return false;
}

function findParallel( data, valueToFind, chunkSize ) {
	var numTasks = ( data.length / chunkSize );
	var tasks = [];

	var chunkStart = 0;
	var chunkEnd = chunkSize;

	for ( var i = 0; i < numTasks; i++ ) {
		var chunk = data.slice( chunkStart, chunkEnd );
		tasks.push( find.bind( null, chunk ) );
		chunkStart = chunkStart + chunkSize;
		chunkEnd = chunkEnd + chunkSize;
	}
	return parallel( tasks, valueToFind, { found: false } ).then( function( results ) {
		for ( var res in results ) {
			if ( results[res] ) {
				return true;
			}
		}
		return false;
	} );
}

function listTags( namesapce, name ) {
	var options = {
		uri: format( uri, urlencode( namesapce ), urlencode( name ) ),
		json: true,
		headers: {
			Authorization: "Basic " + new Buffer( process.env.DOCKER_USER + ":" + process.env.DOCKER_PASS ).toString( "base64" )
		}
	};
	return rp( options ).then( onRequest, onError ).catch( onError );
}

function checkExistance( image ) {
	var info = util.getImageInfo( image );
	return listTags( info.docker.repo, info.docker.image ).then( function( tags ) {
		if ( tags ) {
			if ( tags.length >= 16 ) {
				return findParallel( tags, info.docker.tag, Math.ceil( tags.length / 16 ) );
			} else {
				var arrayFound = tags.filter( function( item ) {
					return item.name === info.docker.tag;
				} );
				return arrayFound.length !== 0;
			}
		} else {
			return undefined;
		}
	} );
}

module.exports = {
	checkExistance: checkExistance
};

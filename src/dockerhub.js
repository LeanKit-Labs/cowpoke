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
	console.error( "There was an error checking a tags existance on docker hub, ", err );
	return [];
}

const find = ( data, valueToFind, foundToken ) => {
	for ( var element of data ) {
		if ( foundToken.found ) {
			break;
		} else if ( element.name.toLowerCase() === valueToFind.toLowerCase() ) {
			foundToken.found = true;
			return true;
		}
	}
	return false;
};

function findParallel( data, valueToFind, chunkSize ) {
	const numTasks = ( data.length / chunkSize );
	const tasks = [];

	let chunkStart = 0;
	let chunkEnd = chunkSize;

	for ( let i = 0; i < numTasks; i++ ) {
		let chunk = data.slice( chunkStart, chunkEnd );
		tasks.push( find.bind( null, chunk ) );
		chunkStart = chunkStart + chunkSize;
		chunkEnd = chunkEnd + chunkSize;
	}
	return parallel( tasks, valueToFind, { found: false } ).then( results => {
		for ( var res of results ) {
			if ( res ) {
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
	return rp( options ).then( onRequest ).catch( onError );
}

function checkExistance( image ) {
	var info = util.getImageInfo( image );
	return listTags( info.docker.repo, info.docker.image ).then( function( tags ) {
		if ( tags.length >= 16 ) {
			return findParallel( tags, info.docker.tag, Math.ceil( tags.length / 16 ) );
		} else {
			var arrayFound = tags.filter( function( item ) {
				return item.name.toLowerCase() === info.docker.tag.toLowerCase();
			} );
			return arrayFound.length !== 0;
		}
	} );
}

module.exports = {
	checkExistance: checkExistance
};

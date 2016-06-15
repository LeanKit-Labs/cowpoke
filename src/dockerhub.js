const rp = require( "request-promise" );
const urlencode = require( "urlencode" );
const parallel = require( "when/parallel" );
const util = require( "./util" );
const format = require( "util" ).format;

const uri = "https://registry.hub.docker.com/v1/repositories/%s/%s/tags";

function find ( data, valueToFind, foundToken ) {
	for ( let element in data ) {
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

	return parallel( tasks, valueToFind, {found: false} ).then( results => {
		for ( let res in results ) {
			if ( results[res] ) {
				return true;
			}
		}
		return false;
	} );
}

function listTags( namesapce, name ) {
	const options = {
		uri: format( uri, urlencode( namesapce ), urlencode( name ) ),
		json: true,
		headers: {
			Authorization: "Basic " + new Buffer( process.env.DOCKER_USER + ":" + process.env.DOCKER_PASS ).toString( "base64" )
		}
	};
	return rp( options ).then( body => body, () => undefined ).catch( () => undefined );
}

function checkExistance( image ) {
	const info = util.getImageInfo( image );
	return listTags( info.docker.repo, info.docker.image ).then(  tags => {
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

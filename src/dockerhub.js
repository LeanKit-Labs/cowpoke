const rp = require( "request-promise" );
const urlencode = require( "urlencode" );
const parallel = require( "when/parallel" );
const poll = require( "when/parallel" );
const promise = require( "bluebird" );
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

let checkDockerProcess = promise.coroutine( function* ( namesapce, name, target ) {

	//poll for 20 seconds to see if tag is found. The drone-cowpoke plugin may have 
	//just pushed the tag and it may not have registered with docker yet	
	let interval = 125;
	const startDate = new Date().getTime();
	while (new Date().getTime() - startDate <= 20000) {
		let found = false;
		const tags = yield listTags( namesapce, name );
		//check to see if error
		if (tags === undefined) {
			return undefined;
		}
		if ( tags.length >= 16 ) {
			found = yield findParallel( tags, target, Math.ceil( tags.length / 16 ) );
		} else {
			found = tags.filter( function( item ) {
				return item.name === target;
			} ).length !== 0;
		}
		//if we found it return true
		if (found) {
			return true;
		}
		//else continue polling
		interval *= 2;
		yield promise.delay(interval);
	}
	//if noting was found return false
	return false;

});

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
	return checkDockerProcess( info.docker.repo, info.docker.image, info.docker.tag);
}

module.exports = {
	checkExistance: checkExistance
};

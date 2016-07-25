const rp = require( "request-promise" );
const urlencode = require( "urlencode" );
const promise = require( "bluebird" );
const util = require( "./util" );
const format = require( "util" ).format;

const uri = "https://registry.hub.docker.com/v2/%s/%s/tags/list";
const authUri = "https://auth.docker.io/token?service=registry.docker.io&scope=repository:%s/%s:pull";

const checkTag = promise.coroutine( function* ( user, pass, namespace, name, target ) {

	//authenticate
	const token = yield rp( {
		uri: format( authUri, urlencode( namespace ), urlencode( name ) ),
		json: true,
		headers: {
			Authorization: "Basic " + new Buffer( user + ":" + pass ).toString( "base64" )
		}
	} ).then(res => res.token).catch( () => undefined );
	if (!token) {
		return undefined;
	}
	//get tags
	const tags = yield rp({
		uri: format( uri, urlencode( namespace ), urlencode( name ) ),
		json: true,
		headers: {
			Authorization: "Bearer " + token
		}
	}).then(res => res.tags).catch( () => undefined );
	if (!tags) {
		return undefined;
	}

	const arrayFound = tags.filter( function( item ) {
		return item === target;
	});

	return arrayFound.length !== 0;

});

function checkExistance( user, pass, image ) {
	const info = util.getImageInfo( image );
	return checkTag( user, pass, info.docker.repo, info.docker.image, info.docker.tag);
}

module.exports = function setup(user, pass){
	return {
		checkExistance: checkExistance.bind(null, user, pass)
	};
};

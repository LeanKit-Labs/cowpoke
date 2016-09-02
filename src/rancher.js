const _ = require( "lodash" );
const request = require( "request" );
const urlLib = require( "url" );
const Promise = require("bluebird");

function get( url, credentials, path ) {
	let route = /$http(s)?[:]/.test( path ) ?
		path : urlLib.resolve( url, path );
	return new Promise( (resolve, reject ) => {
		function onResult( err, result ) {
			if ( err ) {
				reject( err );
			} else {
				resolve( JSON.parse( result.body ) );
			}
		}
		request.get( route, onResult )
			.auth( credentials.key, credentials.secret );
	} );
}

function post( url, credentials, path, body ) {
	const route = /$http(s)?[:]/.test( path ) ?
		path : urlLib.resolve( url, path );
	return new Promise( ( resolve, reject ) => {
		request( {
			url: route,
			method: "POST",
			json: true,
			headers: {"content-type": "application/json"},
			body: body
		}, ( err, result ) => {
			if ( err ) {
				reject( err );
			} else {
				resolve( result.body );
			}
		} )
		.auth( credentials.key, credentials.secret );
	} );
}

const upgradeStack = Promise.coroutine(function*(http, stack, template) {
	const idParts = stack.externalId.split("//");
	const versionInfo = idParts[1].split(":");
	let newStack = yield http.post( stack.actions.upgrade, {
		externalId: idParts[0] + "//" + versionInfo[0] + ":" + versionInfo[1] + ":" + template.version,
		dockerCompose: template["docker-compose.yml"],
		rancherCompose: template["rancher-compose.yml"],
		environment: stack.environment
	});
	while (newStack.state !== "upgraded") {
		yield Promise.delay(500);
		newStack = yield http.get( stack.links.self, {} );
	}
	newStack = yield http.post( newStack.actions.finishupgrade, {} );

	return newStack;
});

function listStacks( http, stackUrl) {
	return http.get( stackUrl ).then( result => {
		const data = result.data;
		for ( let i = 0; i < data.length; i++ ) {
			data[i].upgrade = upgradeStack.bind( null, http, data[i] );
		}
		return data;
	}, error => error );
}

function listEnvironments(http) {
	return http.get("/v1/projects").then(res => res.data.map(elm => {
		elm.listStacks = listStacks.bind( null, http, elm.links.environments, elm.name );
		elm.listContainers = http.get.bind( null, elm.links.containers );
		return elm;
	}));
}

function init( url, credentials ) {
	const http = {
		get: get.bind( null, url, credentials ),
		post: post.bind( null, url, credentials )
	};
	return http.get( "v1" )
		.then(  metadata => {
			if (metadata.code === "Unauthorized") {
				throw new Error("Rancher environment authorization failed");
			}
			return {
				listEnvironments: listEnvironments.bind(null, http)
			};
		} );
}

module.exports = init;

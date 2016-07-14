const _ = require( "lodash" );
const request = require( "request" );
const urlLib = require( "url" );
const util = require( "./util" );
const when = require( "when" );
const Promise = require("bluebird");


function get( url, credentials, path ) {
	let route = /$http(s)?[:]/.test( path ) ?
		path : urlLib.resolve( url, path );
	return when.promise( ( resolve, reject ) => {
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
	return when.promise( ( resolve, reject ) => {
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

function listEnvironments( http, actions ) {
	return http.get( actions.projects ).then( result => {
		const data = result.data;
		return _.reduce( data, ( acc, environment ) => {
			const obj = {
				id: environment.id,
				name: environment.name,
				state: environment.state,
				listStacks: listStacks.bind( null, http, environment.links.environments, environment.name ),
				listContainers: http.get.bind( null, environment.links.containers ),
				listServices: listServices.bind( null, http, environment.links.services, environment.name, "" )
			};
			obj.upgrade = upgradeAll.bind( null, http, obj );
			acc[environment.name] = obj;
			return acc;
		}, {} );
	}, error => error );
}

function listServices( http, serviceUrl, environment, stack ) {
	return http.get( serviceUrl ).then( result => {
		const data = result.data;
		return _.reduce( data, ( acc, service ) => {
			if ( service.type === "service" ) {
				acc[service.id] = parseService( service, http, environment, stack );
			}
			return acc;
		}, {} );
	}, error => error );
}

const upgradeStack = Promise.coroutine(function*(http, stack, template) {
	let newStack = yield http.post( stack.actions.upgrade, {
		externalId: stack.externalId.substring( 0, stack.externalId.lastIndexOf( ":" ) - 1 ) + template.version,
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

function listStackServices(http, stack) {
	return http.get(stack.links.services, {}).then( res => {
		return _.reduce(res.data, (result, value) => {
			if (value.kind === "service") {
				result.push(parseService(value, http, "", ""));
			}
			return result;
		}, []);
	});
};

function listStacks( http, stackUrl) {
	return http.get( stackUrl ).then( result => {
		const data = result.data;
		for ( let i = 0; i < data.length; i++ ) {
			data[i].upgrade = upgradeStack.bind( null, http, data[i] );
			data[i].listServices = listStackServices.bind(null, http, data[i]);
		}
		return data;
	}, error => error );
}

function finishUpgrade( http, finishURL, service, environment, stack ) {
	return http.post( finishURL, {} ).then( result => parseService( result, http, environment, stack ), error => error );
}

function parseService( service, http, environment, stack ) {
	const definition = {
		id: service.id,
		name: service.name,
		environmentId: service.accountId,
		environmentName: environment,
		stackId: service.environmentId,
		stackName: stack,
		description: service.description,
		state: service.state,
		launchConfig: service.launchConfig,
		secondaryLaunchConfig: service.secondaryLaunchConfig,
		droneImage: service.launchConfig.imageUuid.replace( /^docker[:]/, "" ),
		buildInfo: util.getImageInfo( service.launchConfig.imageUuid )
	};
	if ( definition.transitioning !== "no" ) {
		definition.transition = {
			error: service.transitioning === "error",
			status: service.transitionMessage,
			progress: service.transitionProgress,
			upgrade: service.upgrade
		};
	}
	definition.upgrade = upgradeService.bind( null, http, service.actions.upgrade, definition, environment, stack );
	if ( service.actions.finishupgrade ) {
		definition.finish = finishUpgrade.bind( null, http, service.actions.finishupgrade, definition, environment, stack );
	}
	return definition;
}

function upgradeAll( http, environment, dockerImage ) {
	const newInfo = util.getImageInfo( dockerImage );
	return environment.listServices()
		.then( list => _.filter( list, service => util.shouldUpgrade( service, newInfo )), () => [] )
		.then( list => {
			if ( list.length > 0 ) {
				return when.all( _.map( list,  service => service.upgrade( dockerImage )) );
			} else {
				return [];
			}
		});
}

function upgradeService( http, upgradeUrl, service, environment, stack, dockerImage ) {
	if ( util.shouldUpgrade( service, util.getImageInfo( dockerImage ) ) ) {
		const newLaunchConfig = _.cloneDeep( service.launchConfig );
		newLaunchConfig.imageUuid = "docker:" + dockerImage;
		const body = {
			inServiceStrategy: {
				launchConfig: newLaunchConfig,
				secondaryLaunchConfig: service.secondaryLaunchConfig,
				startFirst: false
			}
		};
		return http.post( upgradeUrl, body )
			.then( result => parseService( result, http, environment, stack ), error => error );
	} else {
		return when( {upgraded: false, service: service} );
	}
}

function init( url, credentials ) {
	let actions = {};
	const http = {
		get: get.bind( null, url, credentials ),
		post: post.bind( null, url, credentials )
	};
	return http.get( "v1" )
		.then(  metadata => {
			actions = metadata.links;
			return {
				listEnvironments: listEnvironments.bind( null, http, actions )
			};
		} );
}
module.exports = init;

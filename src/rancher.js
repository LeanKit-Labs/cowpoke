var _ = require( "lodash" );
var request = require( "request" );
var semver = require( "semver" );
var urlLib = require( "url" );
var util = require( "./util" );
var when = require( "when" );
//var log = console.log;

function get( url, credentials, path ) {
	var route = /$http(s)?[:]/.test( path ) ?
		path : urlLib.resolve( url, path );
	return when.promise( function( resolve, reject ) {
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
	var route = /$http(s)?[:]/.test( path ) ?
		path : urlLib.resolve( url, path );
	return when.promise( function( resolve, reject ) {
		function onResult( err, result ) {
			if ( err ) {
				reject( err );
			} else {
				resolve( result.body );
			}
		}
		request( {
			url: route,
			method: "POST",
			json: true,
			headers: { "content-type": "application/json" },
			body: body
		}, onResult )
			.auth( credentials.key, credentials.secret );
	} );
}

function listEnvironments( http, actions ) {
	function onList( result ) {
		var data = result.data;
		return _.reduce( data, function( acc, environment ) {
			var obj = {
				id: environment.id,
				name: environment.name,
				state: environment.state,
				listStacks: listStacks.bind( null, http, environment.links.environments, environment.name ),
				listContainers: http.get.bind( null, environment.links.containers ),
				listServices: listServices.bind( null, http, environment.links.services, environment.name, "" )
			};
			obj.upgrade = upgradeAll.bind( null, http, obj );
			acc[ environment.name ] = obj;
			return acc;
		}, {} );
	}

	function onError( error ) {
		return error;
	}
	return http.get( actions.projects )
		.then( onList, onError );
}

function listServices( http, serviceUrl, environment, stack ) {
	function onList( result ) {
		var data = result.data;
		return _.reduce( data, function( acc, service ) {
			if ( service.type == "service" ) {
				acc[ service.id ] = parseService( service, http, environment, stack );
			}
			return acc;
		}, {} );
	}

	function onError( error ) {
		return error;
	}
	return http.get( serviceUrl )
		.then( onList, onError );
}

function listStacks( http, stackUrl, environment ) {
	function onList( result ) {
		var data = result.data;
		return _.reduce( data, function( acc, stack ) {
			acc[ stack.name ] = {
				id: stack.id,
				name: stack.name,
				environmentId: stack.accountId,
				environmentName: environment,
				description: stack.description,
				state: stack.state,
				listServices: listServices.bind( null, http, stack.links.services, environment, stack.name )
			};
			return acc;
		}, {} );
	}

	function onError( error ) {
		return error;
	}
	return http.get( stackUrl )
		.then( onList, onError );
}

function finishUpgrade( http, finishURL, service, environment, stack ) {
	function onList( result ) {
		return parseService( result, http, environment, stack );
	}

	function onError( error ) {
		return error;
	}

	return http.post( finishURL, {} ).then( onList, onError );
}

function parseService( service, http, environment, stack ) {
	
	var definition = {
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
	
	var newInfo = util.getImageInfo( dockerImage );

	function onServices( list ) {
		return _.filter( list, function( service ) {
			return util.shouldUpgrade( service, newInfo );
		} );
	}

	function onServiceError( err ) {
		return [];
	}

	function onStacksError( err ) {
		return [];
	}

	function upgradeAffectedServices( list ) {
		if ( list.length > 0 ) {
			return when.all( _.map( list, function( service ) {
				return service.upgrade( dockerImage );
			} ) );
		} else {
			return [];
		}
	}

	return environment.listServices()
        .then( onServices, onServiceError )
        .then( upgradeAffectedServices );
}

function upgradeService( http, upgradeUrl, service, environment, stack, dockerImage ) {
	function onList( result ) {
		return parseService( result, http, environment, stack );
	}

	function onError( error ) {
		return error;
	}
	if ( util.shouldUpgrade( service, util.getImageInfo( dockerImage ) ) ) {
		var newLaunchConfig = _.cloneDeep( service.launchConfig );
		newLaunchConfig.imageUuid = "docker:" + dockerImage;
		var body = {
			inServiceStrategy: {
				launchConfig: newLaunchConfig,
				secondaryLaunchConfig: service.secondaryLaunchConfig,
				startFirst: false
			}
		};

		return http.post( upgradeUrl, body )
			.then( onList, onError );
	} else {
		return when( { upgraded: false, service: service } );
	}
}

function init( url, credentials ) {
	var actions = {};
	var http = {
		get: get.bind( null, url, credentials ),
		post: post.bind( null, url, credentials )
	};
	return http.get( "v1" )
		.then( function( metadata ) {
			actions = metadata.links;
			return {
				listEnvironments: listEnvironments.bind( null, http, actions )
			};
		} );
}
module.exports = init;

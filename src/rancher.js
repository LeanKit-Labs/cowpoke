var _ = require( "lodash" );
var request = require( "request" );
var semver = require( "semver" );
var urlLib = require( "url" );
var util = require( "./util" );
var when = require( "when" );
//var log = console.log;


function get( url, credentials, path ) {
    /*log("get in rancher.js: arguments =  " + JSON.stringify({
        url: url,
        credentials: credentials,
        path: path,
    }));*/
	var route = /$http(s)?[:]/.test( path ) ?
		path : urlLib.resolve( url, path );
	return when.promise( function( resolve, reject ) {
		function onResult( err, result ) {
            /*log("onResult in when.all() in get in rancher.js: arguments" + JSON.stringify({
                err: err,
                result: result
            }, null, 4));*/
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
    /*log("post in rancher.js: arguments =  " + JSON.stringify({
        url: url,
        credentials: credentials,
        path: path,
        body: body
    }));*/
	var route = /$http(s)?[:]/.test( path ) ?
		path : urlLib.resolve( url, path );
	return when.promise( function( resolve, reject ) {
		function onResult( err, result ) {
            /*log("onResult in when.all() in post in rancher.js: arguments" + JSON.stringify({
                err: err,
                result: result
            }, null, 4));*/
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
    /*log("listEnvironments in rancher.js: arguments =  " + JSON.stringify({
        http: http,
        actions: actions
    }));*/
	function onList( result ) {
        //log("onList in listEnvironments in rancher.js: result = " + JSON.stringify(result,  null, 4));
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
        //log("onError in listEnvironments in rancher.js: error = " + JSON.stringify(error,  null, 4));
		return error;
	}
	return http.get( actions.projects )
		.then( onList, onError );
}

function listServices( http, serviceUrl, environment, stack ) {
	function onList( result ) {
        //log("onList in listServices in rancher.js: result = " + JSON.stringify(result,  null, 4));
		var data = result.data;
		return _.reduce( data, function( acc, service ) {
			if (service.type == "service") {
				acc[ service.name ] = parseService( service, http, environment, stack );
			}
			return acc;
		}, {} );
	}

	function onError( error ) {
        //log("onError in listServices in rancher.js: error = " + JSON.stringify(error,  null, 4));
		return error;
	}
	return http.get( serviceUrl )
		.then( onList, onError );
}

function listStacks( http, stackUrl, environment ) {
	function onList( result ) {
        //log("onList in listStacks in rancher.js: result = " + JSON.stringify(result,  null, 4));
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
        //log("onError in listStacks in rancher.js: error = " + JSON.stringify(error,  null, 4));
		return error;
	}
	return http.get( stackUrl )
		.then( onList, onError );
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
	//log("parseService in rancher.js: definition = " + JSON.stringify(definition,  null, 4));
	if ( definition.transitioning !== "no" ) {
		definition.transition = {
			error: service.transitioning === "error",
			status: service.transitionMessage,
			progress: service.transitionProgress,
			upgrade: service.upgrade
		};
	}
	definition.upgrade = upgradeService.bind( null, http, service.actions.upgrade, definition, environment, stack );
	return definition;
}



function upgradeAll( http, environment, dockerImage ) {
	/*log("upgradeAll in rancher.js: arguments = " + JSON.stringify({
		environment: environment,
		dockerImage: dockerImage
	}, null, 4));*/
	var newInfo = util.getImageInfo( dockerImage );

    function onStackServices(stackServices) {
        var allservices = [];
        for (var i = 0; i < stackServices.length; i++) {
            for (var key in stackServices[i]) {
                if (stackServices[i].hasOwnProperty(key)) {
                    allservices.push(stackServices[i][key]);       
                }
            }
        }
        return onServices(allservices);
    }

    function onStacks(stacks) {
        var promises = [];
        for (var key in stacks) {
            if (stacks.hasOwnProperty(key)) {
                promises.push(stacks[key].listServices());
            }
        }

        return when.all(promises);
    }

	function onServices( list ) {
        //console.log("onServices in upgradeAll in rancher.js: list = " + JSON.stringify(list,  null, 4));
		return _.filter( list, function( service ) {
			return util.shouldUpgrade( service, newInfo );
		} );
	}

	function onServiceError( err ) {
        //log("onServiceError in upgradeAll in rancher.js: err = " + err.message);
		return [];
	}
    
    function onStacksError( err ) {
        //log("onServiceError in upgradeAll in rancher.js: err = " + err.message);
		return [];
	}

	function upgradeAffectedServices( list ) {
         //log("upgradeAffectedServices in upgradeAll in rancher.js: list = " + JSON.stringify(list,  null, 4));
		if ( list.length > 0 ) {
			return when.all( _.map( list, function( service ) {
				return service.upgrade( dockerImage );
			} ) );
		} else {
			return [];
		}
	}
   
	return  environment.listStacks().then(onStacks, onStacksError).then(onStackServices, onServiceError).then(upgradeAffectedServices);
    
    /*environment.listServices()
		.then( onServices, onServiceError )
		.then( upgradeAffectedServices );*/
}

function upgradeService( http, upgradeUrl, service, environment, stack, dockerImage ) {

	function onList( result ) {
        //log("onList in upgradeService in rancher.js: result = " + JSON.stringify(result,  null, 4));
		return parseService( result, http, environment, stack );
	}

	function onError( error ) {
        //log("onError in upgradeService in rancher.js: error = " + JSON.stringify(error,  null, 4));
		return error;
	}
    //log("upgradeService in rancher.js: image =" +dockerImage+ ", service = " + JSON.stringify(service, null, 4))
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

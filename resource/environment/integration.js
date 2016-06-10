
var _ = require( "lodash" );
var when = require( "when" );
var rancherFn = require( "../../src/rancher" );
var format = require( "util" ).format;
var environment = require( "../../src/data/nedb/environment" );
var statusIntervals = {};
var pendingUpgrade = {};

function onFinish( slack, channels, env, service ) {
	var message = format( "The upgrade of the service %s in environment %s has been finalized.", service.name, env.name );
	_.each( channels, function( channel ) {
		slack.send( channel, message );
	} );
}
function sendError( slack, channels, env, service ) {
	var message = format( "The finalization of the upgrade of the service %s in environment %s has failed.", service.name, env.name );
	_.each( channels, function( channel ) {
		slack.send( channel, message );
	} );
}
function onServiceList( env, channels, slack, services ) {
	_.each( services, function( service ) {
			if ( pendingUpgrade[ service.id ] && service.state === "upgraded" ) {
				delete pendingUpgrade[ service.id ];
				service.finish().then( onFinish.bind( null, slack, channels, env ), sendError.bind( null, slack, channels, env, service ) );
			}
		} );
}

function checkStatus( env, slack, channels ) {
	env.listServices().then( onServiceList.bind( null, env, channels, slack ) );
}

function createServiceChecks( env, slack, services, channels ) {
	_.each( services, function( service ) {
		if ( !statusIntervals[ service.environmentId ] ) {
			statusIntervals = setInterval( checkStatus.bind( null, env, slack, channels ), 5000 );
		}
		if ( !pendingUpgrade[ service.id ] ) {
			pendingUpgrade[ service.id ] = true;
		}
	} );
}

function onFailure( err ) {
	return {
		data: {
			message: err.message
		}, status: 500 };
}

function onSuccess( data ) {
	return { data: data };
}

function onUpdated( env ) {
	return {
		status: 200,
		data: env
	};
}

function onCreated() {
	return {
		data: {
			message: "Created"
		}
	};
}

function onError( err ) {
	return {
		status: 500,
		data: {
			message: "Failed due to server error."
		}
	};
}

function onEnvironment( data, env ) {
	try {
		env.slackChannels = env.slackChannels || [];
		_.each( data, function( item ) {
			if ( ( item.field === "slackChannels" || item.path === "/slackChannels" ) ) {
				if ( item.op === "add" ) {
					env.slackChannels.push( item.value );
				} else if ( item.op === "remove" ) {
					env.slackChannels = _.without( env.slackChannels, item.value );
				}
			}
		} );
		env.slackChannels = _.unique( env.slackChannels );
		return environment.add( env ).then( onUpdated.bind( null, env ), onError );
	} catch ( e ) {
		return {
			status: 400,
			data: {
				message: e.stack
			}
		};
	}
}

function onUpgradeError( name, error ) {
	return {
		status: 500,
		data: {
			error: error.stack,
			message: "An error occurred during upgrade of environment '" + name + "'"
		}
	};
}

function onChannels( image, env, services, slack, channels ) {
	if ( channels && channels.length && services && services.length ) {
		var names = _.pluck( _.flatten( services ), "name" );
		names[ 0 ] = "\n - " + names[ 0 ];
		var message = format( "Upgrading the following services to %s, hombre: %s",
		image, names.join( "\n - " ) );
		_.each( channels, function( channel ) {
			slack.send( channel, message );
		} );
		createServiceChecks( env, slack, services, channels );
	}
}

function onEnvironmentsLoaded( image, slack, environments ) {
	var name = _.keys( environments )[ 0 ];
	var env = environments[ name ];
	return env.upgrade( image ).then( onServices.bind( null, image, name, env, slack ), onUpgradeError.bind( null, name ) );
}

function onRancher( image, slack, rancher ) {
	return rancher.listEnvironments().then( onEnvironmentsLoaded.bind( null, image, slack ), onConnectionError );
}

function onConnectionError( error ) {
	return {
		status: 500,
		data: {
			message: "Could not connect to Rancher instance."
		}
	};
}

function onEnvironments( image, slack, environments ) {
	var upgrades = _.map( environments, function( env ) {
		return rancherFn( env.baseUrl, {
			key: env.key,
			secret: env.secret
		} ).then( onRancher.bind( null, image, slack ), onConnectionError );
	} );

	return when.all( upgrades ).then( function( lists ) {
		if ( lists.length > 0 ) {
			return {
				data: {
					upgradedServices: _.flatten( lists )
				}
			};
		} else {
			return {
				data: {
					message: "No services were eligible for upgrading"
				}
			};
		}
	} );
}

function onReadError( error ) {
	return {
		status: 404,
		data: {
			message: "Unable to get information for environment '" + name + "'"
		}
	};
}

function onServices( image, environmentName, env, slack, services ) {
	environment.getChannels( environmentName ).then( onChannels.bind( null, image, env, services, slack ) );
	return services;
}

function list() {
	return environment.getAll().then( onSuccess, onFailure );
}

function create( envelope ) {
	var data = envelope.data;
	if ( data.name && data.baseUrl && data.key && data.secret && data.slackChannels ) {
		return environment.add( data ).then( onCreated, onFailure );
	} else {
		return {
			data: {
			    message: "Invaild Environment"
		    }
		};
	}
}

function configure( envelope ) {
	var data = envelope.data;
	var name = data.environment;

	return environment.getByName( name ).then( onEnvironment.bind( null, data ), onError );
}

function upgrade( slack, envelope ) {
	var image = envelope.data.image;
	return environment.getAll().then( onEnvironments.bind( null, image, slack ), onReadError );
}

function getEnv( envelope ) {
	var name = envelope.data.environment;
	function onEnv( env ) {
		return env || {
			status: "404",
			data: {
			    message: "Environment Not Found"
			}
		};
	}
	return environment.getByName( name ).then( onEnv );
}

module.exports = {
	list: list,
	create: create,
	configure: configure,
	upgrade: upgrade,
	getEnv: getEnv
};


var _ = require( "lodash" );
var when = require( "when" );
var rancherFn = require( "../../src/rancher" );
var format = require( "util" ).format;
var environment = require( "../../src/data/nedb/environment" );

function onFailure( err ) {
	return { data: {
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
	console.log( "Error", err );
	return {
		status: 500,
		data: {
			message: "Failed due to server error."
		}
	};
}

function onEnvironment(image, env) {
	try {
		env.slackChannels = env.slackChannels || [];
		_.each( data, function( item ) {
			if( ( item.field === "slackChannels" || item.path === "/slackChannels" ) ) {
				if( item.op === "add" ) {
					env.slackChannels.push( item.value );
				} else if( item.op === "remove" ) {
					env.slackChannels = _.without( env.slackChannels, item.value );
				}
			}
		});
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
			message: "An error occurred during upgrade of environment '" + name + "'"
		}
	};
}

function onChannels( environment, services, channels ) {
	if( channels && channels.length && services && services.length ) {
		var names = _.pluck( _.flatten( services ), "name" );
		names[ 0 ] = "\n - " + names[ 0 ];
		var message = format( "Upgrading the following services to %s, hombre: %s",
		image, names.join( "\n - " ) );
		_.each( channels, function( channel ) {
			slack.send( channel, message );
		} );
		createServiceChecks( environment, slack, services, channels );
	}
}

function onEnvironmentsLoaded( image, environments ) {
	var name = _.keys( environments )[ 0 ];
	var environment = environments[ name ];
    var test = environment.upgrade( image ).then(onServices.bind( null, name, environment ), onUpgradeError.bind( null, name ));
	return test;
}

function onRancher(image, rancher ) {
    var test = rancher.listEnvironments().then( onEnvironmentsLoaded.bind(null, image), onConnectionError );
	return test;
}

function onConnectionError( error ) {
	return {
		status: 500,
		data: {
			message: "Could not connect to Rancher instance."
		}
	};
}

function onEnvironments(image, environments) {
	
	var upgrades = _.map( environments, function( env ) {
		return rancherFn( env.baseUrl, {
			key: env.key,
			secret: env.secret
		} ).then( onRancher.bind(null, image), onConnectionError );
	} );
	
	return when.all( upgrades ).then(function( lists ) {
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

function onServices( environmentName, env, services ) {
	var channels = environment.getChannels( environmentName ).then( onChannels.bind( null, env, services ) );
}


function list() {
	return environment.getAll().then(onSuccess, onFailure);
}

function create( envelope ) {
	var data = envelope.data;
	return environment.add( data ).then( onCreated, onFailure );
}

function configure( envelope ) {
	var data = envelope.data;
	var name = data.environment;
		return environment.getByName( name ).then( onEnvironment, onError );
}

function upgrade( envelope ) {
	var image = envelope.data.image;
	return environment.getAll().then( onEnvironments.bind(null, image), onReadError );
}


module.exports = {
	list: list,
	create: create,
	configure: configure,
	upgrade: upgrade
};

var _ = require( "lodash" );
var when = require( "when" );
var rancherFn = require( "../../src/rancher" );
var format = require( "util" ).format;
var environment = require( "../../src/data/nedb/environment" );
//var log = console.log;
var statusIntervals = {};
var pendingUpgrade = {};

function onServiceList( env, channels, slack, services ) {
        //log("onServiceList in integration.js: environment (env) = " + JSON.stringify(env, null, 4) + ", channels = " + JSON.stringify(channels, null, 4));
		_.each( services, function( service ) {
			if( pendingUpgrade[ service.id ] && service.state === "upgraded" ) {
                //log("Starting send process");
				var message = format( "The service %s in environment %s has upgraded successfully, amigo.",
					service.name, env.name );
				_.each( channels, function( channel ) {
					slack.send( channel, message );
				} );
				delete pendingUpgrade[ service.id ];
			}
		} );
	}

function checkStatus( env, slack, channels ) {
    //log("checkStatus in integration.js: slack = " + JSON.stringify(slack, null, 4) + ", environment = " + JSON.stringify(env, null, 4) +", channels = " + JSON.stringify(channels, null, 4)+", enviorment.js = " + JSON.stringify(environment, null, 4));
	env.listServices().then( onServiceList.bind( null, env, channels, slack ) );
}

function createServiceChecks( env, slack, services, channels ) {
    //log("createServiceChecks in integration.js: slack = " + JSON.stringify(slack, null, 4) + ", environment = " + JSON.stringify(environment, null, 4) + ", services = " + JSON.stringify(services, null, 4)+", channels = " + JSON.stringify(channels, null, 4));
	_.each( services, function( service ) {
		if( !statusIntervals[ service.environmentId ] ) {
			statusIntervals = setInterval( checkStatus.bind( null, env, slack, channels ), 5000 );
		}
		if( !pendingUpgrade[ service.id ] ) {
			pendingUpgrade[ service.id ] = true;
		}
	} );
    }

function onFailure( err ) {
    //log("onFailure in integration.js: err = " + JSON.stringify(err, null, 4));
	return { data: {
		message: err.message
	}, status: 500 };
}

function onSuccess( data ) {
    //log("onSuccess in integration.js: data = " + JSON.stringify(data, null, 4));
	return { data: data };
}

function onUpdated( env ) {
    //log("onUpdated in integration.js: env = " + JSON.stringify(env, null, 4));
    return {
		status: 200,
		data: env
	};
}

function onCreated() {
    //log("onCreated in integration.js");
		return {
			data: {
			message: "Created"
		}
	};
}


function onError( err ) {
    //log( "onError in integration.js: Error = ", err );
	return {
		status: 500,
		data: {
			message: "Failed due to server error."
		}
	};
}


function onEnvironment(data, env) {
    //log("onEnvironment in integration.js: data = " + JSON.stringify(data, null, 4) + "environment (env) = " + JSON.stringify(env, null, 4));
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
    //log("onUpgradeError in integration.js: name = "+name+", error = "+error.message);
	return {
		status: 500,
		data: {
            error: error.stack,
			message: "An error occurred during upgrade of environment '" + name + "'"
		}
	};
}

function onChannels( image, env, services, slack, channels) {
    //log("onChannels in integration.js: image = " + image + ", environment = " + JSON.stringify(env, null, 4) + ", channels = " + JSON.stringify(channels, null, 4));
	if( channels && channels.length && services && services.length ) {
       // log("Start the sending process");
		var names = _.pluck( _.flatten( services ), "name" );
		names[ 0 ] = "\n - " + names[ 0 ];
		var message = format( "Upgrading the following services to %s, hombre: %s",
		image, names.join( "\n - " ) );
		_.each( channels, function( channel ) {
            //log("Sending slack message: " + message + "to: " + channel);
			slack.send( channel, message );
		} );
		createServiceChecks( env, slack, services, channels );
	}
}

function onEnvironmentsLoaded( image, slack, environments ) {
    //log('onEnvironmentsLoaded in integration.js: image = ' + image + ", environments = " + JSON.stringify(environments, null, 4));
	var name = _.keys( environments )[ 0 ];
	var env = environments[ name ];
    return env.upgrade( image ).then(onServices.bind( null, image, name, env, slack ), onUpgradeError.bind( null, name )); //TODO
}

function onRancher(image, slack, rancher ) {
    //log('onRancher in integration.js: image = ' + image + 'rancher = ' + JSON.stringify(rancher, null, 4) );
    return rancher.listEnvironments().then( onEnvironmentsLoaded.bind(null, image, slack), onConnectionError );
}

function onConnectionError( error ) {
    //log('onConnectionError in integration.js: error = ' + JSON.stringify(error, null, 4));
	return {
		status: 500,
		data: {
			message: "Could not connect to Rancher instance."
		}
	};
}

function onEnvironments(image, slack, environments) {
	//log('onEnvironments in integration.js: image = ' + image + ', environments = ' + JSON.stringify(environments, null, 4));
	var upgrades = _.map( environments, function( env ) {
		return rancherFn( env.baseUrl, {
			key: env.key,
			secret: env.secret
		} ).then( onRancher.bind(null, image, slack), onConnectionError );
	} );
    
	return when.all( upgrades ).then(function( lists ) {
        //log('when.all callback insided onEnvironments in integration.js: upgradedServices = ' + JSON.stringify(lists, null, 4));
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
    //log('onReadError in integration.js: Recived error ' + JSON.stringify(error, null, 4));
	return {
		status: 404,
		data: {
			message: "Unable to get information for environment '" + name + "'"
		}
	};
}


function onServices( image, environmentName, env, slack, services ) {
    //log('onServices in integration.js. image = ' + image + ', environmentName = ' + environmentName + ', environment (env paramater) = ' + JSON.stringify(env, null, 4) + ", slack = " + JSON.stringify(slack, null, 4));
	environment.getChannels( environmentName ).then( onChannels.bind( null, image, env, services, slack ) );
    //console.log("onServices in integration.js: Returning: "+JSON.stringify(services, null, 4));
    return services;
}


function list() {
    //log('list in integration.js: Recived list call');
	return environment.getAll().then(onSuccess, onFailure);
}

function create( envelope ) {
//log('create in integration.js: Recived create call.');
	var data = envelope.data;
    if (data.name && data.baseUrl && data.key && data.secret && data.slackChannels) {
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
    //log('configure in integration.js: Recived configure call.');
	var data = envelope.data;
	var name = data.environment;

    return environment.getByName( name ).then( onEnvironment.bind(null, data), onError );
}

function upgrade(slack, envelope ) {
    //console.log('upgrade method in integration.js: Recived upgrade call.');
	var image = envelope.data.image;
    //log ('upgrade method in integration.js: image = ' + image);
	return environment.getAll().then( onEnvironments.bind(null, image, slack), onReadError );
}


module.exports = {
	list: list,
	create: create,
	configure: configure,
	upgrade: upgrade
};
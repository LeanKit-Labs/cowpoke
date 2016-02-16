
function onFailure( err ) {
	return { data: {
		message: err.message
	}, status: 500 };
}

function onSuccess( data ) {
	return { data: data };
}

var _ = require( "lodash" );
var when = require( "when" );
var rancherFn = require( "../../src/rancher" );
var format = require( "util" ).format;
var statusIntervals = {};
var pendingUpgrade = {};

function checkStatus( environment, slack, channels ) {
	function onServiceList( services ) {
		_.each( services, function( service ) {
			if( pendingUpgrade[ service.id ] && service.state === "upgraded" ) {
				var message = format( "The service %s in environment %s has upgraded successfully, amigo.",
					service.name, environment.name );
				_.each( channels, function( channel ) {
					slack.send( channel, message );
				} );
				delete pendingUpgrade[ service.id ];
			}
		} );
	}

	environment.listServices()
		.then( onServiceList.bind( null, slack, channels ) );
}

function createServiceChecks( environment, slack, services, channels ) {
	_.each( services, function( service ) {
		if( !statusIntervals[ service.environmentId ] ) {
			statusIntervals = setInterval( checkStatus.bind( null, environment, slack, channels ), 5000 );
		}
		if( !pendingUpgrade[ service.id ] ) {
			pendingUpgrade[ service.id ] = true;
		}
	} );
}

module.exports = function( host, environment, slack ) {
	return {
		name: "environment",
		actions: {
			list: {
				url: "/",
				method: "GET",
				handle: function() {
					return environment.getAll()
						.then( onSuccess, onFailure );
				}
			},
			create: {
				url: "/",
				method: "POST",
				handle: function( envelope ) {
					var data = envelope.data;
					function onCreated() {
						return {
							data: {
								message: "Created"
							}
						};
					}
					return environment.add( data )
						.then( onCreated, onFailure );
				}
			},
			configure: {
				url: "/:environment",
				method: "PATCH",
				handle: function( envelope ) {
					var data = envelope.data;
					var name = data.environment;

					function onUpdated( env ) {
						return {
							status: 200,
							data: env
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

					function onEnvironment( env ) {
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
							} );
							env.slackChannels = _.unique( env.slackChannels );
							return environment.add( env )
								.then( onUpdated.bind( null, env ), onError );
						} catch ( e ) {
							return {
								status: 400,
								data: {
									message: e.stack
								}
							};
						}
					}

					return environment.getByName( name )
						.then( onEnvironment, onError );
				}
			},
			upgrade: {
				url: "/:image",
				method: "PUT",
				handle: function( envelope ) {
					var image = envelope.data.image;

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

					function onEnvironmentsLoaded( environments ) {
						var name = _.keys( environments )[ 0 ];
						var environment = environments[ name ];
						return environment.upgrade( image )
							.then(
								onServices.bind( null, name, environment ),
								onUpgradeError.bind( null, name )
							);
					}

					function onRancher( rancher ) {
						return rancher.listEnvironments()
							.then( onEnvironmentsLoaded, onConnectionError );
					}

					function onConnectionError( error ) {
						return {
							status: 500,
							data: {
								message: "Could not connect to Rancher instance."
							}
						};
					}

					function onEnvironments( environments ) {
						var upgrades = _.map( environments, function( env ) {
							return rancherFn( env.baseUrl, {
									key: env.key,
									secret: env.secret
								} )
								.then( onRancher, onConnectionError );
						} );
						return when.all( upgrades )
							.then( function( lists ) {
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

					function onServices( environmentName, environment, services ) {
						var channels = environment.getChannels( environmentName )
							.then( onChannels.bind( null, environment, services ) );
					}

					return environment.getAll()
						.then( onEnvironments, onReadError );
				}
			}
		}
	};
};

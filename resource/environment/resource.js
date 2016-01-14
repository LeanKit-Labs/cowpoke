
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

module.exports = function( host, environment ) {
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

					function onEnvironmentsLoaded( environments ) {
						var name = _.keys( environments )[ 0 ];
						return environments[ name ].upgrade( image )
							.then( null, onUpgradeError.bind( null, name ) );
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

					return environment.getAll()
						.then( onEnvironments, onReadError );
				}
			}
		}
	};
};

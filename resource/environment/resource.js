
var integration = require( "./integration" );
var _ = require( "lodash" );
var when = require( "when" );
var rancherFn = require( "../../src/rancher" );
var format = require( "util" ).format;
var config = require( "configya" )( {
	file: "./config.json"
} );

function checkAuth( envelope, next, other ) {
	var userKey = envelope.headers.bearer;
	if ( !config.api.key || userKey === config.api.key ) {
		return next();
	} else {
		return { status: 402, data: { message: "Unauthorized" } };
	}
}

module.exports = function( host, environment, slack, dockerhub ) {
	return {
		name: "environment",
		middleware: [ checkAuth ],
		actions: {
			list: {
				url: "/",
				method: "GET",
				handle: integration.list
			},
			getEnv: {
				url: "/:environment",
				method: "GET",
				handle: integration.getEnv
			},
			create: {
				url: "/",
				method: "POST",
				handle: integration.create
			},
			configure: {
				url: "/:environment",
				method: "PATCH",
				handle: integration.configure
			},
			upgrade: {
				url: "/:image",
				method: "PUT",
				handle: integration.upgrade.bind( null, slack, dockerhub )
			}
		}
	};
};

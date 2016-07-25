
const integration = require( "./integration" );
const config = require( "configya" )( {
	file: "./config.json"
} );

function checkAuth( envelope, next ) {
	const userKey = envelope.headers.bearer;
	if ( !config.api.key || userKey === config.api.key ) {
		return next();
	} else {
		return {status: 402, data: {message: "giit"}};
	}
}

module.exports = function( host, environment, slack, dockerhub, github ) {
	return {
		name: "environment",
		middleware: [checkAuth],
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
			upgradeStack: {
				url: "/catalog",
				method: "POST",
				handle: integration.upgradeStack.bind( null, slack, dockerhub, github )
			},
			upgrade: {
				url: "/:image",
				method: "PUT",
				handle: integration.upgrade.bind( null, slack, dockerhub )
			}
		}
	};
};

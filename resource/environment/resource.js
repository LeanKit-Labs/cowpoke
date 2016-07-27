const integration = require( "./integration" );
const key = require( "configya" )( {
	file: "./config.json"
} ).api.key;

function checkAuth(envelope, next ) {
	const userKey = envelope.headers.bearer;
	if ( !key || userKey === key ) {
		return next();
	} else {
		return {status: 402, data: {message: "unauthorized"}};
	}
}

module.exports = function( host, environment, slack ) {
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
			uptrade: {
				url: "/",
				method: "PUT",
				handle: integration.upgradeStack.bind( null, slack )
			}
		}
	};
};

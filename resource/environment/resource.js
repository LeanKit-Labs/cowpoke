
const integration = require( "./integration" );

function checkAuth( envelope, next ) {
	const userKey = envelope.headers.bearer;
	if ( !process.env.COWPOKE_API_KEY || userKey === process.env.COWPOKE_API_KEY ) {
		return next();
	} else {
		return {status: 402, data: {message: "Unauthorized"}};
	}
}

module.exports = function( host, environment, slack, dockerhub ) {
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
			upgrade: {
				url: "/:image",
				method: "PUT",
				handle: integration.upgrade.bind( null, slack, dockerhub )
			}
		}
	};
};

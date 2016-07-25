
const integration = require( "./integration" );

function checkAuth( key, envelope, next ) {
	const userKey = envelope.headers.bearer;
	if ( !key || userKey === key ) {
		return next();
	} else {
		return {status: 402, data: {message: "giit"}};
	}
}

module.exports = function( host, environment, key, slack, githubToken ) {
	return {
		name: "environment",
		middleware: [checkAuth.bind(null, key)],
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
				url: "/catalog",
				method: "PUT",
				handle: integration.upgradeStack.bind( null, slack, githubToken )
			}
		}
	};
};

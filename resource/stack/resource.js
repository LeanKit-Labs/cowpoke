const stack = require( "./stack" );
const checkAuth = require( "../check-auth" );

module.exports = function( host, rancherUrl, user, slack, apiKey ) {
	return {
		name: "stack",
		middleware: [ checkAuth.bind( null, apiKey ) ],
		actions: {
			upgrade: {
				url: "/",
				method: "PATCH",
				handle: stack.upgradeStack.bind( null, rancherUrl, user, slack )
			}
		}
	};
};

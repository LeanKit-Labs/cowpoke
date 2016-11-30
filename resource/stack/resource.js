const stack = require( "./stack" );
const key = require( "configya" )( {
	file: "./config.json"
} ).api.key;
const checkAuth = require( "../checkauth" ).bind( null, key );

module.exports = function( host, rancherUrl, user, slack ) {
	return {
		name: "stack",
		middleware: [ checkAuth ],
		actions: {
			upgrade: {
				url: "/",
				method: "PATCH",
				handle: stack.upgradeStack.bind( null, rancherUrl, user, slack )
			}
		}
	};
};

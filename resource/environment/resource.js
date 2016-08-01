const integration = require( "./integration" );
const key = require( "configya" )( {
	file: "./config.json"
} ).api.key;
const checkAuth = require("../checkauth").bind(key);



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
			upgrade: {
				url: "/stack",
				method: "PATCH",
				handle: integration.upgradeStack.bind( null, slack )
			}
		}
	};
};

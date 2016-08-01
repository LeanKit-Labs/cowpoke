const environmentResouce = require( "./environment" );
const key = require( "configya" )( {
	file: "./config.json"
} ).api.key;
const checkAuth = require("../checkauth").bind(key);



module.exports = function(host, environment, slack) { // eslint-disable-line
	return {
		name: "environment",
		middleware: [checkAuth],
		actions: {
			list: {
				url: "/",
				method: "GET",
				handle: environmentResouce.list
			},
			getEnv: {
				url: "/:environment",
				method: "GET",
				handle: environmentResouce.getEnv
			},
			create: {
				url: "/",
				method: "POST",
				handle: environmentResouce.create
			},
			configure: {
				url: "/:environment",
				method: "PATCH",
				handle: environmentResouce.configure
			}
		}
	};
};

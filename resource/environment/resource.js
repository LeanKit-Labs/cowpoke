const environment = require( "./environment" );
const key = require( "configya" )( {
	file: "./config.json"
} ).api.key;
const checkAuth = require("../checkauth").bind(key);



module.exports = function() {
	return {
		name: "environment",
		middleware: [checkAuth],
		actions: {
			list: {
				url: "/",
				method: "GET",
				handle: environment.list
			},
			getEnv: {
				url: "/:environment",
				method: "GET",
				handle: environment.getEnv
			},
			create: {
				url: "/",
				method: "POST",
				handle: environment.create
			},
			configure: {
				url: "/:environment",
				method: "PATCH",
				handle: environment.configure
			}
		}
	};
};

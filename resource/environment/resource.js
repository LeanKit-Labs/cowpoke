
var integration = require( "./integration" );
var _ = require( "lodash" );
var when = require( "when" );
var rancherFn = require( "../../src/rancher" );
var format = require( "util" ).format;

function checkAuth( envelope, next ) {
	var userKey = envelope.headers.bearer;
	if ( !process.env.COWPOKE_API_KEY || userKey === process.env.COWPOKE_API_KEY ) {
		return next();
	} else {
		return { status: 402, data: { message: "Unauthorized" } };
	}
}

module.exports = function( host, environment, slack ) {
	return {
		name: "environment",
		middleware: [ checkAuth ],
		actions: {
			list: {
				url: "/",
				method: "GET",
				handle: integration.list
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
				handle: integration.upgrade.bind( null, slack )
			}
		}
	};
};

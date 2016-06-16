const hyped = require( "hyped" )( {} );
const autohost = require( "autohost" );
const config = require( "configya" )( {
	file: "./config.json"
} );
const fount = require( "fount" );

if ( !process.env.DOCKER_USER || !process.env.DOCKER_PASS ) {
	throw new Error( "DOCKER_PASS or DOCKER_USER is not defined" );
}

const environments = require( "./data/nedb/environment" );
fount.register( "environment", environments );

const slack = require( "./slack" )( config.slack.token, environments );
fount.register( "slack", slack );

const host = hyped.createHost( autohost, {
	port: config.host.port,
	fount: fount,
	noSession: true,
	session: null,
	handleRouteErrors: true
} );
host.start();

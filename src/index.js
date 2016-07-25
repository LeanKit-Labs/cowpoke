const hyped = require( "hyped" )( {} );
const autohost = require( "autohost" );
const config = require( "configya" )( {
	file: "./config.json"
} );
const fount = require( "fount" );

if ( !config.docker.user ) {
	throw new Error( "DOCKER_USER is not defined" );
}

if ( !config.docker.pass ) {
	throw new Error( "DOCKER_PASS is not defined" );
}

if ( !config.github.token ) {
	throw new Error( "GITHUB_TOKEN is not defined" );
}

if ( !config.api.key ) {
	console.warn( "API_KEY not set. No authentication will be used" );
}


const environments = require( "./data/nedb/environment" );
fount.register( "environment", environments );

fount.register( "key", config.api.key );

const slack = require( "./slack" )( config.slack.token, environments );
fount.register( "slack", slack );

fount.register( "githubToken", config.github.token );


const host = hyped.createHost( autohost, {
	port: config.host.port,
	fount: fount,
	noSession: true,
	session: null,
	handleRouteErrors: true
} );
host.start();

const config = require( "./config.js" );
const hyped = require( "hyped" )( {} );
const autohost = require( "autohost" );
const fount = require( "fount" );
const slack = require( "./slack" );

const errors = config.validateEnvVars();

if ( errors.length ) {
	errors.forEach( x => console.error( x ) );
	process.exit( 1 );
}

fount.register( "rancherUrl", process.env.RANCHER_URL );
fount.register( "apiKey", process.env.API_KEY );
fount.register( "user", process.env.RANCHER_USER_KEY );

const slackClient = slack( process.env.SLACK_TOKEN, config.getSlackChannels(), console.warn );
fount.register( "slack", slackClient );

const host = hyped.createHost( autohost, {
	port: process.env.HOST_PORT,
	fount,
	noSession: true,
	session: null,
	handleRouteErrors: true
} );

host.start();


const hyped = require( "hyped" )( {} );
const autohost = require( "autohost" );
const config = require( "configya" )( {
	file: "./config.json"
} );
const fount = require( "fount" );
const toArray = require( "./strToArray" );
const slack = require( "./slack" );

let vaild = true;

if ( !config.api.key ) {
	console.warn( "API_KEY not set. No authentication will be used" );
}
if ( !config.rancher.user.key ) {
	vaild = false;
	console.error( "RANCHER_USER_KEY not set" );
}
if ( !config.rancher.user.secret ) {
	vaild = false;
	console.error( "RANCHER_USER_SECRET not set" );
}

if ( !config.rancher.url ) {
	vaild = false;
	console.error( "RANCHER_URL not set" );
}

const channels = toArray( config.slack.channels, "," );

if ( channels.length === 0 ) {
	console.warn( "No Slack channels specified no message will be sent" );
}

if ( vaild ) {
	fount.register( "rancherUrl", config.rancher.url );
	fount.register( "user", config.rancher.user );
	const slackClient = slack( config.slack.token, channels, console.warn );
	fount.register( "slack", slackClient );

	const host = hyped.createHost( autohost, {
		port: config.host.port,
		fount,
		noSession: true,
		session: null,
		handleRouteErrors: true
	} );
	host.start();
}

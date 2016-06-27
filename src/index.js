var fs = require( "fs" );
var path = require( "path" );
var format = require( "util" ).format;
var hyped = require( "hyped" )( {} );
var autohost = require( "autohost" );
var config = require( "configya" )( {
	file: "./config.json"
} );
var fount = require( "fount" );
var _ = require( "lodash" );

if ( !config.docker.user || !config.docker.pass ) {
	throw new Error( "DOCKER_PASS or DOCKER_USER is not defined" );
}

if ( !_.isNumber( config.docker.poll.time ) || !_.isNumber( config.docker.poll.interval ) ) {
	throw new Error( "ERROR: docker poll time and/or interval is not numeric" );
}

var environments = require( "./data/nedb/environment" );
fount.register( "environment", environments );

var slack = require( "./slack" )( config.slack.token, environments );
var dockerhub = require( "./dockerhub" )( config.docker.user, config.docker.pass,
	config.docker.poll.time, config.docker.poll.interval );
fount.register( "slack", slack );
fount.register( "dockerhub", dockerhub );

var host = hyped.createHost( autohost, {
	port: config.host.port,
	fount: fount,
	noSession: true,
	session: null,
	handleRouteErrors: true
} );
host.start();

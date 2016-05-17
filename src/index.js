var fs = require( "fs" );
var path = require( "path" );
var format = require( "util" ).format;
var hyped = require( "hyped" )( {} );
var autohost = require( "autohost" );
var config = require( "configya" )( {
	file: "./config.json"
} );
var fount = require( "fount" );

var environments = require( "./data/nedb/environment" );
fount.register( "environment", environments );

var slack = require( "./slack" )( config.slack.token, environments );
fount.register( "slack", slack );


var host = hyped.createHost( autohost, {
	port: config.host.port,
	fount: fount,
	noSession: true,
	session: null,
	handleRouteErrors: true
} );
host.start();

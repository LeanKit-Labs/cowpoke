var RtmClient = require( "@slack/client" ).RtmClient;
var CLIENT_EVENTS = require( "@slack/client" ).CLIENT_EVENTS;
var RTM_EVENTS = require( "@slack/client" ).RTM_EVENTS;
var RTM_CLIENT_EVENTS = require( "@slack/client" ).CLIENT_EVENTS.RTM;
var MemoryDataStore = require( "@slack/client" ).MemoryDataStore;

function send( rtm, name, message ) {
	var id = rtm.dataStore.getChannelByName( name ).id;
	rtm.sendMessage( message, id, function( err ) {
		if ( err ) {
			console.error( err );
		}
	} );
}

module.exports = function( token ) {
	if ( !token ) {
		console.warn( "Slack is not configured. No Messages will be sent" );
		return {
			send: function() {}
		};
	}

	var rtm = new RtmClient( token, {
		// Sets the level of logging we require
		logLevel: "warn",
		// Initialise a data store for our client, this will load additional helper functions for the storing and retrieval of data
		dataStore: new MemoryDataStore(),
		// Boolean indicating whether Slack should automatically reconnect after an error response
		autoReconnect: false,
		// Boolean indicating whether each message should be marked as read or not after it is processed
		autoMark: true
	} );

	rtm.on( CLIENT_EVENTS.RTM.AUTHENTICATED, function( rtmStartData ) {
		console.log( "Logged in as " + rtmStartData.self.name + " of team " + rtmStartData.team.name + ", but not yet connected to a channel" );
	} );
	rtm.on( CLIENT_EVENTS.RTM.DISCONNECT, function( data ) {
		console.warn( "Disconnected from slack" );
		rtm.reconnect();
	} );
	rtm.on( CLIENT_EVENTS.RTM.ATTEMPTING_RECONNECT, function( data ) {
		console.warn( "Attempting reconnect to slack" );
	} );
	rtm.on( CLIENT_EVENTS.RTM.WS_ERROR, function( data ) {
		console.error( "Slack Error" );
	} );
	rtm.on( CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, function( data ) {
		console.log( "Ready to send messages" );
	} );

	rtm.start();
	return {
		send: send.bind( undefined, rtm )
	};
};

const RtmClient = require( "@slack/client" ).RtmClient;
const CLIENT_EVENTS = require( "@slack/client" ).CLIENT_EVENTS;
const MemoryDataStore = require( "@slack/client" ).MemoryDataStore;

function send( rtm, channels, logger, message ) {
	for ( let i = 0; i < channels.length; i++ ) {
		try {
			const name = channels[ i ];
			const id = rtm.dataStore.getChannelByName( name ).id;
			rtm.sendMessage( message, id, err => {
				if ( err ) {
					console.error( err );
				}
			} );
		} catch ( e ) {
			if ( logger ) {
				logger( `Error sending message "${message} to channel ${channels[ i ]}: ${e}"` );
			}
		}
	}
}

module.exports = function( token, channels, logger ) {
	if ( !( token && channels && channels.length ) ) {
		console.warn( "Slack is not configured. No Messages will be sent" );
		return {
			send() {}
		};
	}

	const rtm = new RtmClient( token, {
		// Sets the level of logging we require
		logLevel: "warn",
		// Initialise a data store for our client, this will load additional helper functions for the storing and retrieval of data
		dataStore: new MemoryDataStore(),
		// Boolean indicating whether Slack should automatically reconnect after an error response
		autoReconnect: false,
		// Boolean indicating whether each message should be marked as read or not after it is processed
		autoMark: true
	} );

	rtm.on( CLIENT_EVENTS.RTM.AUTHENTICATED, rtmStartData => {
		console.log( `Logged in as ${ rtmStartData.self.name } of team ${ rtmStartData.team.name }, but not yet connected to a channel` );
	} );
	rtm.on( CLIENT_EVENTS.RTM.DISCONNECT, () => {
		console.warn( "Disconnected from slack" );
		rtm.reconnect();
	} );
	rtm.on( CLIENT_EVENTS.RTM.ATTEMPTING_RECONNECT, () => {
		console.warn( "Attempting reconnect to slack" );
	} );
	rtm.on( CLIENT_EVENTS.RTM.WS_ERROR, () => {
		console.error( "Slack Error" );
	} );
	rtm.on( CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, () => {
		console.log( "Ready to send messages" );
	} );

	rtm.start();
	return {
		send: send.bind( undefined, rtm, channels, logger )
	};
};

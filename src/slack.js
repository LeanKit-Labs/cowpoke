var Client = require( "slack-client" );

function onConnected() {
	console.log( "Connected to slack" );
}

function onError( err ) {
	if ( err == "invalid_auth" ) {
		console.error( "Slack login Invalid. No messages will be sent." );
	} else {
		console.error( "Slack error: ", err );
	}
}

function onMessage( message ) {
	//console.log( "Got message: ", message.text );
}

function tell( slack, target, message ) {
	if ( !slack.authenticated ) { //escape if bad auth
		return;
	}
	var dm = slack.getDMByName( target );
	if ( !dm ) {
		var user = slack.getUserByName( target );
		slack.openDM( user.id, function() {
			var dm = slack.getDMByName( target );
			dm.send( message );
		} );
	} else {
		dm.send( message );
	}
}

function send( slack, name, message ) {
	if ( !slack.authenticated ) { //escape if bad auth
		return;
	}
	var target = slack.getChannelGroupOrDMByName( name );
	if ( !target ) {
		console.error( "Can't tell", name, "anything. Nothing matching that found." );
	} else {
		target.send( message );
	}
}

var nullReturn = {
	send: function( params ) {},
	tell: function( params ) {}
};

module.exports = function( token ) {
	token = 'abc'
	if ( !token ) { //short circut if Slack is un-configured
		console.warn( "Warning! Slack is not configured and no messages will be sent." );
		return nullReturn;
	}
	var slack = new Client( token, false, true );

	slack.on( "open", onConnected );
	slack.on( "message", onMessage );
	slack.on( "error", onError );

	slack.login();

	return {
		send: send.bind( undefined, slack ),
		tell: tell.bind( undefined, slack )
	};
};

var Client = require( "slack-client" );

function onConnected() {
	console.log( "Connected to slack" );
}

function onError( err ) {
	console.error( "Slack error: ", err );
}

function onMessage( message ) {
	console.log( "Got message: ", message.text );
}

function tell( slack, target, message ) {
	var dm = slack.getDMByName( target );
	if( !dm ) {
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
	var target = slack.getChannelGroupOrDMByName( name );
	if( !target ) {
		console.error( "Can't tell", name, "anything. Nothing matching that found." );
	} else {
		target.send( message );
	}
}

module.exports = function( token ) {
	token = token || "xoxb-19806943751-R8hWTjlcZ0tbn2qnDUIbg82J";
	var slack = new Client( token, true, true );

	slack.on( "open", onConnected );
	slack.on( "message", onMessage );
	slack.on( "error", onError );

	slack.login();

	return {
		send: send.bind( undefined, slack ),
		tell: tell.bind( undefined, slack )
	};
};
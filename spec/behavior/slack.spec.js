const proxyquire = require( "proxyquire" ).noCallThru();

describe( "sending messsages", () => {
	it( "should not error", function( done ) {
		proxyquire( "../../src/slack.js", {
			"@slack/client": {
				RtmClient: class RtmClient {
					on() {}
					start() {}
					getChannelByName() {}
					sendMessage() {
						throw new Error();
					}
				},
				CLIENT_EVENTS: {
					RTM: {}
				},
				MemoryDataStore: class MemoryDataStore {}
			}
		} )( "abc", [ "channel" ] ).send();
		done();
	} );
	it( "should send message", function( done ) {
		const msg = "test";
		proxyquire( "../../src/slack.js", {
			"@slack/client": {
				RtmClient: class RtmClient {
					constructor() {
						this.dataStore = {
							getChannelByName: () => 123
						};
						return this;
					}
					on() {}
					start() {}
					sendMessage( arg ) {
						if ( arg === msg ) {
							done();
						}
					}
				},
				CLIENT_EVENTS: {
					RTM: {}
				},
				MemoryDataStore: class MemoryDataStore {}
			}
		} )( "abc", [ "channel" ] ).send( msg );
	} );
} );

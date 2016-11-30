require( "../setup.js" );
const _ = require( "lodash" );
const config = require( "../../src/config.js" );

describe( "configuration", () => {
	const requiredVars = [ "HOST_PORT", "RANCHER_URL", "RANCHER_USER_KEY", "RANCHER_USER_SECRET" ];
	const optionalVars = [ "SLACK_TOKEN", "SLACK_CHANNELS", "API_KEY" ];
	const allVars = _.union( requiredVars, optionalVars );

	function stubChannelConfig( val ) {
		if ( val ) {
			process.env.SLACK_CHANNELS = val;
		}
	}

	after( () => {
		allVars.forEach( x => delete process.env[ x ] );
	} );

	describe( "getSlackChannels", () => {
		beforeEach( () => {
			delete process.env.SLACK_CHANNELS;
		} );

		it( "should handle empty string", () => {
			stubChannelConfig( "," );
			config.getSlackChannels().should.be.empty;
		} );

		it( "should handle undefined string", () => {
			config.getSlackChannels().length.should.equal( 0 );
		} );

		it( "should handle trailing comma string", () => {
			stubChannelConfig( "abc,," );
			const channels = config.getSlackChannels();
			channels.length.should.equal( 1 );
			channels[ 0 ].should.equal( "abc" );
		} );

		it( "should handle leading comma string", () => {
			stubChannelConfig( ",abc" );
			const channels = config.getSlackChannels();
			channels.length.should.equal( 1 );
			channels[ 0 ].should.equal( "abc" );
		} );

		it( "should handle multiple elements string", () => {
			stubChannelConfig( "abc,efg" );
			const channels = config.getSlackChannels();

			channels.length.should.equal( 2 );
			channels.should.include( "abc" );
			channels.should.include( "efg" );
		} );

		it( "should handle single elements string", () => {
			stubChannelConfig( "abc" );
			const channels = config.getSlackChannels();

			channels.length.should.equal( 1 );
			channels.should.include( "abc" );
		} );

		it( "should handle an all whitespace entry", () => {
			stubChannelConfig( "abc, ,efg" );
			const channels = config.getSlackChannels();

			channels.length.should.equal( 2 );
			channels.should.include( "abc" );
			channels.should.include( "efg" );
		} );
	} );

	describe( "validateEnvVars", () => {
		// temporarily stub out console functions
		const warnStub = sinon.stub( console, "warn" );
		before( () => {
			warnStub.reset();
		} );

		beforeEach( () => {
			allVars.forEach( x => {
				process.env[ x ] = "something";
			} );
		} );

		it( "should validate env vars", () => {
			const errors = config.validateEnvVars();
			errors.length.should.equal( 0 );
		} );

		it( "should not return errors for a missing optional variable", () => {
			optionalVars.forEach( x => delete process.env[ x ] );
			const errors = config.validateEnvVars();
			errors.length.should.equal( 0 );
		} );

		it( "should warn if an optional variable is missing", () => {
			console.warn = sinon.stub();
			optionalVars.forEach( x => delete process.env[ x ] );
			config.validateEnvVars();
			console.warn.should.have.callCount( optionalVars.length );
		} );

		it( "should return errors for all missing env vars", () => {
			requiredVars.forEach( x => delete process.env[ x ] );
			const errors = config.validateEnvVars();
			errors.length.should.be.equal( requiredVars.length );
		} );

		after( () => {
			warnStub.restore();
		} );
	} );
} );


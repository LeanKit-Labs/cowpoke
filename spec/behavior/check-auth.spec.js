require( "../setup.js" );
const checkAuth = require( "../../resource/check-auth" );
const authenticatedResponseStub = "ok";
const continuationStub = sinon.stub().returns( authenticatedResponseStub );

describe( "auth middleware", () => {
	beforeEach( () => {
		continuationStub.reset();
	} );

	it( "should allow anonymous authentication when no headers are sent", () => {
		const result = checkAuth( undefined, { headers: {} }, continuationStub );
		continuationStub.should.have.callCount( 1 );
		result.should.equal( authenticatedResponseStub );
	} );

	it( "should all annonymous authentication when headers are sent", () => {
		const result = checkAuth( undefined, { headers: { bearer: "123" } }, continuationStub );
		continuationStub.should.have.callCount( 1 );
		result.should.equal( authenticatedResponseStub );
	} );

	it( "should authenticate when api keys match", () => {
		const apiKey = "my-key";
		const result = checkAuth( apiKey, { headers: { bearer: apiKey } }, continuationStub );
		continuationStub.should.have.callCount( 1 );
		result.should.equal( authenticatedResponseStub );
	} );

	it( "should not authenticate when api key does not match", () => {
		const apiKey = "my-key";
		const result = checkAuth( apiKey, { headers: { bearer: "bad-key" } }, continuationStub );
		continuationStub.should.have.callCount( 0 );
		result.should.have.property( "status", 401 );
	} );
} );

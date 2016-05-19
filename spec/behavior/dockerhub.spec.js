require( "../setup" );
var proxyquire = require( "proxyquire" ).callThru();
var when = require( "when" );
var nock = require( "nock" );
var urlencode = require( "urlencode" );
var dockerhub = require( "../../src/dockerhub" );

var namesapce = "leankit";
var name = "cowpoke";
var tagToCheck = "tag1";
var validImage = namesapce + "/" + name + ":" + tagToCheck;
var invalidImage = namesapce + "/" + name + ":DNE";
var response = [
	{
		layer: "88f5d1c8",
		name: tagToCheck
	},
	{
		layer: "88f5d1c8",
		name: "tag2"
	},
	{
		layer: "88f5d1c8",
		name: "tag3"
	},
	{
		layer: "88f5d1c8",
		name: "tag4"
	}
];

describe( "Docker Hub API", function() {
	var dockerapi;
	describe( "Check for an image?", function() {
		describe( "Image exists", function() {
			before( function() {
				dockerapi = nock( "https://registry.hub.docker.com" );
				dockerapi.get( "/v1/repositories/" + urlencode( namesapce ) + "/" + urlencode( name ) + "/tags" ).reply( 200, response );
			} );
			it( "should find that the image exists", function() {
				function check( res ) {
					return res.should.equal( true );
				}
				return dockerhub.checkExistance( validImage ).then( check );
			} );
		} );

		describe( "Image does not exist", function() {
			before( function() {
				dockerapi = nock( "https://registry.hub.docker.com" );
				dockerapi.get( "/v1/repositories/" + urlencode( namesapce ) + "/" + urlencode( name ) + "/tags" ).reply( 200, response );
			} );
			it( "should find that the image does not exist", function() {
				function check( res ) {
					return res.should.equal( false );
				}
				return dockerhub.checkExistance( invalidImage ).then( check );
			} );
		} );
	} );
} );


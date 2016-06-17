require( "../setup" );
var proxyquire = require( "proxyquire" ).callThru();
var when = require( "when" );
var nock = require( "nock" );
var urlencode = require( "urlencode" );

var namesapce = "leankit";
var name = "cowpoke";
var tagToCheck = "tag1";
var validImage = namesapce + "/" + name + ":" + tagToCheck;
var dockerhub = proxyquire( "../../src/dockerhub", {
	"./util": {
		getImageInfo: function( image ) {
			if ( image === validImage ) {
				return {
					docker: {
						repo: namesapce,
						image: name,
						tag: tagToCheck
					}
				};
			} else {
				return {
					docker: {
						repo: namesapce,
						image: name,
						tag: "DNE"
					}
				};
			}
		}
	}
} )( "USER", "PASS", 1000, 500 );
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

var lotsOfTags = [
	{
		layer: "88f5d1c8",
		name: "tag0"
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
	},
		{
		layer: "88f5d1c8",
		name: "tag5"
	},
	{
		layer: "88f5d1c8",
		name: "tag6"
	},
	{
		layer: "88f5d1c8",
		name: "tag7"
	},
	{
		layer: "88f5d1c8",
		name: "tag8"
	},
		{
		layer: "88f5d1c8",
		name: "tag9"
	},
	{
		layer: "88f5d1c8",
		name: "tag10"
	},
	{
		layer: "88f5d1c8",
		name: "tag11"
	},
	{
		layer: "88f5d1c8",
		name: "tag12"
	},
		{
		layer: "88f5d1c8",
		name: tagToCheck
	},
	{
		layer: "88f5d1c8",
		name: "tag14"
	},
	{
		layer: "88f5d1c8",
		name: "tag15"
	},
	{
		layer: "88f5d1c8",
		name: "tag16"
	},
		{
		layer: "88f5d1c8",
		name: "tag17"
	},
	{
		layer: "88f5d1c8",
		name: "tag18"
	},
	{
		layer: "88f5d1c8",
		name: "tag19"
	},
	{
		layer: "88f5d1c8",
		name: "tag19"
	}
];

describe( "Docker Hub API", function() {
	var dockerapi;

	describe( "With a few tags", function() {
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
				this.timeout( 60000 );
				before( function() {
					dockerapi = nock( "https://registry.hub.docker.com" );
					dockerapi.get( "/v1/repositories/" + urlencode( namesapce ) + "/" + urlencode( name ) + "/tags" ).times( 30 ).reply( 200, response );
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

	describe( "With a lots tags", function() {
		describe( "Check for an image?", function() {
			describe( "Image exists", function() {
				before( function() {
					dockerapi = nock( "https://registry.hub.docker.com" );
					dockerapi.get( "/v1/repositories/" + urlencode( namesapce ) + "/" + urlencode( name ) + "/tags" ).reply( 200, lotsOfTags );
				} );
				it( "should find that the image exists", function() {
					function check( res ) {
						return res.should.equal( true );
					}
					return dockerhub.checkExistance( validImage ).then( check );
				} );
			} );

			describe( "Image does not exist", function() {
				this.timeout( 60000 );
				before( function() {
					dockerapi = nock( "https://registry.hub.docker.com" );
					dockerapi.get( "/v1/repositories/" + urlencode( namesapce ) + "/" + urlencode( name ) + "/tags" ).times( 30 ).reply( 200, lotsOfTags );
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
} );


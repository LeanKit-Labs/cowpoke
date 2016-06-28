require( "../setup" );
var proxyquire = require( "proxyquire" ).callThru();
var when = require( "when" );
var nock = require( "nock" );
var urlencode = require( "urlencode" );
var rp = require( "request-promise" );
var namesapce = "leankit";
var name = "cowpoke";
var tagToCheck = "tag1";
var validImage = namesapce + "/" + name + ":" + tagToCheck;
var invalidImage = namesapce + "/" + name + ":DNE";
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
	},
	"request-promise": function( options ) {
		if ( options.uri.indexOf( "auth.docker.io" ) !== -1 ) {
			return when.resolve( {
				token: "good to go"
			} );
		} else {
			return when.resolve( {
				tags: [ "tag", tagToCheck, "tag2", "tag3", "tag4" ]
			} );
		}
	}
} );

describe( "Docker Hub API", function() {
	var dockerapi;
	var dockerAuth;
	describe( "Check for an image?", function() {
			describe( "Image exists", function() {
				it( "should find that the image exists", function() {
					function check( res ) {
						return res.should.equal( true );
					}
					return dockerhub.checkExistance( validImage ).then( check );
				} );
			} );

			describe( "Image does not exist", function() {
				it( "should find that the image does not exist", function() {
					function check( res ) {
						return res.should.equal( false );
					}
					return dockerhub.checkExistance( invalidImage ).then( check );
				} );
			} );
		} );
} );


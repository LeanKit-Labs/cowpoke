require( "../setup" );
var proxyquire = require( "proxyquire" ).callThru();
var Promise = require("bluebird");
var namespace = "leankit";
var name = "cowpoke";
var tagToCheck = "tag1";
var validImage = namespace + "/" + name + ":" + tagToCheck;
var invalidImage = namespace + "/" + name + ":DNE";
var dockerhub = proxyquire( "../../src/dockerhub", {
	"./util": {
		getImageInfo: function( image ) {
			if ( image === validImage ) {
				return {
					docker: {
						repo: namespace,
						image: name,
						tag: tagToCheck
					}
				};
			} else {
				return {
					docker: {
						repo: namespace,
						image: name,
						tag: "DNE"
					}
				};
			}
		}
	},
	"request-promise": function( options ) {
		if ( options.uri.indexOf( "auth.docker.io" ) !== -1 ) {
			return Promise.resolve( {
				token: "good to go"
			} );
		} else {
			return Promise.resolve( {
				tags: ["tag", tagToCheck, "tag2", "tag3", "tag4"]
			} );
		}
	}
} )("my user", "my pass");

describe( "Docker Hub API", function() {
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
});

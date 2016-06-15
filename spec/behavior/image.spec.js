require( "../setup" );
var imageFn = require( "../../src/model/image" );
/* global _, sinon  */
describe( "Behavior Model", function() {
	var store, rancher;
	before( function() {
		store = {
			service: {
				findUpgradableServices: _.noop
			}
		};

		rancher = {
			upgrade: _.noop
		};
	} );
	describe( "when a new image is published", function() {
		describe( "with upgrades", function() {
			var storeMock, rancherMock, dockerImage, info, services, result;
			before( function() {
				dockerImage = "arob/cowpoke:arobson_cowpoke_master_0.1.0_1_abcdef";
				info = {
					newImage: dockerImage,
					docker: {
						image: "cowpoke",
						repo: "arob",
						tag: "arobson_cowpoke_master_0.1.0_1_abcdef"
					},
					owner: "arobson",
					repository: "cowpoke",
					branch: "master",
					version: "0.1.0",
					build: "1",
					commit: "abcdef"
				};
				services = [
					{
						environment: "dev",
						stack: "ci",
						service: "cowpoke"
					}
				];

				storeMock = {
					service: sinon.mock( store.service )
				};
				storeMock.service.expects( "findUpgradableServices" )
					.withArgs( info )
					.resolves( {info: info, services: services} );

				rancherMock = sinon.mock( rancher );
				rancherMock.expects( "upgrade" )
					.withArgs( store, info, services )
					.resolves( services );

				var image = imageFn( store, rancher );
				return image.upgrade( dockerImage )
					.then( function( services ) {
						result = services;
					} );
			} );

			it( "should result in upgraded services", function() {
				result.should.eql( services );
			} );
		} );
	} );
} );

require( "../setup" );

var baseURL = "http://myRancher.com";
var nock = require( "nock" );
var rancherFn = require( "../../src/rancher" );

describe( "Rancher API", function() {
	var rancher, rancherHost;
	before( function() {
		rancherHost = nock( baseURL );
		rancherHost
			.get( "/v1" )
			.reply( 200, {
				links: {
					projects: baseURL + "/v1/projects"
				}
			} );
		return rancherFn( baseURL, {
			key: "test",
			secret: "sneakrets"
		} ).then( function( lib ) {
			rancher = lib;
		} );
	} );

	describe( "when retrieving a list of environments", function() {
		var environments;
		before( function() {
			rancherHost
				.get( "/v1/projects" )
				.reply( 200, {
					data: [ {
						id: "l0l",
						name: "Test",
						state: "active", //not mentioned in docs
						links: {
							environments: baseURL + "/v1/projects/l0l/environments",
							containers: baseURL + "/v1/projects/l0l/containers",
							services: baseURL + "/v1/projects/l0l/services"
						}
					} ]
				} );
			return rancher.listEnvironments()
				.then( function( response ) {
					environments = response;
				} );
		} );

		it( "should retrieve environments", function() {
			return environments.should.partiallyEql( {
				Test: {
					id: "l0l",
					name: "Test",
					state: "active"
				}
			} );
		} );

		describe( "when upgrading at environment", function() {
			var updated;
			before( function() {
				rancherHost
									.get( "/v1/projects/l0l/environments" )
					.reply( 200, {
						data: [ {
							id: "s01",
							name: "Stack 1",
							accountId: "l0l",
							description: "A test stack",
							state: "active",
							links: {
								services: baseURL + "/v1/projects/l0l/services"
							}
						} ]
					} );
				rancherHost
				.get( "/v1/projects/l0l/services" )
				.reply( 200, {
					data: [
						{
							id: "svc0102",
							name: "Service 02",
							type: "service",
							accountId: "l0l",
							environmentId: "s01",
							description: "A test service",
							state: "active",
							launchConfig: {
								imageUuid: "docker:arob/cowpoke:arobson_cowpoke_develop_0.1.0_1_abcdef"
							},
							actions: {
								upgrade: baseURL + "/v1/projects/l0l/environments/s01/services/svc0102?action=upgrade"
							}
						},
						{
							id: "svc0103",
							name: "Service 03",
							type: "service",
							accountId: "l0l",
							environmentId: "s01",
							description: "A test service",
							state: "active",
							launchConfig: {
								imageUuid: "docker:arob/cowpoke:arobson_cowpoke_master_0.1.0_1_abcdef"
							},
							actions: {
								upgrade: baseURL + "/v1/projects/l0l/environments/s01/services/svc0103?action=upgrade"
							}
						}
					]
				} );

				var clone = {
					id: "svc0103",
					name: "Service 03",
					accountId: "l0l",
					type: "service",
					environmentId: "s01",
					description: "A test service",
					state: "active",
					launchConfig: {
						imageUuid: "docker:arob/cowpoke:arobson_cowpoke_master_0.1.0_1_abcdef"
					},
					actions: {
						upgrade: baseURL + "/v1/projects/l0l/environments/s01/services/svc0102?action=upgrade"
					}
				};
				clone.launchConfig.imageUuid = "docker:arob/cowpoke:arobson_cowpoke_master_0.1.0_2_123efg";
				var expectedBody = {
					inServiceStrategy: {
						launchConfig: clone.launchConfig,
						secondaryLaunchConfig: clone.secondaryLaunchConfig,
						startFirst: false
					}
				};

				rancherHost
					.post( "/v1/projects/l0l/environments/s01/services/svc0103?action=upgrade", expectedBody )
					.reply( 200, {
						id: "svc0103",
						name: "Service 03",
						accountId: "l0l",
						type: "service",
						environmentId: "s01",
						description: "A test service",
						state: "active",
						launchConfig: {
							imageUuid: "docker:arob/cowpoke:arobson_cowpoke_master_0.1.0_2_123efg"
						},
						actions: {
							upgrade: baseURL + "/v1/projects/l0l/environments/s01/services/svc0103?action=upgrade"
						}
					} );

				return environments.Test.upgrade( "arob/cowpoke:arobson_cowpoke_master_0.1.0_2_123efg" )
					.then( function( response ) {
						updated = response;
					} );
			} );

			it( "should only upgrade one service", function() {
				updated.length.should.equal( 1 );
			} );

			it( "should upgrade the correct service", function() {
				return updated[ 0 ].should.partiallyEql(
					{
						id: "svc0103",
						name: "Service 03",
						environmentId: "l0l",
						stackId: "s01",
						description: "A test service",
						state: "active",
						launchConfig: {
							imageUuid: "docker:arob/cowpoke:arobson_cowpoke_master_0.1.0_2_123efg"
						}
					}
				);
			} );
		} );
	} );
} );

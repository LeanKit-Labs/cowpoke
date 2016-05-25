require( "../setup" );
var proxyquire = require( "proxyquire" ).callThru();
var when = require( "when" );

function finishUp() {
	return Promise.resolve( {} );
}

function upgradeMock( arg ) {
	var promiseGen = when.defer();
	promiseGen.resolve( [ {
		id: "svc0102",
		name: "Service 02",
		environmentId: "l0l",
		environmentName: "Test",
		stackId: "s01",
		stackName: "",
		description: "A test service",
		state: "active",
		launchConfig: {
			imageUuid: "docker:arob/cowpoke:arobson_cowpoke_master_0.1.0_1_abcdef"
		},
		droneImage: "arob/cowpoke:arobson_cowpoke_master_0.1.0_1_abcdef",
		buildInfo: {
			newImage: "arob/cowpoke:arobson_cowpoke_master_0.1.0_1_abcdef",
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
		},
		transition: {
			error: false
		}
	} ] );
	return promiseGen.promise;
}

function rancherMock( arg, arg2 ) {
	var promisGenerator = when.defer();
	promisGenerator.resolve( {
		listEnvironments: listEnvironmentsMock
	} );
	return promisGenerator.promise;
}

var dockerMock = {
	checkExistance: function( params ) {
		return Promise.resolve( true );
	}
};
var dockerMockDeny = {
	checkExistance: function( params ) {
		return Promise.resolve( false );
	}
};
var dockerMockError = {
	checkExistance: function( params ) {
		return Promise.resolve( undefined );
	}
};

function getAllEnvMock() {
	var promisGen = when.defer();
	promisGen.resolve( [ {
		name: "test",
		baseUrl: "http://example.com",
		_id: "VoKtrtXdqRS3VDAV",
		image: "helloworld",
		key: "key",
		secret: "secret"
	} ] );
	return promisGen.promise;
}

function getEnvMock() {
	var promisGen = when.defer();
	promisGen.resolve( {
		name: "test",
		baseUrl: "http://example.com",
		_id: "VoKtrtXdqRS3VDAV",
		image: "helloworld",
		key: "key",
		secret: "secret",
		slackChannels: channelsList
	} );
	return promisGen.promise;
}

var channelsList = [ "TEST1", "TEST2" ];

function getChannelsMock() {
	var promisGen = when.defer();
	promisGen.resolve(
	channelsList
	);
	return promisGen.promise;
}

var service = {
			id: "svc0102",
			name: "Service 02",
			environmentId: "l0l",
			environmentName: "Test",
			stackId: "s01",
			stackName: "",
			description: "A test service",
			state: "upgraded",
			launchConfig: {
				imageUuid: "docker:arob/cowpoke:arobson_cowpoke_master_0.1.0_1_abcdef"
			}, droneImage: "arob/cowpoke:arobson_cowpoke_master_0.1.0_1_abcdef",
			buildInfo: {
				newImage: "arob/cowpoke:arobson_cowpoke_master_0.1.0_1_abcdef",
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
			},
			finish: finishUp,
			transition: {
				error: false
			}
		};

function mockListServices() {
	var promisGen = when.defer();
	promisGen.resolve( [ service ] );
	return promisGen.promise;
}

function listEnvironmentsMock() {
	var promiseGen = when.defer();
	promiseGen.resolve( {
		Test: {
			id: "l0l",
			name: "Test",
			state: "active",
			listStacks: function() {},
			listContainers: function() {},
			listServices: mockListServices,
			upgrade: upgradeMock
		}
	} );
	return promiseGen.promise;
}

var envMock = {
	add: getEnvMock,
	getAll: getAllEnvMock,
	getChannels: getChannelsMock,
	getByName: getEnvMock
};

var slackMockDoNothing = {
	send: function( channel ) {}
};

describe( "Upgrade", function() {
	it( "should return the upgraded services", function( done ) {
		var expectedReturn = {
			data: {
				upgradedServices: [
					{
						id: "svc0102",
						name: "Service 02",
						environmentId: "l0l",
						environmentName: "Test",
						stackId: "s01",
						stackName: "",
						description: "A test service",
						state: "active",
						launchConfig: {
							imageUuid: "docker:arob/cowpoke:arobson_cowpoke_master_0.1.0_1_abcdef"
						},
						droneImage: "arob/cowpoke:arobson_cowpoke_master_0.1.0_1_abcdef",
						buildInfo: {
							newImage: "arob/cowpoke:arobson_cowpoke_master_0.1.0_1_abcdef",
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
						},
						transition: {
							error: false
						}
					}
					]
			}
		};
		function testResults( result ) {
			result.should.deep.equal( expectedReturn );
			done();
		}

		var integration = proxyquire( "../../resource/environment/integration.js", {
			"../../src/rancher": rancherMock,
			"../../src/data/nedb/environment": envMock,
			"../../src/dockerhub": dockerMock
		} );
		integration.upgrade( slackMockDoNothing, { data: { image: "arob/cowpoke:arobson_cowpoke_master_0.6.0_1_abcdef" } } ).then( testResults );
	} );
	it( "when tag is not found service should return 404", function() {
		var integration = proxyquire( "../../resource/environment/integration.js", {
			"../../src/rancher": rancherMock,
			"../../src/data/nedb/environment": envMock,
			"../../src/dockerhub": dockerMockDeny
		} );
		var expectedReturn = {
			data: {
				message: "Image does not exist in Dockerhub"
			},
			status: 404
		};
		function testResults( result ) {
			return result.should.deep.equal( expectedReturn );
		}
		return integration.upgrade( slackMockDoNothing, { data: { image: "arob/cowpoke:arobson_cowpoke_master_0.6.0_1_abcdef" } } ).then( testResults );
	} );
	it( "when dockerhub validation fails should return a 500", function() {
		var integration = proxyquire( "../../resource/environment/integration.js", {
			"../../src/rancher": rancherMock,
			"../../src/data/nedb/environment": envMock,
			"../../src/dockerhub": dockerMockError
		} );
		var expectedReturn = {
			data: {
				message: "Validation with Dockerhub failed."
			},
			status: 500
		};
		function testResults( result ) {
			return result.should.deep.equal( expectedReturn );
		}
		return integration.upgrade( slackMockDoNothing, { data: { image: "arob/cowpoke:arobson_cowpoke_master_0.6.0_1_abcdef" } } ).then( testResults );
	} );
	it( "should call out to slack", function( done ) {
		var slackMockTest = {
			send: function( channel, message ) {
				channelsList.indexOf( channel ).should.not.equal( -1 );
				if ( channelsList.indexOf( channel ) === ( channelsList.length - 1 ) && message === "Upgrading the following services to arob/cowpoke:arobson_cowpoke_master_0.6.0_1_abcdef, hombre: \n - Service 02" ) {
					done();
				}
			}
		};
		var integration = proxyquire( "../../resource/environment/integration.js", {
			"../../src/rancher": rancherMock,
			"../../src/data/nedb/environment": envMock,
			"../../src/dockerhub": dockerMock
		} );
		integration.upgrade( slackMockTest, { data: { image: "arob/cowpoke:arobson_cowpoke_master_0.6.0_1_abcdef" } } );
	} );

	it( "should finish the upgrade", function( done ) {
		this.timeout( 10000 );
		var integration = proxyquire( "../../resource/environment/integration.js", {
			"../../src/rancher": rancherMock,
			"../../src/data/nedb/environment": envMock
		} );
		service.finish = function() {
			done();
			service.finish = finishUp;
			return Promise.resolve();
		};
		integration.upgrade( slackMockDoNothing, { data: { image: "arob/cowpoke:arobson_cowpoke_master_0.6.0_1_abcdef" } } );
	} );
} );

describe( "Configure", function() {
	it( "configure the service", function( done ) {
		var integration = proxyquire( "../../resource/environment/integration.js", {
			"../../src/rancher": rancherMock,
			"../../src/data/nedb/environment": envMock
		} );

		var simRequest = {
			data: [ {
				op: "add",
				field: "slackChannels",
				value: "new-slack-channel-name"
			},
			{
				op: "remove",
				field: "slackChannels",
				value: "TEST2"
			} ]
		};
		var expectedValue = {
			status: 200,
			data: {
				name: "test",
				baseUrl: "http://example.com",
				_id: "VoKtrtXdqRS3VDAV",
				image: "helloworld",
				key: "key",
				secret: "secret",
				slackChannels: [
				"TEST1",
				"new-slack-channel-name"
				]
			}
		};

		function testResult( result ) {
			result.should.deep.equal( expectedValue );
			done();
		}

		integration.configure( simRequest ).then( testResult );
	} );
} );

describe( "List", function() {
	var integration = proxyquire( "../../resource/environment/integration.js",
        {
	"../../src/rancher": rancherMock,
	"../../src/data/nedb/environment": envMock
        }
    );

	it( "should list environments", function( done ) {
		function testResults( results ) {
			getAllEnvMock().then( function( envs ) {
				results.data.should.deep.equal( envs );
				done();
			} );
		}

		integration.list().then( testResults );
	} );
} );

describe( "Get an Environment", function() {
	it( "should get a valid environment", function() {
		var integration = proxyquire( "../../resource/environment/integration.js", {
			"../../src/rancher": rancherMock,
			"../../src/data/nedb/environment": envMock
		} );

		function testResults( results ) {
			return getEnvMock().then( function( env ) {
				return results.should.deep.equal( env );
			} );
		}
		return integration.getEnv( { data: { environment: "test" } } ).then( testResults );
	} );

	it( "should return 404 when trying to get an invalid environment", function() {
		var integration = proxyquire( "../../resource/environment/integration.js", {
			"../../src/rancher": rancherMock,
			"../../src/data/nedb/environment": {
				getByName: function() {
					return Promise.resolve( undefined );
				}
			}
		} );

		function testResults( results ) {
			return results.should.deep.equal( {
				status: "404",
				data: {
					message: "Environment Not Found"
				}
			} );
		}
		return integration.getEnv( { data: { environment: "DNE" } } ).then( testResults );
	} );
} );

describe( "Create", function() {
	it( "should create an environment", function( done ) {
		var integration = proxyquire( "../../resource/environment/integration.js", {
			"../../src/rancher": rancherMock,
			"../../src/data/nedb/environment": envMock
		} );

		function testResults( res ) {
			res.data.message.should.equal( "Created" );
			done();
		}
		var envToCreate = {
			name: "d1-d02",
			baseUrl: "https://rancher.leankit.io",
			key: "key",
			secret: "secret",
			slackChannels: [
			"pd-builds"
			]
		};
		integration.create( { data: envToCreate } ).then( testResults );
	} );
	it( "should not create an environment", function( done ) {
		var integration = proxyquire( "../../resource/environment/integration.js", {
			"../../src/rancher": rancherMock,
			"../../src/data/nedb/environment": envMock
		} );
		expect( integration.create( { data: {} } ).data.message ).to.equal( "Invaild Environment" );
		done();
	} );
} );


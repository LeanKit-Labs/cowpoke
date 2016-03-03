//var test = proxyquire("./libToTest", {"./libToMock": function() {return "I was Mocked :)"}})
var proxyquire = require("proxyquire").callThru();
var when = require("when")

function upgradeMock(arg) {
    var promiseGen = when.defer();
    promiseGen.resolve([
            {
                "id": "svc0102",
                "name": "Service 02",
                "environmentId": "l0l",
                "environmentName": "Test",
                "stackId": "s01",
                "stackName": "",
                "description": "A test service",
                "state": "active",
                "launchConfig": {
                    "imageUuid": "docker:arob/cowpoke:arobson_cowpoke_master_0.1.0_1_abcdef"
                },
                "droneImage": "arob/cowpoke:arobson_cowpoke_master_0.1.0_1_abcdef",
                "buildInfo": {
                    "newImage": "arob/cowpoke:arobson_cowpoke_master_0.1.0_1_abcdef",
                    "docker": {
                        "image": "cowpoke",
                        "repo": "arob",
                        "tag": "arobson_cowpoke_master_0.1.0_1_abcdef"
                    },
                    "owner": "arobson",
                    "repository": "cowpoke",
                    "branch": "master",
                    "version": "0.1.0",
                    "build": "1",
                    "commit": "abcdef"
                },
                "transition": {
                    "error": false
                }
            }
        ]);
	return promiseGen.promise
}

function listEnvironmentsMock() {
    var promiseGen = when.defer()
    promiseGen.resolve({ 
		Test: { 
   			id: 'l0l',
     		name: 'Test',
    		state: 'active',
     		listStacks: function() {},
     		listContainers: function() {},
     		listServices: function() {},
     		upgrade: upgradeMock
     	}
    });
	return promiseGen.promise	
}

function rancherMock(arg, arg2) {
	//console.log("In my mock")
    var promisGenerator = when.defer();
    promisGenerator.resolve({
		listEnvironments: listEnvironmentsMock
	});
	return promisGenerator.promise
}

function getAllEnvMock() {
    var promisGen = when.defer()
    promisGen.resolve([{
        "name": "test",
        "baseUrl": "http://example.com",
        "_id": "VoKtrtXdqRS3VDAV",
        "image": "helloworld",
        "key": "key",
        "secret": "secret"
    }]);
    return promisGen.promise
}

function getChannelsMock() {
    var promisGen = when.defer();
    promisGen.resolve(
        ["TEST"]
    );
    return promisGen.promise
}

function mockListServices() {
    var promisGen = when.defer()
    promisGen.resolve(
        [
            {
                "id": "svc0102",
                "name": "Service 02",
                "environmentId": "l0l",
                "environmentName": "Test",
                "stackId": "s01",
                "stackName": "",
                "description": "A test service",
                "state": "upgraded",
                "launchConfig": {
                    "imageUuid": "docker:arob/cowpoke:arobson_cowpoke_master_0.1.0_1_abcdef"
                },
                "droneImage": "arob/cowpoke:arobson_cowpoke_master_0.1.0_1_abcdef",
                "buildInfo": {
                    "newImage": "arob/cowpoke:arobson_cowpoke_master_0.1.0_1_abcdef",
                    "docker": {
                        "image": "cowpoke",
                        "repo": "arob",
                        "tag": "arobson_cowpoke_master_0.1.0_1_abcdef"
                    },
                    "owner": "arobson",
                    "repository": "cowpoke",
                    "branch": "master",
                    "version": "0.1.0",
                    "build": "1",
                    "commit": "abcdef"
                },
                "transition": {
                    "error": false
                }
            }
        ]
    );
    return promisGen.promise
}

var envMock = {
    getAll: getAllEnvMock,
    getChannels: getChannelsMock,
    listServices : mockListServices
}

var slackMock = {
    send: function(channel) {/*console.log("Would send slack message to " + channel)*/}
}

var integration = proxyquire("../../resource/environment/integration.js", {"../../src/rancher": rancherMock, "../../src/data/nedb/environment" : envMock, "../../src/slack" : slackMock });


//console.log("running upgrade");
function logResults(res) {
    console.log(JSON.stringify(res, null, 4));
}
integration.upgrade({data: {image: "arob/cowpoke:arobson_cowpoke_master_0.6.0_1_abcdef"}}).then(logResults);
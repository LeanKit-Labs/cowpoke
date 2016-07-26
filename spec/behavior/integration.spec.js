require("../setup");
const proxyquire = require("proxyquire").callThru();
const Promise = require("bluebird");
const util = require("util");
const _ = require("lodash");
/* global expect */


const env = {
	name: "test",
	baseUrl: "http://example.com",
	_id: "VoKtrtXdqRS3VDAV",
	image: "helloworld",
	key: "key",
	secret: "secret",
	slackChannels: channelsList
};

const channelsList = ["TEST1", "TEST2"];
const envId = "101";
const stackId = "202";
const stack = {
	"id": stackId,
	"type": "environment",
	"links": {
		"self": util.format("/v1/projects/%s/environments/%s", envId, stackId),
		"account": util.format("/v1/projects/%s/environments/%s/account", envId, stackId),
		"services": util.format("/v1/projects/%s/environments/%s/services", envId, stackId),
		"composeConfig": util.format("/v1/projects/%s/environments/%s/composeconfig", envId, stackId),
	},
	"actions": {
		upgrade: util.format("…/v1/projects/%s/environments/%s/?action=upgrade", envId, stackId),
		update: util.format("…/v1/projects/%s/environments/%s/?action=update", envId, stackId),
		remove: util.format("…/v1/projects/%s/environments/%s/?action=remove", envId, stackId),
		addoutputs: util.format("…/v1/projects/%s/environments/%s/?action=addoutputs", envId, stackId),
		activateservices: util.format("…/v1/projects/%s/environments/%s/?action=activateservices", envId, stackId),
		deactivateservices: util.format("…/v1/projects/%s/environments/%s/?action=deactivateservices", envId, stackId),
		exportconfig: util.format("…/v1/projects/%s/environments/%s/?action=exportconfig", envId, stackId),
	},
	"environment": {
		"argument_one": "abc"
	},
	"name": "drone",
	"state": "active",
	"dockerCompose": "",
	"externalId": "catalog://rebelfleet:xwing:65",
	"kind": "environment",
	"rancherCompose": "",
	finish: () => Promise.resolve(stack),
	upgrade: () => Promise.resolve(stack)
};

var envMock = {
	add: () => Promise.resolve(env),
	getAll: () => Promise.resolve([_.omit(env, ["slackChannels"])]),
	getChannels: () => Promise.resolve(channelsList),
	getByName: () => Promise.resolve(env)
};

function rancherMock() {
	return Promise.resolve({
		listEnvironments: () => Promise.resolve({
			Test: {
				id: envId,
				name: "Test",
				state: "active",
				listStacks: () => Promise.resolve([stack]),
				listContainers: () => Promise.resolve([]),
				listServices: () => Promise.resolve([]),
			}
		})
	});
}


var slackMockDoNothing = {
	send: function() {}
};


describe("upgradeStack", () => {

	const githubOwner = "lukeSkywalker";
	const githubRepo = "rougeSquadron";
	const version = "70";
	const branch = "xwing";

	const repo = [
		{
			name: "docker-compose.yml",
			download_url: "https://api.github.com/docker" // eslint-disable-line
		}, 
		{
			name: "rancher-compose.yml",
			download_url: "https://api.github.com/rancher" // eslint-disable-line
		} 
	];

	const integration = proxyquire("../../resource/environment/integration.js", {
		"../../src/rancher": rancherMock,
		"../../src/data/nedb/environment": envMock,
		"request-promise": url => {
			if (url === util.format("https://api.github.com/repos/%s/%s/contents/templates/%s/%s", githubOwner, githubRepo, branch, version)) {
				return Promise.resolve(repo);
			} else if (url === "https://api.github.com/docker") {
				return Promise.resolve("docker compose");
			} else if (url === "https://api.github.com/rancher") {
				return Promise.resolve("rancher compose");
			} else {
				return Promise.reject("");
			}
		}
	});

	it("should upgrade the stack", () => {
		return integration.upgradeStack(slackMockDoNothing, "abc", {
			data: {
				catalog: githubOwner + "/" + githubRepo,
				rancher_catalog_name: "rebelfleet", // eslint-disable-line
				branch,
				catalog_version: version // eslint-disable-line
			}
		}).then(res => res.should.partiallyEql({
			upgraded_stacks_by_environment: [{ // eslint-disable-line
				environment: "Test",
				upgraded: [{
					name: stack.name,
					id: stackId
				}]
			}]
		}));
	});

	it("should not find anything in github", () => {
		return integration.upgradeStack(slackMockDoNothing, "abc", {
			data: {
				catalog: "Nope" + "/" + githubRepo,
				rancher_catalog_name: "rebelfleet", // eslint-disable-line
				branch,
				catalog_version: version // eslint-disable-line
			}
		}).then(res => res.should.partiallyEql({"status": 404, "data": {"message": "Unable to get information from github"}}));
	});

	it("should not find the proper arguments", () => {
		return integration.upgradeStack(slackMockDoNothing, "abc", {data: {}})
			.then(res => res.should.partiallyEql({status: 401, data: {message: "Invaild arguments"}}));
	});


});

describe("List", () => {
	var integration = proxyquire("../../resource/environment/integration.js", {
		"../../src/rancher": rancherMock,
		"../../src/data/nedb/environment": envMock
	});

	it("should list environments", () => {
		return integration.list().then(results => results.data.should.deep.equal([_.omit(env, ["slackChannels"])]));
	});
});

describe("Get an Environment", () => {
	it("should get a valid environment", () => {
		var integration = proxyquire("../../resource/environment/integration.js", {
			"../../src/rancher": rancherMock,
			"../../src/data/nedb/environment": envMock
		});

		function testResults(results) {
			return results.should.deep.equal(env);
		}
		return integration.getEnv({
			data: {
				environment: "test"
			}
		}).then(testResults);
	});

	it("should return 404 when trying to get an invalid environment", () => {
		var integration = proxyquire("../../resource/environment/integration.js", {
			"../../src/rancher": rancherMock,
			"../../src/data/nedb/environment": {
				getByName: function() {
					return Promise.resolve(undefined);
				}
			}
		});

		function testResults(results) {
			return results.should.deep.equal({
				status: "404",
				data: {
					message: "Environment Not Found"
				}
			});
		}
		return integration.getEnv({
			data: {
				environment: "DNE"
			}
		}).then(testResults);
	});
});

describe("Create", () => {
	it("should create an environment", done => {
		var integration = proxyquire("../../resource/environment/integration.js", {
			"../../src/rancher": rancherMock,
			"../../src/data/nedb/environment": envMock
		});

		function testResults(res) {
			res.data.message.should.equal("Created");
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
		integration.create({
			data: envToCreate
		}).then(testResults);
	});

	it("should not create an environment", done => {
		var integration = proxyquire("../../resource/environment/integration.js", {
			"../../src/rancher": rancherMock,
			"../../src/data/nedb/environment": envMock
		});
		expect(integration.create({
			data: {}
		}).data.message).to.equal("Invaild Environment");
		done();
	});
});
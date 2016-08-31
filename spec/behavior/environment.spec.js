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

const envMock = {
	add: () => Promise.resolve(env),
	getAll: () => Promise.resolve([_.omit(env, ["slackChannels"])]),
	getChannels: () => Promise.resolve(channelsList),
	getByName: () => Promise.resolve(env)
};



describe("List", () => {
	const environment = proxyquire("../../resource/environment/environment.js", {
		"../../src/data/environment": envMock
	});

	it("should list environments", () => {
		return environment.list().then(results => results.data.should.deep.equal([_.omit(env, ["slackChannels"])]));
	});
});

describe("Get an Environment", () => {
	it("should get a valid environment", () => {
		const environment = proxyquire("../../resource/environment/environment.js", {
			"../../src/data/environment": envMock
		});

		function testResults(results) {
			return results.should.deep.equal(env);
		}
		return environment.getEnv({
			data: {
				environment: "test"
			}
		}).then(testResults);
	});

	it("should return 404 when trying to get an invalid environment", () => {
		const environment = proxyquire("../../resource/environment/environment.js", {
			"../../src/data/environment": {
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
		return environment.getEnv({
			data: {
				environment: "DNE"
			}
		}).then(testResults);
	});
});

describe("Create", () => {
	it("should create an environment", () => {
		const environment = proxyquire("../../resource/environment/environment.js", {
			"../../src/data/environment": {
				add: () => Promise.resolve(env),
				getAll: () => Promise.resolve([_.omit(env, ["slackChannels"])]),
				getChannels: () => Promise.resolve(channelsList),
				getByName: () => Promise.resolve(undefined)
			}
		});

		const envToCreate = {
			name: "d1-d02",
			baseUrl: "https://rancher.leankit.io",
			key: "key",
			secret: "secret",
			slackChannels: [
				"pd-builds"
			]
		};
		return environment.create({
			data: envToCreate
		}).then(function(res) {
			return res.data.message.should.equal("Created");
		});
	});

	it("should not create an environment", () => {
		const environment = proxyquire("../../resource/environment/environment.js", {
			"../../src/data/environment": envMock
		});
		return environment.create({
			data: {}
		}).then(res => res.data.message.should.equal("Invaild Environment"));
	});

	it("should not create an environment becuase one already exists", () => {
		const environment = proxyquire("../../resource/environment/environment.js", {
			"../../src/data/environment": envMock
		});
		const envToCreate = {
			name: "d1-d02",
			baseUrl: "https://rancher.leankit.io",
			key: "key",
			secret: "secret",
			slackChannels: [
				"pd-builds"
			]
		};
		return environment.create({
			data: envToCreate
		}).then(res => res.data.message.should.equal("Environment exists"));
	});
});

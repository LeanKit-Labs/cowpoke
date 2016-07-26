require("../setup");
const proxyquire = require("proxyquire").callThru();
const baseURL = "http://myRancher.com";
const util = require("util");
const _ = require("lodash");
const envId = "l0l";
const environmentsBody = [{
	id: envId,
	name: "Test",
	state: "active", //not mentioned in docs
	links: {
		environments: baseURL + "/v1/projects/"+envId+"/environments",
		containers: baseURL + "/v1/projects/"+envId+"/containers",
		services: baseURL + "/v1/projects/"+envId+"/services",
		stacks: baseURL + "/v1/projects/"+envId+"/environments"
	}
}];
const stackId = "2a2";
const stacksBody = [{
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
	"externalId": "catalog://leankit:drone:1",
	"kind": "environment",
	"rancherCompose": "",
}];
const upgradeTemplate = {
	version: "2",
	"docker-compose.yml": "dockerCompose",
	"rancher-compose.yml": "rancherCompose"
};

const newStack = Object.assign({}, stacksBody[0]);
newStack.rancherCompose =  upgradeTemplate["rancher-compose.yml"];
newStack.dockerCompose =  upgradeTemplate["docker-compose.yml"];

const properUpgradeRequest = {
	externalId: "catalog://leankit:drone:" + upgradeTemplate.version,
	dockerCompose: upgradeTemplate["docker-compose.yml"],
	rancherCompose: upgradeTemplate["rancher-compose.yml"],
	environment: stacksBody[0].environment
};

const resquestMoch = (options,  callback) => {
	if (options.url === stacksBody[0].actions.upgrade && _.isEqual(options.body, properUpgradeRequest)) {
		return {auth: () => callback(null, newStack)}; 
	} else {
		//console.log("hello");
		//console.log(options.url === stacksBody[0].actions.upgrade, _.isEqual(options.body, properUpgradeRequest));
		return {auth: () => callback("err")}; 
	}
};

const rancherEnv = {
	links: {
		projects: "http://myrancher.com/v1/projects"
	}
};

resquestMoch.get = (route, callback) => {
	console.log(route);
	if (route === "http://myrancher.com/v1") {
		return {auth: () => callback(null, {body: JSON.stringify(environmentsBody[0].links.stacks)})};
	} else if (route === baseURL+"/v1/projects") {
		return {auth: () => callback(null,{body: JSON.stringify(stacksBody)})};
	} else if (route === {body: JSON.stringify(environmentsBody[0].links.stacks)}) {
		return {auth: () => callback(null,stacksBody)};
	} else {
		//console.log(route);
		return {auth: () => callback("err")};
	}
};

const rancherFn = proxyquire("../../src/rancher", {
	request: resquestMoch
});

describe("Rancher API", () => {

	let rancher;
	before(() => {
		return rancherFn(baseURL, {
			key: "test",
			secret: "sneakrets"
		}).then(function(lib) {
			console.log(lib);
			rancher = lib;
		});
	});

	let environments;
	describe("when retrieving a list of environments", function() {

		before(() => {
			return rancher.listEnvironments().then((response) => {
				console.log(response);
				environments = response;
			});
		});

		it("should retrieve environments", () => {
			return environments.should.partiallyEql(environmentsBody);
		});
	});

	let stacks;
	describe("When retrieving a list of stacks in an environment", () => {
		before(() => {
			return environments[0].listStacks().then(res => {
				stacks = res;
			});
		});

		it("should retrieve stacks", () => {
			return stacks.should.partiallyEql(stacksBody);
		});
	});

	describe("When upgrading a stack", () => {
		let upgraded;
		

		before(() => {
			return stacks.upgrade(upgradeTemplate).then(res => {
				upgraded = res;
			});
		});

		it("should upgrade the Stack", () => {
			return upgraded.should.partiallyEql(newStack);
		});
	});


});

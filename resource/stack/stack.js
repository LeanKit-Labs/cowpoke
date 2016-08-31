const _ = require( "lodash" );
const Promise = require("bluebird");
const rancherFn = require( "../../src/rancher" );
const format = require( "util" ).format;
const environment = require( "../../src/data/environment" );
const rp = require( "request-promise" );

function sendMessage(slack, channels, message) {
	channels.forEach( channel => {
		slack.send( channel, message );
	}, this);
}

function shouldUpgradeStack ( stack, catalog, branch, version ) {
	if (stack.externalId) {
		const stackInfo = stack.externalId.split("://")[1].split(":");
		const stackCatalog = stackInfo[0];
		const stackBranch = stackInfo[1];
		const stackVersion = stackInfo[2];
		return stackCatalog === catalog &&
			stackBranch === branch &&
			parseInt(stackVersion) < parseInt(version);
	} else {
		return false;
	}
}

const getTemplate = Promise.coroutine(function* ( token, catalogOwner, catalog, branch, version ) {

	let response =  yield rp( format( "https://api.github.com/repos/%s/%s/contents/templates/%s/%s", catalogOwner, catalog, branch, version ), {
		qs: {
			access_token: token, // eslint-disable-line
			ref: "master"
		},
		headers: {
			"User-Agent": "cowpoke"
		},
		json: true
	} );
	
	const templateResult = {version};

	for ( var i = 0; i < response.length; i++ ) {
		templateResult[response[i].name] = yield rp( response[i].download_url, {
			qs: {
				access_token: token // eslint-disable-line
			},
			headers: {
				"User-Agent": "cowpoke"
			}
		} );
	}

	return templateResult;
	
});

const upgradeStack = Promise.coroutine(function* ( slack, envelope ) {

	//read args
	const githubInfo = envelope.data.catalog ? envelope.data.catalog.split("/") : [];
	const githubOwner = githubInfo[0];
	const githubRepo = githubInfo[1];
	const rancherCatalogName = envelope.data.rancherCatalogName;
	const branch = envelope.data.branch;
	const catalogNum = envelope.data.catalogVersion;
	const githubToken = envelope.data.githubToken;
	//check args
	if (!githubToken || !githubInfo || !githubOwner || !githubRepo || !branch || !catalogNum || !rancherCatalogName || isNaN(catalogNum)) {
		return {status: 401, data: {message: "Invaild arguments"}};
	}

	//get the template
	const template = yield getTemplate( githubToken, githubOwner, githubRepo, branch, catalogNum).catch( () => undefined );
	if ( template === undefined ) { 
		return {status: 404, data: {message: "Unable to get template yaml files from github. Check repository and token"}};
	}
	
	//get the environments
	const storedEnvironments = yield environment.getAll().catch( () => undefined );
	if ( storedEnvironments === undefined ) { 
		return {status: 500, data: {message: "Unable to get enviorments from the database"}}; 
	}

	
	//get the rancher data
	const envRequests = [];
	for ( let i = 0; i < storedEnvironments.length; i++ ) {
		envRequests.push( rancherFn( storedEnvironments[i].baseUrl, {
			key: storedEnvironments[i].key,
			secret: storedEnvironments[i].secret
		} ).catch(() => console.error("Authorization failed for ", storedEnvironments[i].name)).then(Promise.coroutine(function*(rancher) {
			if (rancher === undefined) {
				throw new Error("Authorization failed for " + storedEnvironments[i].name);
			}
			const environments = yield rancher.listEnvironments();
			return environments[_.keys( environments )[0]];
		})));
	}

	//loop through the stacks and upgrade those that match
	const rancherEnvironments = yield Promise.all( envRequests ).catch(err => ({status: 500, message: err.message}));
	if (rancherEnvironments.constructor !== Array) {
		return rancherEnvironments;
	}
	const upgraded = [];
	for (let i = 0; i < rancherEnvironments.length; i++) {
		const upgradedStacks = [];
		const channels = yield environment.getChannels().catch(() => []);
		const stacks = yield rancherEnvironments[i].listStacks();
		for ( let j = 0; j < stacks.length; j++ ) {
			if (shouldUpgradeStack( stacks[j], rancherCatalogName, branch, catalogNum )) {
				upgradedStacks.push( {
					name: stacks[j].name,
					id: stacks[j].id 
				});
				sendMessage(slack, channels, format("Starting upgrade of stack %s in %s.", stacks[j].name, rancherEnvironments[i].name));
				stacks[j].upgrade(template).then( 
					() => sendMessage(slack, channels, format("Finished upgrade of stack %s in %s.", stacks[j].name, rancherEnvironments[i].name))
				).catch( 
					() => sendMessage(slack, channels, format("There was an error during upgrade of stack %s in %s.", stacks[j].name, rancherEnvironments[i].name))
				);
			}
		}
		if (upgradedStacks.length !== 0) {
			upgraded.push( {
				environment: rancherEnvironments[i].name,
				upgraded: upgradedStacks
			});
		}
	}
	if (upgraded.length !== 0) {
		return {
			upgraded_stacks_by_environment: upgraded // eslint-disable-line
		};
	} else {
		return {message: "Nothing eligible for upgrading"};
	}
});

module.exports = {upgradeStack};

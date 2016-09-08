const Promise = require("bluebird");
const rancherFn = require( "../../src/rancher" );
const format = require( "util" ).format;
const rp = require( "request-promise" );

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

const upgradeStack = Promise.coroutine(function* ( rancherUrl, rancherUser, slack, envelope ) {

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
	const enviorments = yield rancherFn(rancherUrl, rancherUser).then(elm => elm.listEnvironments()).catch(() => undefined);
	if ( enviorments === undefined ) { 
		return {status: 500, data: {message: "Unable to get enviorments from the rancher"}}; 
	}
	if ( enviorments === undefined ) { 
		return {status: 500, data: {message: "Unable to get enviorments from the rancher"}}; 
	}
	if ( enviorments.length === 0 ) { 
		return {status: 403, data: {message: "No rancher enviorments found. Please check the cowpoke user permissions"}}; 
	}

	//loop through the stacks and upgrade those that match
	const upgraded = [];
	for (let i = 0; i < enviorments.length; i++) {
		const upgradedStacks = [];
		const stacks = yield enviorments[i].listStacks();
		for ( let j = 0; j < stacks.length; j++ ) {
			if (shouldUpgradeStack( stacks[j], rancherCatalogName, branch, catalogNum )) {
				upgradedStacks.push( {
					name: stacks[j].name,
					id: stacks[j].id 
				});
				slack.send(format("Starting upgrade of stack %s in %s.", stacks[j].name, enviorments[i].name));
				stacks[j].upgrade(template).then( 
					() => slack.send(format("Finished upgrade of stack %s in %s.", stacks[j].name, enviorments[i].name))
				).catch( 
					() => slack.send(format("There was an error during upgrade of stack %s in %s.", stacks[j].name, enviorments[i].name))
				);
			}
		}
		if (upgradedStacks.length !== 0) {
			upgraded.push( {
				environment: enviorments[i].name,
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

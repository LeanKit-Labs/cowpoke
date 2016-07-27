const _ = require( "lodash" );
const Promise = require("bluebird");
const rancherFn = require( "../../src/rancher" );
const format = require( "util" ).format;
const environment = require( "../../src/data/nedb/environment" );
const rp = require( "request-promise" );

function onFailure( err ) {
	return {
		data: {
			message: err.message
		},
		status: 500
	};
}

function list() {
	return environment.getAll().then( data => ( {data} ), onFailure );
}

function create( envelope ) {
	var data = envelope.data;
	if ( data.name && data.baseUrl && data.key && data.secret && data.slackChannels ) {
		return environment.add( data ).then( () => (
			{
				data: {
					message: "Created"
				}
			}
		), onFailure );
	} else {
		return {
			data: {
				message: "Invaild Environment"
			}
		};
	}
}

const configure = Promise.coroutine( function* ( envelope )  {
	const data = envelope.data;
	const name = data.environment;

	//get the environment
	const env = yield environment.getByName( name );
	//try to change it
	try {
		env.slackChannels = env.slackChannels || [];
		_.each( data,  item => {
			if ( ( item.field === "slackChannels" || item.path === "/slackChannels" ) ) {
				if ( item.op === "add" ) {
					env.slackChannels.push( item.value );
				} else if ( item.op === "remove" ) {
					env.slackChannels = _.without( env.slackChannels, item.value );
				}
			}
		} );
		env.slackChannels = _.unique( env.slackChannels );
		return environment.add( env ).then( () => ({
			status: 200,
			data: env
		}), () => ( {
			status: 500,
			data: {
				message: "Failed to add environment to the database"
			}
		} ) );
	} catch ( e ) {
		return {
			status: 400,
			data: {
				message: e.message
			}
		};
	}
	
} );

function getEnv( envelope ) {
	const name = envelope.data.environment;
	return environment.getByName( name ).then( env => {
		return env || {
			status: "404",
			data: {
				message: "Environment Not Found"
			}
		};
	} );
}

function sendMessage(slack, channels, message) {
	channels.forEach( channel => {
		slack.send( channel, message );
	}, this);
}

function shouldUpgradeStack ( stack, catalog, branch, version ) {
	const stackInfo = stack.externalId.split("://")[1].split(":");
	const stackCatalog = stackInfo[0];
	const stackBranch = stackInfo[1];
	const stackVersion = stackInfo[2];
	return stackCatalog === catalog &&
		stackBranch === branch &&
		parseInt(stackVersion) < parseInt(version);
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
	} ).catch(err => console.error(err));

	if (response === undefined) {
		return undefined;
	}
	
	const templateResult = {version};

	for ( var i = 0; i < response.length; i++ ) {
		templateResult[response[i].name] = yield rp( response[i].download_url, {
			qs: {
				access_token: token // eslint-disable-line
			},
			headers: {
				"User-Agent": "cowpoke"
			}
		} ).catch(err => console.error(err));
	}

	return templateResult;
	
});

const upgradeStack = Promise.coroutine(function* ( slack, envelope ) {

	//read args
	const githubInfo = envelope.data.catalog ? envelope.data.catalog.split("/") : [];
	const githubOwner = githubInfo[0];
	const githubRepo = githubInfo[1];
	const rancherCatalogName = envelope.data.rancher_catalog_name;
	const branch = envelope.data.branch;
	const catalogNum = envelope.data.catalog_version;
	const githubToken = envelope.data.github_token;

	//check args
	if (!githubToken || !githubInfo || !githubOwner || !githubRepo || !branch || !catalogNum || !rancherCatalogName || isNaN(catalogNum)) {
		return {status: 401, data: {message: "Invaild arguments"}};
	}

	//get the template
	const template = yield getTemplate( githubToken, githubOwner, githubRepo, branch, catalogNum);
	if ( template === undefined ) { 
		return {
			status: 404,
			data: {
				message: "Unable to get information from github"
			}
		};
	}
	
	//get the environments
	const storedEnvironments = yield environment.getAll().catch( () => undefined );
	if ( storedEnvironments === undefined ) { 
		return {status: 404, data: {message: "Unable to get information from the database"}}; 
	}

	
	//get the rancher data
	const envRequests = [];
	for ( let i = 0; i < storedEnvironments.length; i++ ) {
		envRequests.push( rancherFn( storedEnvironments[i].baseUrl, {
			key: storedEnvironments[i].key,
			secret: storedEnvironments[i].secret
		} )
		.then( rancher => rancher.listEnvironments())
		.then(environments => environments[_.keys( environments )[0]])
		.catch(error => {
			console.log("error while trying to connect to " + storedEnvironments[i].name, ": ", error);
			return [];
		}));
	}

	//loop through the stacks and upgrade those that match
	const rancherEnvironments = yield Promise.all( envRequests );
	const upgraded = [];
	for (let i = 0; i < rancherEnvironments.length; i++) {
		const upgradedStacks = [];
		const channels = yield environment.getChannels();
		const stacks = yield rancherEnvironments[i].listStacks();
		for ( let j = 0; j < stacks.length; j++ ) {
			if (shouldUpgradeStack( stacks[j], rancherCatalogName, branch, catalogNum )) {
				upgradedStacks.push( {
					name: stacks[j].name,
					id: stacks[j].id 
				});
				sendMessage(slack, channels, "starting upgrade of stack " + stacks[j].name + " in " + rancherEnvironments[i].name);
				stacks[j].upgrade(template).then( 
					() => sendMessage(slack, channels, "finished upgrade of stack " + stacks[j].name + " in " + rancherEnvironments[i].name)
				).catch( error => {
					console.error("error incountered while trying to upgrade stack ", stacks[j].name, " in ", rancherEnvironments[i].name, ": ", error);
					sendMessage(slack, channels, "there was an error during upgrade of stack " + stacks[j].name + " in " + rancherEnvironments[i].name + ".");
				});
			}
		}
		if (upgradedStacks.length !== 0) {
			upgraded.push( {
				environment: rancherEnvironments[i].name,
				upgraded: upgradedStacks
			});
		}
	}
	if (upgraded) {
		return {
			upgraded_stacks_by_environment: upgraded // eslint-disable-line
		};
	} else {
		return "Nothing eligible for upgrading";
	}
});

module.exports = {
	list,
	create,
	configure,
	getEnv,
	upgradeStack
};

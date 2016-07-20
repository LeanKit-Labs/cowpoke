const _ = require( "lodash" );
const Promise = require("bluebird");
const rancherFn = require( "../../src/rancher" );
const format = require( "util" ).format;
const environment = require( "../../src/data/nedb/environment" );
const util = require( "../../src/util" );
const yaml = require( "js-yaml" );
const rp = require( "request-promise" );

const isnum = val => /^\d+$/.test( val );

function onFailure( err ) {
	return {
		data: {
			message: err.message
		},
		status: 500
	};
}

const connectionError = {
	status: 500,
	data: {
		message: "Could not connect to Rancher instance."
	}
};

const readError = {
	status: 404,
	data: {
		message: "Unable to get information from the database"
	}
};

const dockerError = {
	data: {
		message: "Validation with Dockerhub failed."
	},
	status: 401
};

const tagNotFoundError = {
	data: {
		message: "Image does not exist in Dockerhub"
	},
	status: 404
};

function invalidTagError(image) {
	return {
		status: 400,
		data: {
			message: "Invalid Image (" + image + "). Expected tag to be formatted by buildgoggles."
		}
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

const configurationProcess = Promise.coroutine( function* ( name, data )  {
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

function configure( envelope ) {
	const data = envelope.data;
	const name = data.environment;
	return configurationProcess(name, data);
}

function sendMessage(slack, channels, message) {
	channels.forEach( channel => {
		slack.send( channel, message );
	}, this);
}

const notificationProcess = Promise.coroutine( function* ( image, environmentName, env, slack, services )  {
	//get channels to notify	
	let channels = yield environment.getChannels( environmentName );
	channels = channels || [];
	//send first notificaiton
	const names = _.pluck( _.flatten( services ), "name" );
	names[0] = "\n - " + names[0];
	const message = format( "Upgrading the following services to %s, hombre: %s",
	image, names.join( "\n - " ) );
	sendMessage(slack, channels, message);
	//create a object to store services in
	const pendingUpgrade = {};
	services.forEach( service => {
		pendingUpgrade[service.id] = true;
	}, this);
	//poll rancher
	while (!_.isEmpty(pendingUpgrade)) {
		let currentServices = yield env.listServices();
		_.forEach(currentServices, service => {
			if ( pendingUpgrade[service.id] && service.state === "upgraded" ) {
				service.finish().then(() => {
					sendMessage(slack, channels, format( "The service %s in environment %s has finalized successfully, amigo", service.name, env.name ) );
				}, () => {
					sendMessage(slack, channels, format( "The service %s in environment %s has experienced and error and failed to finalize, amigo", service.name, env.name ) );
				});
				delete pendingUpgrade[service.id];
			}
		}, this);
		yield Promise.delay(5000);
	}
	return true; //end routine

} );

const upgradeProcess = Promise.coroutine( function* ( slack, image ) {
	
	//Get the environments from the database
	let environments = yield environment.getAll().catch( () => readError);
	//encase of error return it
	if ( environments.status ) {
		return environments;
	}
	
	//Authenticate with rancher
	let authenticatedEnvs = yield Promise.all( _.map( environments,  env => 
		rancherFn( env.baseUrl, {
			key: env.key,
			secret: env.secret
		} ).catch( () => connectionError )
	) );
	//get the information from the api
	let rancherEnvData = yield Promise.all( _.map( authenticatedEnvs, rancher => {
		if (_.isEqual(rancher, connectionError)) { //check for error
			return Promise.resolve(connectionError);
		}
		return rancher.listEnvironments().catch( () => connectionError );
	} ) );
	//upgrade the service
	let upgrades =  _.flatten( yield Promise.all( _.map( rancherEnvData, environments => {
		if (_.isEqual(environments, connectionError)) { //check for error
			return Promise.resolve(environments);
		}
		const name = _.keys( environments )[0];
		const env = environments[name];
		return env.upgrade( image ).then( (services) => {
			notificationProcess(image, name, env, slack, services); //start but do not await the notificaiton
			return services;
		}, () => ({
			status: 500,
			data: {
				message: "An error occurred during upgrade of environment '" + name + "'"
			}
		} ) );
	} ) ) );
	//return the results
	if ( upgrades.length > 0 ) {
		return {
			data: {
				upgradedServices: upgrades
			}
		};
	} else {
		return {
			data: {
				message: "No services were eligible for upgrading"
			}
		};
	}
} );


function upgrade( slack, dockerhub, envelope ) {
	const image = envelope.data.image;
	if ( !util.getImageInfo( image ) ) { //check tag if tag is formated correctly
		return invalidTagError(image);
	}
	return dockerhub.checkExistance( image ).then( tagExsits => {
		if ( tagExsits === undefined ) {
			return Promise.resolve( dockerError );
		} else if ( tagExsits ) {
			return upgradeProcess(slack, image);
		} else {
			return Promise.resolve( tagNotFoundError );
		}
	} );
}

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

const readTemplate = Promise.coroutine(function* (token, v, response){
	const templateResult = {
		version: v
	};
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

const getTemplate = Promise.coroutine(function* ( token, catalogOwner, catalog, info ) {

	let response =  yield rp( format( "https://api.github.com/repos/%s/%s/contents/templates/%s?ref=master", catalogOwner, catalog, info.branch ), {
		qs: {
			access_token: token // eslint-disable-line
		},
		headers: {
			"User-Agent": "cowpoke"
		},
		json: true
	} ).catch(err => {
		console.error(err);
		return undefined;
	});

	if (response === undefined) {
		return undefined;
	}
	
	const templateRequests = [];
	for (let i = 0; i < response.length; i++) {
		if ( isnum( response[i].name ) ) {
			templateRequests.push(rp( response[i]._links.self, {
				qs: {
					access_token: token // eslint-disable-line
				},
				headers: {
					"User-Agent": "cowpoke"
				},
				json: true
			}).then(readTemplate.bind(null, token, response[i].name)));
		}
	}
	let templates = yield Promise.all(templateRequests);
	for (let i = 0; i < templates.length; i++) {
		let dockerCompose = yaml.safeLoad( templates[i]["docker-compose.yml"] );
		for (let service in dockerCompose) {
			const currentImage = util.getImageInfo( dockerCompose[service].image );
			if (dockerCompose.hasOwnProperty(service) && currentImage && currentImage.newImage === info.newImage) {
				return  templates[i];
			}
		}
	}
	return undefined;
});

const upgradeStack = Promise.coroutine(function* ( slack, dockerhub, github, envelope ) {
	const info = util.getImageInfo( envelope.data.docker_image );
	if (!info) {
		return invalidTagError(envelope.data.docker_image);
	}
	const exists = dockerhub.checkExistance( envelope.data.docker_image );
	if (exists === undefined) {
		return dockerError;
	} else if (!exists) {
		return tagNotFoundError;
	}
	//get the template
	const template = yield getTemplate( github.token, github.owner, envelope.data.rancher_catalog, info);
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
		return readError;
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
			console.log("error while trying to connect to " + storedEnviorments[i].name, ": ", error);
			return [];
		}));
	}
	//loop through the stacks and upgrade those that match
	const rancherEnviorments = yield Promise.all( envRequests );
	const upgraded = [];
	for (let i = 0; i < rancherEnviorments.length; i++) {
		const upgradedStacks = [];
		const channels = yield environment.getChannels();
		const stacks = yield rancherEnviorments[i].listStacks();
		for ( let j = 0; j < stacks.length; j++ ) {
			const shouldUpgrade = yield util.shouldUpgradeStack( stacks[j], info );
			if (shouldUpgrade) {
				upgradedStacks.push( {
					name: stacks[j].name,
					id: stacks[j].id 
				});
				sendMessage(slack, channels, "starting upgrade of stack " + stacks[j].name + " in " + rancherEnviorments[i].name);
				stacks[j].upgrade(template).then( 
					() => sendMessage(slack, channels, "finished upgrade of stack " + stacks[j].name + " in " + rancherEnviorments[i].name)
				).catch( error => {
					console.error("error incountered while trying to upgrade stack ", stacks[j].name, " in ", rancherEnviorments[i].name, ": ", error);
					sendMessage(slack, channels, "there was an error during upgrade of stack " + stacks[j].name + " in " + rancherEnviorments[i].name + ".");
				});
			}
		}
		if (upgradedStacks.length !== 0) {
			upgraded.push( {
				environment: rancherEnviorments[i].name,
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
	upgrade,
	getEnv,
	upgradeStack
};


var _ = require( "lodash" );
var when = require( "when" );
var rancherFn = require( "../../src/rancher" );
var format = require( "util" ).format;
var environment = require( "../../src/data/nedb/environment" );
var util = require( "../../src/util" );
var dockerhub = require( "../../src/dockerhub" );
var rp = require( "request-promise" );
var yaml = require( "js-yaml" );
function isnum ( val ) {
	return /^\d+$/.test( val );
}
var statusIntervals = {};
var pendingUpgrade = {};

function onFinish( slack, channels, env, service ) {
	var message = format( "The upgrade of the service %s in environment %s has been finalized.", service.name, env.name );
	_.each( channels, function( channel ) {
		slack.send( channel, message );
	} );
}
function sendError( slack, channels, env, service ) {
	var message = format( "The finalization of the upgrade of the service %s in environment %s has failed.", service.name, env.name );
	_.each( channels, function( channel ) {
		slack.send( channel, message );
	} );
}
function onServiceList( env, channels, slack, services ) {
	_.each( services, function( service ) {
			if ( pendingUpgrade[ service.id ] && service.state === "upgraded" ) {
				delete pendingUpgrade[ service.id ];
				service.finish().then( onFinish.bind( null, slack, channels, env ), sendError.bind( null, slack, channels, env, service ) );
			}
		} );
}

function checkStatus( env, slack, channels ) {
	env.listServices().then( onServiceList.bind( null, env, channels, slack ) );
}

function createServiceChecks( env, slack, services, channels ) {
	_.each( services, function( service ) {
		if ( !statusIntervals[ service.environmentId ] ) {
			statusIntervals = setInterval( checkStatus.bind( null, env, slack, channels ), 5000 );
		}
		if ( !pendingUpgrade[ service.id ] ) {
			pendingUpgrade[ service.id ] = true;
		}
	} );
}
function onFailure( err ) {
	return {
		data: {
			message: err.message
		},
		status: 500
	};
}

function onSuccess( data ) {
	return { data: data };
}

function onUpdated( env ) {
	return {
		status: 200,
		data: env
	};
}

function onCreated() {
	return {
		data: {
			message: "Created"
		}
	};
}

function onError( err ) {
	return {
		status: 500,
		data: {
			message: "Failed due to server error."
		}
	};
}

function onEnvironment( data, env ) {
	try {
		env.slackChannels = env.slackChannels || [];
		_.each( data, function( item ) {
			if ( ( item.field === "slackChannels" || item.path === "/slackChannels" ) ) {
				if ( item.op === "add" ) {
					env.slackChannels.push( item.value );
				} else if ( item.op === "remove" ) {
					env.slackChannels = _.without( env.slackChannels, item.value );
				}
			}
		} );
		env.slackChannels = _.unique( env.slackChannels );
		return environment.add( env ).then( onUpdated.bind( null, env ), onError );
	} catch ( e ) {
		return {
			status: 400,
			data: {
				message: e.stack
			}
		};
	}
}

function onUpgradeError( name, error ) {
	return {
		status: 500,
		data: {
			error: error.stack,
			message: "An error occurred during upgrade of environment \"" + name + "\""
		}
	};
}

function onChannels( image, env, services, slack, channels ) {
	if ( channels && channels.length && services && services.length ) {
		var names = _.pluck( _.flatten( services ), "name" );
		names[ 0 ] = "\n - " + names[ 0 ];
		var message = format( "Upgrading the following services to %s, hombre: %s",
		image, names.join( "\n - " ) );
		_.each( channels, function( channel ) {
			slack.send( channel, message );
		} );
		createServiceChecks( env, slack, services, channels );
	}
}

function onEnvironmentsLoaded( image, slack, environments ) {
	var name = _.keys( environments )[ 0 ];
	var env = environments[ name ];
	return env.upgrade( image ).then( onServices.bind( null, image, name, env, slack ), onUpgradeError.bind( null, name ) );
}

function onRancher( image, slack, rancher ) {
	return rancher.listEnvironments().then( onEnvironmentsLoaded.bind( null, image, slack ), onConnectionError );
}

function onConnectionError( error ) {
	return {
		status: 500,
		data: {
			message: "Could not connect to Rancher instance."
		}
	};
}

function onEnvironments( image, slack, environments ) {
	var upgrades = _.map( environments, function( env ) {
		return rancherFn( env.baseUrl, {
			key: env.key,
			secret: env.secret
		} ).then( onRancher.bind( null, image, slack ), onConnectionError );
	} );

	return when.all( upgrades ).then( function( lists ) {
		if ( lists.length > 0 ) {
			return {
				data: {
					upgradedServices: _.flatten( lists )
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
}

function onReadError( error ) {
	return {
		status: 404,
		data: {
			message: "Unable to get information for environment \"" + name + "\""
		}
	};
}

function onServices( image, environmentName, env, slack, services ) {
	environment.getChannels( environmentName ).then( onChannels.bind( null, image, env, services, slack ) );
	return services;
}

function list() {
	return environment.getAll().then( onSuccess, onFailure );
}

function create( envelope ) {
	var data = envelope.data;
	if ( data.name && data.baseUrl && data.key && data.secret && data.slackChannels ) {
		return environment.add( data ).then( onCreated, onFailure );
	} else {
		return {
			data: {
			    message: "Invaild Environment"
		    }
		};
	}
}

function configure( envelope ) {
	var data = envelope.data;
	var name = data.environment;
	return environment.getByName( name ).then( onEnvironment.bind( null, data ), onError );
}

function upgrade( slack, envelope ) {
	var image = envelope.data.image;
	if ( !util.getImageInfo( image ) ) { //check tag if tag is formated correctly
		return {
			status: 400,
			data: {
				message: "Invalid Image (" + image + "). Expected tag to be formatted by buildgoggles."
			}
		};
	}
	return dockerhub.checkExistance( image ).then( function( tagExsits ) {
		if ( tagExsits === undefined ) {
			return Promise.resolve( {
				data: {
					message: "Validation with Dockerhub failed."
				},
				status: 401
			} );
		} else if ( tagExsits ) {
			return environment.getAll().then( onEnvironments.bind( null, image, slack ), onReadError );
		} else {
			return Promise.resolve( {
				data: {
					message: "Image does not exist in Dockerhub"
				},
				status: 404
			} );
		}
	} );
}

function getTemplate( token, catalogOwner, catalog, info ) {
	function onRancherCompose( templateResult, rancherCompose ) {
		templateResult["rancher-compose.yml"] = rancherCompose;
		return templateResult;
	}
	function onDockerCompose( templateResult, response, dockerCompose ) {
		templateResult["docker-compose.yml"] = dockerCompose;
		for ( var i = 0; i < response.length; i++ ) {
			if ( response[i].name === "rancher-compose.yml" ) {
				return rp( response[i].download_url, {
					qs: {
						access_token: token
					},
					headers: {
						"User-Agent": "cowpoke"
					}
				} ).then( onRancherCompose.bind( null, templateResult ) );
			}
		}
	}
	function onTemplate( v, response ) {
		 var templateResult = {
			version: v
		};
		var files = [];
		for ( var i = 0; i < response.length; i++ ) {
			if ( response[i].name === "docker-compose.yml" ) {
				return rp( response[i].download_url, {
					qs: {
						access_token: token
					},
					headers: {
						"User-Agent": "cowpoke"
					}
				} ).then( onDockerCompose.bind( null, templateResult, response ) );
			}
		}
	}
	function onResponse( response ) {
		return when.all( _.map( response, function( dir ) {
			if ( isnum( dir.name ) ) {
				return rp( dir._links.self, {
					qs: {
						access_token: token
					},
					headers: {
						"User-Agent": "cowpoke"
					},
					json: true
				} ).then( onTemplate.bind( null, dir.name ) );
			}
		} ) ).then( function( templates ) {
			return _.filter( templates, function( template ) {
				if ( !template ) {
					return false;
				}
				var dockerCompose = yaml.safeLoad( template["docker-compose.yml"] );
				return util.getImageInfo( dockerCompose[info.docker.image + "-app"].image ).newImage === info.newImage;
			} );
		} ).then( function name( resultsAsArray ) {
			return resultsAsArray[0];
		} );
	}

	return rp( format( "https://api.github.com/repos/%s/%s/contents/templates/%s?ref=master", catalogOwner, catalog, info.branch ), {
			qs: {
				access_token: token
			},
			headers: {
				"User-Agent": "cowpoke"
			},
			json: true
		} ).then( onResponse ).catch( console.log );
}

function upgradeStack( slack, github, envelope ) {
	var info = util.getImageInfo( envelope.data.docker_image );
	function onTemplate( template ) {
		return environment.getAll().then( onEnvs.bind( null, template ), onReadError );
	}
	function finish( env, channels, stack ) {
		var message = format( "The upgrade of the stack %s in environment %s has been finalized.", stack.name, env.name );
		_.each( channels, function( channel ) {
			slack.send( channel, message );
		} );
		return stack;
	}
	function onChannels( env, template, stack, channels ) {
		var message = format( "The upgrade of the stack %s in environment %s has started.", stack.name, env.name );
		_.each( channels, function( channel ) {
			slack.send( channel, message );
		} );
		return stack.upgrade( template ).then( finish.bind( null, env, channels ) );
	}
	function onStacks( env, template, stacks ) {
		var upgradedStacks = [];
		function onUpgradeCheck( stack, should ) {
			if ( should ) {
				upgradedStacks.push( stack );
				environment.getChannels().then( onChannels.bind( null, env, template, stack ) );
			}
		}
		var promiseList = [];
		for ( var i = 0; i < stacks.length; i++ ) {
			promiseList.push( util.shouldUpgradeStack( stacks[i], info ).then( onUpgradeCheck.bind( null, stacks[i] ) ) );
		}
		return when.all( promiseList ).then( function() {
			return upgradedStacks;
		} ).catch( function name( e ) {
			console.log( e );
		} );
	}
	function onEnvironmentsLoaded( template, environments ) {
		var name = _.keys( environments )[ 0 ];
		var env = environments[ name ];
		return env.listStacks().then( onStacks.bind( null, env, template ) );
	}

	function onRancher( template, rancher ) {
		return rancher.listEnvironments().then( onEnvironmentsLoaded.bind( null, template ), onConnectionError );
	}

	function onEnvs( template, envs ) {
		var done = [];
		for ( var i = 0; i < envs.length; i++ ) {
			done.push( rancherFn( envs[i].baseUrl, {
				key: envs[i].key,
				secret: envs[i].secret
			} ).then( onRancher.bind( null, template ), onConnectionError ) );
		}
		return when.all( done );
	}
	return getTemplate( github.token, github.owner, envelope.data.rancher_catalog, info ).then( onTemplate );
}

function getEnv( envelope ) {
	var name = envelope.data.environment;
	function onEnv( env ) {
		return env || {
			status: "404",
			data: {
			    message: "Environment Not Found"
		    }
		};
	}
	return environment.getByName( name ).then( onEnv );
}

module.exports = {
	list: list,
	create: create,
	configure: configure,
	upgrade: upgrade,
	getEnv: getEnv,
	upgradeStack: upgradeStack
};

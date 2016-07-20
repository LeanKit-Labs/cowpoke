var _ = require( "lodash" );
var when = require( "when" );
var rancherFn = require( "../../src/rancher" );
var format = require( "util" ).format;
var environment = require( "../../src/data/nedb/environment" );
var util = require( "../../src/util" );
var dockerhub = require( "../../src/dockerhub" );
var rp = require( "request-promise" );
var getTemplate = require( "../../src/getTemplate" );

function onReadError( error ) {
	return {
		status: 404,
		data: {
			message: "Unable to get information for environment \"" + name + "\""
		}
	};
}

function onConnectionError( error ) {
	return {
		status: 500,
		data: {
			message: "Could not connect to Rancher instance."
		}
	};
}

function onEnvironmentsLoaded( info, slack, template, environments ) {
	var name = _.keys( environments )[0];
	var env = environments[name];
	return env.listStacks().then( onStacks.bind( null, info, slack, env, template ) );
}

function onEnvs( info, slack, template, envs ) {
	function onRancher( rancher ) {
		return rancher.listEnvironments().then( onEnvironmentsLoaded.bind( null, info, slack, template ), onConnectionError );
	}
	var done = [];
	for ( var i = 0; i < envs.length; i++ ) {
		done.push( rancherFn( envs[i].baseUrl, {
			key: envs[i].key,
			secret: envs[i].secret
		} ).then( onRancher, onConnectionError ) );
	}
	return when.all( done );
}

function onChannels( slack, env, template, stack, channels ) {
	var message = format( "The upgrade of the stack %s in environment %s has started.", stack.name, env.name );
	_.each( channels, function( channel ) {
		slack.send( channel, message );
	} );
	return stack.upgrade( template ).then( finish.bind( null, env, channels, slack ) );
}

function onStacks( info, slack, env, template, stacks ) {
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

function finish( env, channels, stack, slack ) {
	var message = format( "The upgrade of the stack %s in environment %s has been finalized.", stack.name, env.name );
	_.each( channels, function( channel ) {
		slack.send( channel, message );
	} );
	return stack;
}

module.exports = function upgradeStack( slack, github, envelope ) {
	var info = util.getImageInfo( envelope.data.docker_image );
	return getTemplate( github.token, github.owner, envelope.data.rancher_catalog, info ).then( function( template ) {
		return environment.getAll().then( onEnvs.bind( null, info, slack, template ), onReadError );
	} );
};

const Promise = require( "bluebird" );
const rancherFn = require( "../../src/rancher" );
const format = require( "util" ).format;
const rp = require( "request-promise" );

function shouldUpgradeStack( stack, catalog, branch, version ) {
	if ( !stack.externalId ) {
		return false;
	}

	const stackInfo = stack.externalId.split( "://" )[ 1 ].split( ":" );
	const stackCatalog = stackInfo[ 0 ];
	const stackBranch = stackInfo[ 1 ];
	const stackVersion = stackInfo[ 2 ];
	return ( stackCatalog === catalog && stackBranch === branch && parseInt( stackVersion, 10 ) < parseInt( version, 10 ) );
}

const getTemplate = Promise.coroutine( function *( token, catalogOwner, catalog, branch, version ) {
	const response = yield rp( format( "https://api.github.com/repos/%s/%s/contents/templates/%s/%s", catalogOwner, catalog, branch, version ), {
		qs: {
			access_token: token, // eslint-disable-line
			ref: "master"
		},
		headers: {
			"User-Agent": "cowpoke"
		},
		json: true
	} );

	const templateResult = { version };

	for ( let i = 0; i < response.length; i++ ) {
		templateResult[ response[ i ].name ] = yield rp( response[ i ].download_url, {
			qs: {
				access_token: token // eslint-disable-line
			},
			headers: {
				"User-Agent": "cowpoke"
			}
		} );
	}

	return templateResult;
} );

const upgradeStack = Promise.coroutine( function *( rancherUrl, rancherUser, slack, envelope ) {
	const githubInfo = envelope.data.catalog ? envelope.data.catalog.split( "/" ) : [];
	const githubOwner = githubInfo[ 0 ];
	const githubRepo = githubInfo[ 1 ];
	const rancherCatalogName = envelope.data.rancherCatalogName;
	const branch = envelope.data.branch;
	const catalogNum = envelope.data.catalogVersion;
	const githubToken = envelope.data.githubToken;

	if ( !githubToken || !githubInfo || !githubOwner || !githubRepo || !branch || !catalogNum || !rancherCatalogName || isNaN( catalogNum ) ) {
		return { status: 401, data: { message: "Invaild arguments" } };
	}

	const template = yield getTemplate( githubToken, githubOwner, githubRepo, branch, catalogNum ).catch( () => undefined );
	if ( template === undefined ) {
		return { status: 404, data: { message: "Unable to get template yaml files from github. Check repository and token" } };
	}

	const environments = yield rancherFn( rancherUrl, rancherUser ).then( elm => elm.listEnvironments() ).catch( () => undefined );
	if ( environments.length === 0 ) {
		return { status: 403, data: { message: "No rancher environments found. Please check the cowpoke user permissions" } };
	}

	const upgraded = [];
	for ( let i = 0; i < environments.length; i++ ) {
		const upgradedStacks = [];
		const stacks = yield environments[ i ].listStacks();
		for ( let j = 0; j < stacks.length; j++ ) {
			if ( shouldUpgradeStack( stacks[ j ], rancherCatalogName, branch, catalogNum ) ) {
				upgradedStacks.push( {
					name: stacks[ j ].name,
					id: stacks[ j ].id
				} );
				slack.send( `Starting upgrade of stack ${stacks[ j ].name} in ${environments[ i ].name}` );
				stacks[ j ].upgrade( template ).then(
					() => slack.send( `Finished upgrade of stack ${stacks[ j ].name} in ${environments[ i ].name}` )
				).catch(
					() => slack.send( `There was an error during upgrade of stack ${stacks[ j ].name} in ${environments[ i ].name}` )
				);
			}
		}
		if ( upgradedStacks.length !== 0 ) {
			upgraded.push( {
				environment: environments[ i ].name,
				upgraded: upgradedStacks
			} );
		}
	}

	let response;

	if ( upgraded.length ) {
		response = { upgraded_stacks_by_environment: upgraded }; // eslint-disable-line
	} else {
		response = { message: "Nothing eligible for upgrading" };
	}

	return response;
} );

module.exports = { upgradeStack };

const environments = require( "./db" )( "environments.db" );

function add( environment ) {
	return environments.upsert( {name: environment.name},
		{
			$set: environment
		}
	);
}

function getAll() {
	return environments.fetch( {} );
}

function getByName( environmentName ) {
	return environments.fetch( {name: environmentName} )
		.then( results => {
			if ( results.length > 0 ) {
				return results[0];
			} else {
				return undefined;
			}
		}, err => {
			throw new Error( "Could not access environments with " + err.toString());
		} );
}

function getChannels( environmentName ) {
	return environments.fetch( {name: environmentName} ).then( results => {
		if ( results.length > 0 ) {
			return results[0].slackChannels || [];
		} else {
			return [];
		}
	} );
}

module.exports = {
	add,
	getAll,
	getByName,
	getChannels
};

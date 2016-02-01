var environments = require( "./db" )( "environments.db" );

function add( environment ) {
	return environments.upsert( { name: environment.name },
		{
			$set: environment
		}
	);
}

function getAll() {
	return environments.fetch( {} );
}

function getByName( environmentName ) {
	function onResult( results ) {
		if( results.length > 0 ) {
			return results[ 0 ];
		} else {
			return undefined;
		}
	};

	function onError( err ) {
		throw new Error( "Could not access environments with " + err.toString() );
	}

	return environments.fetch( { name: environmentName } )
		.then( onResult, onError )
}

function getChannels( environmentName ) {
	function onResult( results ) {
		if( results.length > 0 ) {
			return results[ 0 ].slackChannels || [];
		} else {
			return [];
		}
	};

	function onError( err ) {
		throw new Error( "Could not access environments with " + err.toString() );
	}

	return environments.fetch( { name: environmentName } )
		.then( onResult )
}

module.exports = {
	add: add,
	getAll: getAll,
	getByName: getByName,
	getChannels: getChannels
};

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

module.exports = {
	add: add,
	getAll: getAll
};

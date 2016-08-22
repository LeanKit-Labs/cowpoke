const environments = require( "./db" )( "environments.db" );

function add( environment ) {
	return environments.insert( environment );
}

function update(environment) {
	return environments.update( environment );
}

function remove( name ) {
	return environments.remove( name );
}

function getAll() {
	return environments.fetch();
}

function getByName( environmentName ) {
	return environments.fetch( environmentName ).catch( err => {
		throw new Error( "Could not access environments with " + err.toString());
	});
}

function getChannels( environmentName ) {
	return environments.fetch( environmentName ).then( env => {
		return env.slackChannels || [];
	} ).catch(() => []);
}

module.exports = {
	add,
	getAll,
	getByName,
	getChannels,
	remove,
	update
};

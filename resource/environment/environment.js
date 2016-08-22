const _ = require( "lodash" );
const Promise = require("bluebird");
const environment = require( "../../src/data/environment" );

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
		return environment.update( env ).then( () => ({
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

module.exports = {
	list,
	create,
	configure,
	getEnv
};

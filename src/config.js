// only load local .env files if the service is not running in a procudtion envionment
if ( !process.env.NODE_ENV || process.env.NODE_ENV === "development" ) {
	require( "dotenv" ).config();
}

const validateEnvVars = () => {
	const requiredEnvVars = [ "HOST_PORT", "RANCHER_URL", "RANCHER_USER_KEY", "RANCHER_USER_SECRET" ];
	const optionalEnvVars = [ "SLACK_TOKEN", "SLACK_CHANNELS", "API_KEY" ];

	optionalEnvVars.map( x => {
		if ( !process.env[ x ] ) {
			console.warn( `config value [${x}] not provided` );
		}
	} );

	const errors = requiredEnvVars.reduce( ( errs, curVar ) => {
		if ( !process.env[ curVar ] ) {
			errs.push( `${curVar} is a required configuration value` );
		}

		return errs;
	}, [] );

	return errors;
};

const getSlackChannels = () => {
	let channels = [];
	if ( process.env.SLACK_CHANNELS ) {
		channels = process.env.SLACK_CHANNELS.split( "," ).reduce( ( chans, curVal ) => {
			if ( curVal.trim() ) {
				chans.push( curVal );
			}

			return chans;
		}, [] );
	}

	return channels;
};

module.exports = {
	validateEnvVars,
	getSlackChannels
};

const util = require( "../util" );

function getAffectedServices( storage, image ) {
	const info = util.getImageInfo( image );
	return storage.service.findUpgradableServices( info );
}

function init( storage, rancher ) {
	return {
		upgrade: upgrade.bind( null, storage, rancher )
	};
}

function upgrade( storage, rancher, image ) {
	function onSuccess( data ) {
		return data;
	}
	function onFailure( err ) {
		return err.message;
	}
	function onServices( result ) {
		return rancher.upgrade( storage, result.info, result.services )
			.then( onSuccess, onFailure );
	}
	function onServiceError( err ) {
		return err.message;
	}

	return getAffectedServices( storage, image )
		.then( onServices, onServiceError );
}

module.exports = init;

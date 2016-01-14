var _ = require( "lodash" );
var semver = require( "semver" );

function getImageInfo( image ) {
	image = image.replace( /^docker[:]/g, "" );
	var imageParts = image.split( ":" );
	var main = imageParts[ 0 ];
	var tag = imageParts[ 1 ] || "";
	var dockerParts = main.split( "/" );
	var dockerImage, dockerRepo;
	if ( dockerParts.length > 1 ) {
		dockerRepo = dockerParts[ 0 ];
		dockerImage = dockerParts[ 1 ];
	} else {
		dockerImage = dockerParts[ 1 ];
		dockerRepo = "";
	}
	var info = tag.split( "_" );
	return {
		newImage: image,
		docker: {
			image: dockerImage,
			repo: dockerRepo,
			tag: tag
		},
		owner: info[ 0 ],
		repository: info[ 1 ],
		branch: info[ 2 ],
		version: info[ 3 ],
		build: info.length === 6 ? info[ 4 ] : "",
		commit: info.length === 6 ? info[ 5 ] : info[ 4 ]
	};
}

function shouldUpgrade( service, newInfo ) {
	var info = service.buildInfo;
	var version = _.filter( [ info.version, info.build ] ).join( "-" );
	var newVersion = _.filter( [ newInfo.version, newInfo.build ] ).join( "-" );

	var compatible = info.owner === newInfo.owner &&
					info.repository === newInfo.repository &&
					info.branch === newInfo.branch;
	var isNewer = semver.gtr( newVersion, version );

	return compatible && isNewer;
}

module.exports = {
	getImageInfo: getImageInfo,
	shouldUpgrade: shouldUpgrade
};

var _ = require( "lodash" );
var semver = require( "semver" );

//var log = console.log;

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
    //log("in shouldUpgrade in util.js");
	var info = service.buildInfo;
	var version = _.filter( [ info.version, info.build ] ).join( "-" );
	var newVersion = _.filter( [ newInfo.version, newInfo.build ] ).join( "-" );
    //log("in shouldUpgrade in util.js: current's owner = " + info.owner + " new images owner = " + newInfo.owner);
    //log("in shouldUpgrade in util.js: current's repository = " + info.repository + " new images repository = " + newInfo.repository);
    //log("in shouldUpgrade in util.js: current's branch = " + info.branch + " new images branch = " + newInfo.branch);
	var compatible = info.owner === newInfo.owner &&
					info.repository === newInfo.repository &&
					info.branch === newInfo.branch;
    //log("in shouldUpgrade in util.js: compatible = " + compatible);
    
	var isNewer = semver.gtr( newVersion, version );
    //log("shouldUpgrade in util.js: current = " + version + " compared with new = " + newVersion + " means that isNewer = " + isNewer);
    
    //log("in shouldUpgrade in util.js: shouldUpgrade = " + (compatible && isNewer));
    
    
	return compatible && isNewer;
}

module.exports = {
	getImageInfo: getImageInfo,
	shouldUpgrade: shouldUpgrade
};

var _ = require( "lodash" );
var semver = require( "semver" );

function checkInfo( info ) {
	return ( info.owner !== "" ) &&
	( info.repository !== "" ) &&
	( info.branch !== "" ) &&
	( info.version !== "" ) &&
	( info.build !== "" ) &&
	( info.commit !== "" ) &&
	( semver.valid( info.version ) );
}

function getImageInfo( image ) {
	image = image.replace( /^docker[:]/g, "" );
	var imageParts = image.split( ":" );
	var main = imageParts[0];
	var tag = imageParts[1] || "";
	var dockerParts = main.split( "/" );
	var dockerImage, dockerRepo;
	if ( dockerParts.length > 1 ) {
		dockerRepo = dockerParts[0];
		dockerImage = dockerParts[1];
	} else {
		dockerImage = dockerParts[1];
		dockerRepo = "";
	}
	//Tags are in the form of
	//OWNER_REPO_BRANCH_VERSION_BUILD_COMMIT
	//Since branch can include _ characters it must be parsed last.
	var owner = tag.substr( 0, tag.indexOf( "_" ) );
	var remainingTag = tag.substr( tag.indexOf( "_" ) + 1 );
	var repo = remainingTag.substr( 0, remainingTag.indexOf( "_" ) );
	remainingTag = remainingTag.substr( remainingTag.indexOf( "_" ) + 1 );
	//Now parse paramater from the end untill we get back to branch
	var commit = remainingTag.substr( remainingTag.lastIndexOf( "_" ) + 1 );
	remainingTag = remainingTag.substr( 0, remainingTag.lastIndexOf( "_" ) );
	var build = remainingTag.substr( remainingTag.lastIndexOf( "_" ) + 1 );
	remainingTag = remainingTag.substr( 0, remainingTag.lastIndexOf( "_" ) );
	var version = remainingTag.substr( remainingTag.lastIndexOf( "_" ) + 1 );
	remainingTag = remainingTag.substr( 0, remainingTag.lastIndexOf( "_" ) );
	//Now the branch must be whatever is left
	var branch = remainingTag;

	return {
		newImage: image,
		docker: {
			image: dockerImage,
			repo: dockerRepo,
			tag: tag
		},
		owner: owner,
		repository: repo,
		branch: branch,
		version: version,
		build: build,
		commit: commit
	};
}

function shouldUpgrade( service, newInfo ) {
	var info = service.buildInfo;
	if ( !checkInfo( info ) ) { //short circut the method so that if the tag is invaild to do not check compatbility or version to avoid errors due to invaild data
		return false;
	}
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
	shouldUpgrade: shouldUpgrade,
	checkInfo: checkInfo
};
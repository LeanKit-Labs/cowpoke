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
	//Tags are in the form of 
    //OWNER_REPO_BRANCH_VERSION_BUILD_COMMIT
    //Since branch can include _ characters it must be parsed last.
    var owner = tag.substr(0, tag.indexOf('_'));
    var remainingTag = tag.substr(tag.indexOf('_')+1);
    var repo = remainingTag.substr(0, remainingTag.indexOf('_'));
    remainingTag = remainingTag.substr(remainingTag.indexOf('_')+1);
    //now parse paramater from the end untill we get back to branch
    var commit = remainingTag.substr(remainingTag.lastIndexOf('_')+1);
    remainingTag = remainingTag.substr(0 , remainingTag.lastIndexOf('_'));
    var build = remainingTag.substr(remainingTag.lastIndexOf('_')+1);
    remainingTag = remainingTag.substr(0 , remainingTag.lastIndexOf('_'));
    var version = remainingTag.substr(remainingTag.lastIndexOf('_')+1);
    remainingTag = remainingTag.substr(0 , remainingTag.lastIndexOf('_'));
    //now the branch must be whatever is left
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
    //log("in shouldUpgrade in util.js");
	var info = service.buildInfo;
	var version = _.filter( [ info.version, info.build ] ).join( "-" );
	var newVersion = _.filter( [ newInfo.version, newInfo.build ] ).join( "-" );
    //log("in shouldUpgrade in util.js: current's owner = " + info.owner + " new images owner = " + newInfo.owner);
    //log("in shouldUpgrade in util.js: current's repository = " + info.repository + " new images repository = " + newInfo.repository);
    //log("in shouldUpgrade in util.js: current's branch = " + info.branch + " new images branch = " + newInfo.branch);
	var vailid = (info.owner !== "") && (info.repository !== "") && (info.branch !== "") && (info.version !== "") &&  (info.build !== "") &&  (info.commit !== "");
    
    var compatible = info.owner === newInfo.owner &&
					info.repository === newInfo.repository &&
					info.branch === newInfo.branch;
    //log("in shouldUpgrade in util.js: compatible = " + compatible);
    
	var isNewer = semver.gtr( newVersion, version );
    //log("shouldUpgrade in util.js: current = " + version + " compared with new = " + newVersion + " means that isNewer = " + isNewer);
    
    //log("in shouldUpgrade in util.js: shouldUpgrade = " + (compatible && isNewer));
    
    
	return vailid && compatible && isNewer;
}

module.exports = {
	getImageInfo: getImageInfo,
	shouldUpgrade: shouldUpgrade
};

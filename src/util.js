const _ = require( "lodash" );
const semver = require( "semver" );
const yaml = require( "js-yaml" );
const Promise = require( "bluebird" );

function getImageInfo( image ) {
	image = image.replace( /^docker[:]/g, "" );
	const imageParts = image.split( ":" );
	const main = imageParts[0];
	const tag = imageParts[1] || "";
	const dockerParts = main.split( "/" );
	let dockerImage, dockerRepo;
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
	const owner = tag.substr( 0, tag.indexOf( "_" ) );
	let remainingTag = tag.substr( tag.indexOf( "_" ) + 1 );
	const repo = remainingTag.substr( 0, remainingTag.indexOf( "_" ) );
	remainingTag = remainingTag.substr( remainingTag.indexOf( "_" ) + 1 );
	//Now parse paramater from the end untill we get back to branch
	const commit = remainingTag.substr( remainingTag.lastIndexOf( "_" ) + 1 );
	remainingTag = remainingTag.substr( 0, remainingTag.lastIndexOf( "_" ) );
	const build = remainingTag.substr( remainingTag.lastIndexOf( "_" ) + 1 );
	remainingTag = remainingTag.substr( 0, remainingTag.lastIndexOf( "_" ) );
	const version = remainingTag.substr( remainingTag.lastIndexOf( "_" ) + 1 );
	remainingTag = remainingTag.substr( 0, remainingTag.lastIndexOf( "_" ) );
	//Now the branch must be whatever is left
	const branch = remainingTag;

	if ( ( owner !== "" ) && ( repo !== "" ) && ( branch !== "" ) && ( version !== "" ) 
		&& ( build !== "" ) && ( commit !== "" ) && semver.valid( version ) ) {
		return {
			newImage: image,
			docker: {
				image: dockerImage,
				repo: dockerRepo,
				tag
			},
			owner,
			repository: repo,
			branch,
			version,
			build,
			commit
		};
	} else {
		return undefined;
	}
}

const shouldUpgradeStack = Promise.coroutine(function* ( stack, newInfo ) {
	let services = yield stack.listServices();
	for (var i = 0; i < services.length; i++) {
		if (shouldUpgrade(services[i], newInfo)) {
			return true;
		}
	}
	return false;
});

function isNewerOfSame( info, newInfo ) {
	const version = _.filter( [info.version, info.build] ).join( "-" );
	const newVersion = _.filter( [newInfo.version, newInfo.build] ).join( "-" );
	const compatible = info.owner === newInfo.owner &&
						info.repository === newInfo.repository &&
						info.branch === newInfo.branch;
	const isNewer = semver.gtr( newVersion, version );
	return compatible && isNewer;
}

function shouldUpgrade( service, newInfo ) {
	const info = service.buildInfo;
	if ( !info ) { //short circut the method so that if the tag is invaild to do not check compatbility or version to avoid errors due to invaild data
		return false;
	}
	return isNewerOfSame(info, newInfo);
	
}

module.exports = {
	getImageInfo,
	shouldUpgrade,
	shouldUpgradeStack
};

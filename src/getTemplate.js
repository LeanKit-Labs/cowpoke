
var _ = require( "lodash" );
var when = require( "when" );
var format = require( "util" ).format;
var util = require( "./util" );
var rp = require( "request-promise" );
var yaml = require( "js-yaml" );

function onRancherCompose( templateResult, rancherCompose ) {
	templateResult["rancher-compose.yml"] = rancherCompose;
	return templateResult;
}

function onDockerCompose( token, templateResult, response, dockerCompose ) {
	templateResult["docker-compose.yml"] = dockerCompose;
	for ( var i = 0; i < response.length; i++ ) {
		if ( response[i].name === "rancher-compose.yml" ) {
			return rp( response[i].download_url, {
				qs: {
					access_token: token
				},
				headers: {
					"User-Agent": "cowpoke"
				}
			} ).then( onRancherCompose.bind( null, templateResult ) );
		}
	}
}

function onTemplate( token, v, response ) {
	var templateResult = {
		version: v
	};
	var files = [];
	for ( var i = 0; i < response.length; i++ ) {
		if ( response[i].name === "docker-compose.yml" ) {
			return rp( response[i].download_url, {
				qs: {
					access_token: token
				},
				headers: {
					"User-Agent": "cowpoke"
				}
			} ).then( onDockerCompose.bind( null, token, templateResult, response ) );
		}
	}
}

module.exports = function getTemplate( token, catalogOwner, catalog, info ) {
	return rp( format( "https://api.github.com/repos/%s/%s/contents/templates/%s?ref=master", catalogOwner, catalog, info.branch ), {
		qs: {
			access_token: token
		},
		headers: {
			"User-Agent": "cowpoke"
		},
		json: true
	} ).then( function( response ) {
		return when.all( _.map( response, function( dir ) {
			if ( !isNaN( dir.name ) ) {
				return rp( dir._links.self, {
					qs: {
						access_token: token
					},
					headers: {
						"User-Agent": "cowpoke"
					},
					json: true
				} ).then( onTemplate.bind( null, token, dir.name ) );
			}
		} ) ).then( function( templates ) {
			return _.filter( templates, function( template ) {
				if ( !template ) {
					return false;
				}
				var dockerCompose = yaml.safeLoad( template["docker-compose.yml"] );
				return util.getImageInfo( dockerCompose[info.docker.image + "-app"].image ).newImage === info.newImage;
			} );
		} ).then( function name( resultsAsArray ) {
			return resultsAsArray[0];
		} );
	} );
};

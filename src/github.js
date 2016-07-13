//get the catalog templates
const versionsUri = "https://api.github.com/repos/%s/%s/contents/templates/%s?ref=master"
const util = require("util");
const isnum = val => /^\d+$/.test(val);
const rp = require("request-promise");
const promise = require("bluebird");

function get(url, token, json) {
	return rp("GET", url, {
		qs: {
			access_token: token // eslint-disable-line
		},
		headers: {
			"User-Agent": "buildEnv"
		},
		json
	});
}

const getTemplate  = promise.coroutine(function* (token, catalogOwner, catalog, templateName) {

	let response = yield get(util.format(versionsUri, catalogOwner, catalog, templateName), token, true);
	let maxTempate = undefined;
	for (let i = 0; i < response.length; i++) {
		if (isnum(response[i].name)) {
			let version =  parseInt(response[i].name);
			if (!maxTempate || version > parseInt(maxTempate.name)) {
				maxTempate = response[i];
			}
		}
	}
	response = yield get(maxTempate.url, token, true);

	const templateResult = {
		version: maxTempate.name
	};

	for (let i = 0; i < response.length; i++) {
		const file = response[i];
		const filecontents = yield get(file.download_url, token);
		templateResult[file.name] = filecontents;
	}

	return templateResult;

});

module.exports = getTemplate;

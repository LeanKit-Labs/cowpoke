## cowpoke

[![Build Status](https://travis-ci.org/LeanKit-Labs/cowpoke.svg?branch=master)](https://travis-ci.org/LeanKit-Labs/cowpoke)

A service to handle configurable rancher stack upgrade patterns. Each service you wish to upgrade must have its own catalog with each code branch having its own entry in said catalog. The branch names and the catalog entry names must match. When an upgrade request is sent to cowpoke it will scan all of the environments in rancher it has credentials for and upgrade any stack created from and older version of the same catalog entry: which should be an older version of the same code.


>While not required to run cowpoke, a slack integration is highly recommended as the request response only informs you what upgrades were started, and any information after that comes afterwards and only be provided by slack: notably what upgrades were actually finished. We hope some time to add support to other messaging clients, and if you have one you would like to add support for, we would be thrilled to see a PR come in for this. Thank you!

## Configuration

### JSON
Defaults shown below. Null values mean no default provided.
```json
{
	"host": {
		"port": 8800
	},

	"slack": {
		"token": null,
		"channels": null
	},
	"api": {
		"key": null
	},
	"rancher": {
		"user": {
			"key": null,
			"secret": null
		},
		"url": null
	}
}
```

### Environment Variables
Defaults shown.

 * `HOST_PORT`=8800
 * `SLACK_TOKEN`=""
 * `RANCHER_USER_KEY`=""
 * `RANCHER_USER_SECRET`=""
 * `RANCHER_URL`=""
 * `SLACK_CHANNELS`=""
 * 'API_KEY'=""

If API_KEY is defined all requests to cowpoke will use this for authentication and reject any requests without a bearer header that matches the given value.
If SLACK_TOKEN is defined, it will send slack messages with this token, and SLACK\_CHANNELS is a comma delimited string of slack channel names to notify upon builds.
The RANCHER_USER variables are for specifying the key and secret of the rancher account token it will use to authentication with the rancher.
RANCHER_URL is what stores the base URL representation for your rancher instance like: https://myrancher.example.io


## Concepts
Cowpoke is designed to handle stack upgrade patterns for Rancher. Externalizing this allows the implementation behavior to evolve independently from Drone build files - something we feel is key given the number of services we have. It also allows us to externalize things like Rancher credentials as well as managing upgrades that may span multiple Rancher environments.

## API
API used [`hyped`](https://github.com/LeanKit-Labs/hyped). Optionally you can consume the API as `application/hal+json` via a lib like [`halon`](https://github.com/LeanKit-Labs/halon) or as `application/json` and skip out on all the hypermedia stuff.

### Upgrade

#### `PATCH /api/stack/`

__Request__
```json
{
	"catalog": "my-github-org/my-github-catalog-repo",
	"rancherCatalogName": "name of the catalog in rancher",
	"branch": "the name of the branch to be deployed",
	"catalogVersion" : "the catalog version number to use",
	"githubToken" : "the access token to use when getting the catalog info"
}
```

__Response__
```json
{
	"upgraded_stacks_by_environment": [
        {
            "environment": "environment name",
            "upgraded": [
                {
                    "name": "stack name",
                    "id": "stack id"
                }
            ]
        }
    ]
}
```

## Installation & Use
Simplest way to use this is using the Docker image: `leankit/cowpoke`.

__With NEDB__

```bash
docker pull leankit/cowpoke:latest
docker run --name cowpoke -d --restart=always \
	-v /path/on/host:/app/src/data \
	-p 80:8800 \
	leankit/cowpoke:latest
```

## Building
To build locally, just run `npm install`. You can generate your own Docker image for this service by running `Docker build -t you/cowpoke .`.

## cowpoke

> Note: this is alphaware and subject to lots of changes

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
	"nedb": {
		"path": "./data"
	},
	"slack": {
		"token": null
	},
	"api": {
		"key": null
	}
}
```

### Environment Variables
Defaults shown.

 * `HOST_PORT`=8800
 * `NEDB_PATH`="./data"
 * `SLACK_TOKEN`=""
 * 'API_KEY'=""

>If API_KEY is defined all requests to cowpoke will use this for authentication and reject any requests without a bearer header that matches the given value.

## Concepts
Cowpoke is designed to handle stack upgrade patterns for Rancher. Externalizing this allows the implementation behavior to evolve independently from Drone build files - something we feel is key given the number of services we have. It also allows us to externalize things like Rancher credentials as well as managing upgrades that may span multiple Rancher environments.

### Managing environments
In order for cowpoke to do anything, you have to tell it about your Rancher set up. This starts by defining environments by name and the API key and secret required to interact with them. Environments are defined with the following JSON structure:

```json
{
	"name": "My Environment",
	"baseUrl": "https://rancher.mydomain.com",
	"key": "blahblahlblahblah",
	"secret": "sssshhhhhh",
	"slackChannels": []
}
```

> Note: `slackChannels` is an optional array of strings specifying which channels should receiving notifications when a service in the environment is being upgraded. It is again strongly recommended that you should run cowpoke with a slack integration

## API
API used [`hyped`](https://github.com/LeanKit-Labs/hyped). Optionally you can consume the API as `application/hal+json` via a lib like [`halon`](https://github.com/LeanKit-Labs/halon) or as `application/json` and skip out on all the hypermedia stuff.

### List Environments

#### `GET /api/environment`

__Response__
```json
{
	"environments": [
		{
			"name": "",
			"baseUrl": "https://rancher.mydomain.com",
			"key": "blahblahlblahblah",
			"slackChannels": []
		}
	]
}
```

### Get Environment

#### `GET /api/environment/{name}`

__Response__
```json
{
	"name": "",
	"baseUrl": "https://rancher.mydomain.com",
	"key": "blahblahlblahblah",
	"slackChannels": []
}
```

### Update Environment

#### `PATCH /api/environment/{name}`

__Request__
```json
[
	{
		"op": "add",
		"field": "slackChannels",
		"value": "new-slack-channel-name"
	},
	{
		"op": "remove",
		"field": "slackChannels",
		"value": "old-slack-channel-name"
	}
]
```

__Response__
```json
{
	"name": "",
	"baseUrl": "https://rancher.mydomain.com",
	"key": "blahblahlblahblah",
	"slackChannels": []
}
```

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

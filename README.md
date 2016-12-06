## cowpoke

[![Build Status](https://travis-ci.org/LeanKit-Labs/cowpoke.svg?branch=master)](https://travis-ci.org/LeanKit-Labs/cowpoke)

Cowpoke is designed to handle stack upgrade patterns for Rancher. Externalizing this allows the implementation behavior to evolve independently from Drone build files - something we feel is key given the number of services we have. It also allows us to externalize things like Rancher credentials as well as managing upgrades that may span multiple Rancher environments.

## Configuration

The following table lists environment variables for the service

| Name  | Required?  | Notes
|---|---|---|---|---|
| HOST_PORT | YES | HTTP port the server listens on |
| RANCHER_USER_KEY  | YES | The account api key the service uses to preform upgrades |
| RANCHER_USER_SECRET | YES | The account api secret the service uses to preform upgrades |
| RANCHER_URL | YES | The URL to the Rancher server (http://someUrl:8080) |
| API_KEY| NO | Used to authenticate calls to the service. If this value is set, callers should supply the token via an HTTP Bearer header |
| SLACK_TOKEN | NO | Authentication token for optional slack notifications |
| SLACK_CHANNELS | NO | Comma delimited list of slack channels |

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

## Running the service

### Local

- ```npm install```
- ```node src/index.js```
- Add a __.env__ file to the project root and run the service with ```NODE_ENV=development```

Example .env file

```
HOST_PORT=9000
RANCHER_USER_KEY="some key"
RANCHER_USER_SECRET="some secret"
RANCHER_URL=http://localhost:8080
API_KEY=abc123
SLACK_TOKEN="some slack token"
SLACK_CHANNELS="channel1,channel2,channel3"
```

### Docker

There is a Dockerfile included as well that can be built and run

- ```docker pull leankit/cowpoke```
- ```docker run --name cowpoke --env-file "path to .env file" -d leankit/cowpoke```

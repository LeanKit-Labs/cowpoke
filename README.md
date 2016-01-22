## cowpoke

> Note: this is a proof of concept. A more sophisticated version may follow if this works as intended.

A service to handle configurable rancher service upgrade patterns.

## Configuration

> Note: database configuration sections/variables are mutually exclusive. Pick one and provide the values for it or roll with the defaults. NEDB is the default data adapter, Postgres will only be used if a host value is specified.

### JSON
Defaults shown below. Empty values mean no default provided.
```json
{
	"host": {
		"port": 8800
	},
	"nedb": {
		"path": "./data"
	}
}
```

### Environment Variables
Defaults shown.

 * `HOST_PORT`=8800
 * `NEDB_PATH`="./data"

## Concepts
Cowpoke is designed to handle service upgrade patterns for Rancher. Externalizing this allows the implementation behavior to evolve independently from Drone build files - something we feel is key given the number of services we have. It also allows us to externalize things like Rancher credentials as well as managing upgrades that may span multiple Rancher environments and stack definitions.

### Managing environments
In order for cowpoke to do anything, you have to tell it about your Rancher set up. This starts by defining environments by name and the API key and secret required to interact with them. Environments are defined with the following JSON structure:

```json
{
	"name": "My Environment",
	"baseUrl": "https://rancher.mydomain.com",
	"key": "blahblahlblahblah",
	"secret": "sssshhhhhh"
}
```

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
	  "key": "blahblahlblahblah"
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
  "key": "blahblahlblahblah"
}
```

### New Image

#### `PUT /api/environment/:image`

__Response__
```json
{
  "upgradedServices": [
    {
      "id": "1s31",
      "name": "serviceName",
      "environmentId": "1a5",
      "environmentName": "Default",
      "stackId": "1e3",
      "stackName": "",
      "description": null,
      "state": "upgrading",
      "launchConfig": {
        "kind": "container",
        "networkMode": "managed",
        "privileged": false,
        "publishAllPorts": false,
        "readOnly": false,
        "startOnCreate": true,
        "stdinOpen": true,
        "tty": true,
        "vcpu": 1,
        "imageUuid": "docker:arob/demo-2:arobson_demo-2_master_0.1.0_2_abcdef",
        "labels": {
          "io.rancher.container.pull_image": "always"
        },
        "ports": [
          "4001:8800/tcp"
        ],
        "dataVolumes": [],
        "dataVolumesFrom": [],
        "dataVolumesFromLaunchConfigs": [],
        "dns": [],
        "dnsSearch": [],
        "capAdd": [],
        "capDrop": [],
        "devices": [],
        "count": null,
        "cpuSet": null,
        "cpuShares": null,
        "description": null,
        "domainName": null,
        "hostname": null,
        "memory": null,
        "memoryMb": null,
        "memorySwap": null,
        "pidMode": null,
        "user": null,
        "userdata": null,
        "volumeDriver": null,
        "workingDir": null,
        "networkLaunchConfig": null,
        "version": "0e1836af-97db-4575-b634-b93a7dcd4f1f"
      },
      "droneImage": "arob/demo-2:arobson_demo-2_master_0.1.0_2_abcdef",
      "buildInfo": {
        "newImage": "arob/demo-2:arobson_demo-2_master_0.1.0_2_abcdef",
        "docker": {
          "image": "demo-2",
          "repo": "arob",
          "tag": "arobson_demo-2_master_0.1.0_2_abcdef"
        },
        "owner": "arobson",
        "repository": "demo-2",
        "branch": "master",
        "version": "0.1.0",
        "build": "2",
        "commit": "abcdef"
      }
    }
  ]
}
```

## Installation & Use
Simplest way to use this is using the Docker image: `arob/cowpoke`.

__With NEDB__
> Note: example is silly on purpose.

```bash
docker pull arob/cowpoke:latest
docker run --name cowpoke -d --restart=always \
	-v /path/on/host:/app/src/data \
	arob/cowpoke:latest
```

## Building
To build locally, just run `npm install`. You can generate your own Docker image for this service by running `Docker build -t you/cowpoke .`.

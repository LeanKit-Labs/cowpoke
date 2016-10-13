#!/bin/bash
# builds an tagged image and pushes it to docker hub
set -e

VERSION=$(node -e "console.log(require('./package.json').version);")
#a docker container should only be pushed if travis is not building a pull request,
#the branch is master, it has been tagged, and the tag matches the semver.
#the avoids an issue where code is merged into master without an updated semver,
#which would cause the image of the previous version to be overwritten with new code
if [ "$TRAVIS" = "false" ] || [ "$TRAVIS_PULL_REQUEST" != "false" ] || [ "$TRAVIS_BRANCH" != "master" ] || [ "$TRAVIS_TAG" != "$VERSION" ]; then
    echo "skipping deployment"
    exit 0
fi

IMAGE=$(./scripts/docker-image.sh)

if [ -z "$IMAGE" ]; then
    echo "image string could not be created"
    exit 0
fi

echo "building image ${IMAGE}"

docker build --rm=true -t "$IMAGE" .

#if not running under TRAVIS then we expect a user to already be logged in
#this is to enable manualy deployments if needed
if [ "$TRAVIS" = "true" ]; then
    docker login -u "$DOCKER_USER" -p "$DOCKER_PASS"
fi

echo "pushing image to docker hub"
docker push "$IMAGE"

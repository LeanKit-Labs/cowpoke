#!/bin/bash
# builds an tagged image and pushes it to docker hub
set -e

if [ "$TRAVIS" = "true" ] && [ "$TRAVIS_PULL_REQUEST" != "false" ] && [ "$TRAVIS_BRANCH" != "master" ]; then
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

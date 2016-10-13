#!/bin/bash
# builds an tagged image and pushes it to docker hub
set -e

VERSION=$(node -e "console.log(require('./package.json').version);")
echo "app version: ${VERSION}"
echo "travis tag: ${TRAVIS_TAG}"
echo "travis branch: ${TRAVIS_BRANCH}"

#an image should only be push to docker hub under the following conditions:
# 1) the code is being built under Travis
# 2) a PR isn't being built
# 3) the code is being built as a tag and it matches the version of the project
#
# #3 is achieved by using the tag-release utility
# this prevents situations where an accidental merge can overwrite existing docker images with new code
if [ "$TRAVIS" = "false" ] || [ "$TRAVIS_PULL_REQUEST" != "false" ] || [ "$TRAVIS_TAG" != "v${VERSION}" ]; then
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

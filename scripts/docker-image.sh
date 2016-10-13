#!/bin/bash
#creates a docker image string for use in `docker build`
#ex: leankit/cowpoke:[a-tag]
set -e
DOCKER_IMAGE=
DOCKER_TAG=
BUILD_NUMBER=
DOCKER_REPO="leankit/cowpoke"
GIT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"

#override build and branch info from TRAVIS CI if applicable
if [ "$TRAVIS" = "true" ]; then
    if [ "$TRAVIS_PULL_REQUEST" != "false" ]; then
        echo $DOCKER_IMAGE
        exit 0
    fi

    GIT_BRANCH="$TRAVIS_BRANCH"
    BUILD_NUMBER="$TRAVIS_BUILD_NUMBER"
fi

GIT_SHORT_COMMIT="$(git rev-parse --short HEAD)"
APP_VERSION=$(node -e "console.log(require('./package.json').version);")

#create release tag or testing tag based off the current branch
if [ "$GIT_BRANCH" = "master" ]; then
    DOCKER_TAG="v${APP_VERSION}"
else
    DOCKER_TAG="${GIT_BRANCH}_${APP_VERSION}"
    if [ -n "$BUILD_NUMBER" ]; then
        DOCKER_TAG="${DOCKER_TAG}_${BUILD_NUMBER}_${GIT_SHORT_COMMIT}"
    else
        DOCKER_TAG="${DOCKER_TAG}_${GIT_SHORT_COMMIT}"
    fi
fi

DOCKER_IMAGE="${DOCKER_REPO}:${DOCKER_TAG}"
echo $DOCKER_IMAGE

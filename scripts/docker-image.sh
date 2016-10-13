#!/bin/bash
#creates a docker image string for use in `docker build`
#ex: leankit/cowpoke:[a-tag]
set -e
DOCKER_IMAGE=
DOCKER_TAG=
BUILD_NUMBER=
DOCKER_REPO="leankit/cowpoke"
GIT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
APP_VERSION=$(node -e "console.log(require('./package.json').version);")
GIT_SHORT_COMMIT="$(git rev-parse --short HEAD)"

#override build and branch info from TRAVIS CI if applicable
if [ "$TRAVIS" = "true" ]; then
    if [ "$TRAVIS_PULL_REQUEST" != "false" ]; then
        echo $DOCKER_IMAGE
        exit 0
    fi

    #Special Case:
    # if Travis is building a release tag, just use the tag and exit early
    if [ "$TRAVIS_BRANCH" = "v${APP_VERSION}" ] && [ "$TRAVIS_TAG" = "v${APP_VERSION}" ]; then
        DOCKER_IMAGE="${DOCKER_REPO}:${TRAVIS_TAG}"
        echo $DOCKER_IMAGE
        exit 0
    fi

    GIT_BRANCH="$TRAVIS_BRANCH"
    BUILD_NUMBER="$TRAVIS_BUILD_NUMBER"
fi

#construct a tag for local or non release travis builds
#useful for pushing images manually (testing, etc)
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

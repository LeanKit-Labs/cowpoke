FROM mhart/alpine-node:6
MAINTAINER LeanKit Tools & Automation <pd-atat@leankit.com>

RUN apk add --update bash

ADD . /app
ENV NODE_ENV=production

WORKDIR /app
# If you have native dependencies, you'll need extra tools

VOLUME [ "/app/data" ]
CMD [ "node", "./src/index.js" ]

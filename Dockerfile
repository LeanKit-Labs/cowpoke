FROM mhart/alpine-node:6
MAINTAINER Alex Robson <asrobson@gmail.com>

RUN apk add --update bash

ADD . /app
ENV NODE_ENV=production

WORKDIR /app
RUN npm install
# If you have native dependencies, you'll need extra tools

VOLUME [ "/app/data" ]
CMD [ "node", "./src/index.js" ]

FROM mhart/alpine-node:5
MAINTAINER Alex Robson <asrobson@gmail.com>

WORKDIR /src
ADD . .
ENV NODE_ENV=production

# If you have native dependencies, you'll need extra tools
RUN apk add --update make gcc g++ python git bash
RUN rm -rf ./node_modules
RUN npm install
RUN apk del make gcc g++ python && \
	rm -rf /tmp/* /var/cache/apk/* /root/.npm /root/.node-gyp

VOLUME [ "/app/src/data" ]
CMD [ "node", "./src/index.js" ]
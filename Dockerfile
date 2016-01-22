FROM nodesource/jessie:5.2
MAINTAINER Alex Robson <asrobson@gmail.com>

ENV DEBIAN_FRONTEND noninteractive

ADD ./ /app/
WORKDIR /app
VOLUME [ "/app/src/data" ]
CMD [ "node", "/app/src/index.js" ]
FROM node:carbon-alpine

RUN mkdir -p /speedtest
WORKDIR /speedtest
COPY ./package-lock.json ./package-lock.json
COPY ./package.json ./package.json
RUN npm install --only=prod
COPY ./index.js ./index.js

CMD ["node", "index.js"]

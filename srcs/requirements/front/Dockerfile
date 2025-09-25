FROM node:lts-slim

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

RUN npm install fastify-cli --global

WORKDIR /app

COPY ./data .

RUN npm install

CMD [ "npm", "run", "start" ]
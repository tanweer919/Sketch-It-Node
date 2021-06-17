FROM node:alpine
WORKDIR /src
COPY package*.json ./
COPY tsconfig*.json ./
COPY . .
RUN npm install
RUN npm install -g nodemon
RUN npm install -g ts-node
RUN npm run tsc
COPY ./dist .
EXPOSE 8080

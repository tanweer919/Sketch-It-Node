FROM node:alpine
WORKDIR /usr/src/app
COPY package*.json ./
COPY tsconfig*.json ./
COPY . .
RUN npm install
RUN npm install -g nodemon
RUN npm run tsc
COPY ./dist .
EXPOSE 3000

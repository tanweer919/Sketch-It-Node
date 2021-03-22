FROM node:alpine
WORKDIR /usr/src/app
COPY package*.json ./
COPY tsconfig*.json ./
COPY . .
RUN npm install
RUN npm install -g nodemon
RUN npm install -g ts-node
RUN npm run tsc
COPY ./dist .
EXPOSE 8080
CMD [ "nodemon", "--inspect", "-L" ]

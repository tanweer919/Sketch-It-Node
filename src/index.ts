import express from "express";
import mongoose from "mongoose";
import setupSocket from "./controllers/socket";
const bodyParser = require("body-parser");
import router from "./routes/routes";
import redis from "redis";
import Server, {Socket} from "socket.io";
import { connectMongoDB, connectRedis, setupRedis } from "./controllers/db";
const app = express();
const server = app.listen(3000, () => {
  console.log("Server started");
});
const io = new Server(server, {
  origins: "*:*",
});

connectMongoDB();
const redisClient = connectRedis();
const { setAsync, getAsync } = setupRedis(redisClient);
app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
setupSocket(io, { setAsync, getAsync });

//Routes
app.use("/api", router);

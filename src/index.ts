import express from "express";
import mongoose from "mongoose";
import setupSocket from "./controllers/socket";
const bodyParser = require("body-parser");
import router from "./routes/routes";
const app = express();
const server = app.listen(3000, () => {
  console.log("Server started");
});
const io = require("socket.io")(server, {
  cors: {
    origin: "*:*",
    methods: ["GET", "POST"],
  },
});
mongoose.Promise = global.Promise;
mongoose.connect("mongodb://mongo:27017/sketch_it", { useNewUrlParser: true });

app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
setupSocket(io);

//Routes
app.use("/api", router);

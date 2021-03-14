"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const socket_1 = __importDefault(require("./controllers/socket"));
const bodyParser = require("body-parser");
const routes_1 = __importDefault(require("./routes/routes"));
const socket_io_1 = __importDefault(require("socket.io"));
const db_1 = require("./controllers/db");
const app = express_1.default();
const server = app.listen(3000, () => {
    console.log("Server started");
});
const io = new socket_io_1.default(server, {
    origins: "*:*",
});
db_1.connectMongoDB();
const redisClient = db_1.connectRedis();
const { setAsync, getAsync } = db_1.setupRedis(redisClient);
app.use(express_1.default.static(__dirname + "/public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
socket_1.default(io, { setAsync, getAsync });
//Routes
app.use("/api", routes_1.default);
//# sourceMappingURL=index.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = express_1.default();
const server = require("http").Server(app);
const io = require("socket.io")(server);
app.use(express_1.default.static(__dirname + "/public"));
io.on("connection", (socket) => {
    console.log("connected");
    socket.on("message", (msg) => {
        console.log(`New message: ${msg}`);
    });
});

app.get("/", (req, res) => {
    console.log("served");
    res.render("index.html");
});
server.listen(3000, () => {
    console.log("Server started");
});
//# sourceMappingURL=index.js.map
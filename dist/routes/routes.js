"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const room_1 = __importDefault(require("../models/room"));
const User_1 = __importDefault(require("../models/User"));
const router = express_1.default.Router();
router.post("/user/create/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield User_1.default.findOne({ username: req.body.username });
        console.log("registering");
        if (user) {
            return res.status(400).send({ status: "Username is already taken" });
        }
        else {
            const user = new User_1.default();
            user.username = req.body.username;
            yield user.save();
            return res.status(201).send({ status: "success" });
        }
    }
    catch (e) {
        return res
            .status(400)
            .send({ status: "Faced some problem generating username" });
    }
}));
router.post("/user/check", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield User_1.default.findOne({ username: req.body.username });
        if (user) {
            return res.status(200).send({ available: false, status: "" });
        }
        else {
            return res.status(200).send({ available: true, status: "" });
        }
    }
    catch (e) {
        return res
            .status(400)
            .send({ status: "Faced some problem generating username" });
    }
}));
router.post("/room/check/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const room = yield room_1.default.findOne({ roomId: req.body.roomId, active: 1 });
        if (room) {
            if (room.currentPlayers <= room.maxPlayers) {
                return res.status(200).send({ status: "success" });
            }
            else {
                return res.status(400).send({ status: "Room is full" });
            }
        }
        else {
            return res
                .status(400)
                .send({ status: "No active room is found with given Room ID" });
        }
    }
    catch (e) {
        console.log(e);
        return res
            .status(400)
            .send({ status: "Faced some problem while joining room" });
    }
}));
exports.default = router;
//# sourceMappingURL=routes.js.map
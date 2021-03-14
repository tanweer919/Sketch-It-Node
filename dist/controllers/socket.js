"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const room_1 = __importDefault(require("../models/room"));
const User_1 = __importDefault(require("../models/User"));
const interface_1 = require("../interfaces/interface");
const consts = __importStar(require("../constants/socketEvents"));
const redisKeys = __importStar(require("../constants/redisKeys"));
const words_1 = require("../data/words");
const lodash_1 = __importDefault(require("lodash"));
const setupSocket = (io, { setAsync, getAsync }) => {
    var users = {};
    io.on(consts.ON_CONNECTION, (socket) => {
        //Handle New Client Connected
        socket.on(consts.CONNECTED, (data) => {
            onConnectedHandler(socket, data);
        });
        //Handle Create Room
        socket.on(consts.CREATE_ROOM, (data) => __awaiter(void 0, void 0, void 0, function* () {
            yield createRoomHandler(socket, data);
        }));
        //Handle Join Room
        socket.on(consts.JOIN_ROOM, (data) => __awaiter(void 0, void 0, void 0, function* () {
            yield joinRoomHandler(socket, data);
        }));
        //Handle Leave a Room
        socket.on(consts.LEAVE_ROOM, (data) => __awaiter(void 0, void 0, void 0, function* () {
            yield leaveRoomHandler(socket, data);
        }));
        //Handle Close Room
        socket.on(consts.CLOSE_ROOM, (data) => __awaiter(void 0, void 0, void 0, function* () {
            yield closeRoomHandler(socket, data);
        }));
        //Handle Point Drawing
        socket.on(consts.DRAWING, (data) => {
            onDrawHandler(socket, data);
        });
        // Handle Clear Drawing
        socket.on(consts.CLEAR_DRAWING, (data) => {
            clearDrawingHandler(socket, data);
        });
        //Handle New Messages
        socket.on(consts.NEW_MESSAGE, (data) => __awaiter(void 0, void 0, void 0, function* () {
            yield newMessageHandler(socket, data);
        }));
        socket.on(consts.NEXT_TURN, (data) => __awaiter(void 0, void 0, void 0, function* () {
            yield nextTurnHandler(socket, data);
        }));
        socket.on(consts.WORD_SELECTED, (data) => {
            wordSelectedHandler(socket, data);
        });
        socket.on(consts.TURN_ENDED, (data) => __awaiter(void 0, void 0, void 0, function* () {
            yield turnEndHandler(socket, data);
        }));
        socket.on(consts.START_GAME, (data) => __awaiter(void 0, void 0, void 0, function* () {
            yield startGameHandler(socket, data);
        }));
        socket.on(consts.DISCONNECTING, () => __awaiter(void 0, void 0, void 0, function* () {
            yield onDisconnectingHandler(socket);
        }));
        //Handle client disconnect
        socket.on(consts.DISCONNECT, () => {
            disconnectHandler(socket);
        });
    });
    const onConnectedHandler = (socket, data) => __awaiter(void 0, void 0, void 0, function* () {
        console.log("connected", socket.id);
        users[socket.id] = data["username"];
        console.log(users);
    });
    const createRoomHandler = (socket, roomData) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const newRoom = new room_1.default();
            const adminUsername = roomData.admin;
            const admin = yield User_1.default.findOne({ username: adminUsername });
            if (admin) {
                newRoom.admin = admin;
                newRoom.players.push(admin);
            }
            //Generate random 9 digits number
            const roomId = `${Math.floor(100000000 + Math.random() * 900000000)}`;
            newRoom.name = roomData.roomName;
            newRoom.roomId = roomId;
            newRoom.maxPlayers = +roomData.maxPlayers;
            newRoom.gameMode = +roomData.gameMode;
            newRoom.currentPlayers = 1;
            newRoom.active = 1;
            yield newRoom.save();
            let easyWordList = words_1.words.filter((word) => word.level === 0);
            let mediumWordList = words_1.words.filter((word) => word.level === 1);
            let hardWordList = words_1.words.filter((word) => word.level === 2);
            const shuffledEasyWords = lodash_1.default.shuffle(easyWordList);
            const shuffledMediumWords = lodash_1.default.shuffle(mediumWordList);
            const shuffledHardWords = lodash_1.default.shuffle(hardWordList);
            //Set random words of each type at the start of the game
            yield setAsync(redisKeys.easyWords(roomId), JSON.stringify(shuffledEasyWords));
            yield setAsync(redisKeys.mediumWords(roomId), JSON.stringify(shuffledMediumWords));
            yield setAsync(redisKeys.hardWords(roomId), JSON.stringify(shuffledHardWords));
            //Set owner as the first player of the room
            yield setAsync(redisKeys.players(roomId), JSON.stringify(newRoom.players));
            //Set owner of the room as the first sketcher
            yield setAsync(redisKeys.sketcher(roomId), JSON.stringify(admin));
            //Set messages as empty
            yield setAsync(redisKeys.messages(roomId), JSON.stringify([]));
            //Set game as not started
            yield setAsync(redisKeys.gameStatus(roomId), JSON.stringify(interface_1.gameStatus.NotStarted));
            const status = "Waiting for other players to join...";
            yield setAsync(redisKeys.status(roomId), status);
            socket.join(roomId);
            io.to(socket.id).emit(consts.ROOM_CREATED, {
                success: true,
                roomId: roomId,
                admin: adminUsername,
                initialRoomData: {
                    players: newRoom.players,
                    sketcher: admin,
                    messages: [],
                    admin,
                    status,
                    gameStatus: interface_1.gameStatus.NotStarted,
                },
            });
        }
        catch (e) {
            console.log(e);
            io.to(socket.id).emit(consts.ROOM_CREATED, {
                success: false,
                roomId: null,
            });
        }
    });
    const joinRoomHandler = (socket, data) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const roomId = data["roomId"];
            const username = data["username"];
            const source = data["source"];
            const room = yield room_1.default.findOne({ roomId: roomId }).populate("players");
            if (room.currentPlayers <= room.maxPlayers) {
                //If there is still space for player
                const user = yield User_1.default.findOne({ username: username });
                room.currentPlayers += 1;
                //Add this user to the room in the database
                room.players.push(user);
                yield room.save();
                const players = room.players;
                //Retrieve all previous messages
                let previousMessages = yield getAsync(redisKeys.messages(roomId));
                previousMessages = JSON.parse(previousMessages);
                //Retrieve current sketcher
                let currentSketcher = yield getAsync(redisKeys.sketcher(roomId));
                currentSketcher = JSON.parse(currentSketcher);
                //Save in cache
                yield setAsync(redisKeys.players(roomId), JSON.stringify(players));
                const gameStatus = JSON.parse(yield getAsync(redisKeys.gameStatus(roomId)));
                let status;
                if (room.currentPlayers === 2) {
                    status = "Waiting for admin to start the game...";
                    yield setAsync(redisKeys.status(roomId), status);
                    socket.to(roomId).emit(consts.NEW_STATUS, { status });
                }
                status = yield getAsync(redisKeys.status(roomId));
                socket.join(roomId);
                io.to(socket.id).emit(consts.JOINED_ROOM, {
                    roomId,
                    source,
                    initialRoomData: {
                        players: room.players,
                        sketcher: currentSketcher,
                        messages: previousMessages,
                        admin: room.admin,
                        status,
                        gameStatus,
                    },
                });
                socket.to(roomId).emit(consts.NEW_PLAYER, username);
            }
        }
        catch (e) {
            console.log(e);
        }
    });
    const leaveRoomHandler = (socket, data) => __awaiter(void 0, void 0, void 0, function* () {
        const roomId = data["roomId"];
        const username = data["username"];
        socket.leave(roomId);
        socket.to(roomId).emit(consts.LEFT_ROOM, { roomId, username });
        try {
            const player = yield User_1.default.findOne({ username: username });
            const updatedroom = yield room_1.default.findOneAndUpdate({ roomId: roomId }, {
                $inc: { currentPlayers: -1 },
                $pull: { players: player._id },
            }, { new: true });
            console.log(JSON.stringify(updatedroom));
            const updatedPlayers = updatedroom.players;
            setAsync(redisKeys.players(roomId), JSON.stringify(updatedPlayers));
        }
        catch (e) {
            console.log(e);
        }
    });
    const closeRoomHandler = (socket, data) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const roomId = data["roomId"];
            const room = yield room_1.default.findOne({ roomId: roomId });
            room.active = 0;
            yield room.save();
        }
        catch (e) {
            console.log(e);
        }
    });
    const onDrawHandler = (socket, data) => {
        const roomId = data["roomId"];
        const newPoint = data["point"];
        socket.to(roomId).emit(consts.DRAWING, newPoint);
    };
    const clearDrawingHandler = (socket, data) => {
        const roomId = data["roomId"];
        socket.to(roomId).emit(consts.CLEAR_DRAWING);
    };
    const newMessageHandler = (socket, data) => __awaiter(void 0, void 0, void 0, function* () {
        const roomId = data["roomId"];
        const message = data["message"];
        let messages = yield getAsync(redisKeys.messages(roomId));
        messages = JSON.parse(messages);
        messages.push(message);
        yield setAsync(redisKeys.messages(roomId), JSON.stringify(messages));
        //Send to all clients in "gameId" room except sender
        socket.to(roomId).emit(consts.NEW_MESSAGE, message);
    });
    const nextTurnHandler = (socket, data) => __awaiter(void 0, void 0, void 0, function* () {
        const roomId = data["roomId"];
        const username = data["username"];
        const round = JSON.parse(yield getAsync(redisKeys.round(roomId)));
        const turn = JSON.parse(yield getAsync(redisKeys.turn(roomId)));
        let shuffledWords;
        //At each turn send three random words whose difficulty depends on the round no
        if (round === 0) {
            shuffledWords = JSON.parse(yield getAsync(redisKeys.easyWords(roomId)));
        }
        else if (round === 1) {
            shuffledWords = JSON.parse(yield getAsync(redisKeys.mediumWords(roomId)));
        }
        else {
            shuffledWords = JSON.parse(yield getAsync(redisKeys.hardWords(roomId)));
        }
        //Select next three words from shuffled words
        const wordChoices = shuffledWords.slice(turn * 3, 3 * (turn + 1));
        io.to(socket.id).emit(consts.YOUR_TURN, wordChoices);
        const status = `${username} is selecting a word to draw...`;
        yield setAsync(redisKeys.status(roomId), status);
        socket.to(roomId).emit(consts.NEW_STATUS, { status });
        const timer = setTimeout(() => {
        }, 20000);
        clearTimeout(timer);
    });
    const wordSelectedHandler = (socket, data) => {
        const roomId = data["roomId"];
        const selectedWord = data["selectedWord"];
        socket.to(roomId).emit(consts.WORD_SELECTED, selectedWord);
    };
    const turnEndHandler = (socket, data) => __awaiter(void 0, void 0, void 0, function* () {
        const roomId = data["roomId"];
        const turn = +data["turn"];
        const players = JSON.parse(yield getAsync(redisKeys.players(roomId)));
        const nextSketcher = players[turn];
        yield setAsync(`sketcher:${roomId}`, JSON.stringify(nextSketcher));
        socket.to(roomId).emit(consts.NEXT_TURN);
    });
    const startGameHandler = (socket, data) => __awaiter(void 0, void 0, void 0, function* () {
        const roomId = data["roomId"];
        const username = data["username"];
        try {
            const room = yield room_1.default.findOne({ roomId: roomId }).populate("admin");
            if (room) {
                console.log(`${room.admin.username} ${username}`);
                if (room.admin.username === username) {
                    yield setAsync(redisKeys.round(roomId), JSON.stringify(0));
                    yield setAsync(redisKeys.turn(roomId), JSON.stringify(0));
                    yield setAsync(redisKeys.gameStatus(roomId), JSON.stringify(interface_1.gameStatus.Started));
                    io.in(roomId).emit(consts.GAME_STARTED);
                    yield nextTurnHandler(socket, { roomId: roomId, username: username });
                }
            }
        }
        catch (e) {
            console.log(e);
        }
    });
    const onDisconnectingHandler = (socket) => __awaiter(void 0, void 0, void 0, function* () {
        const rooms = Object.keys(socket.rooms);
        const username = users[socket.id];
        try {
            const player = yield User_1.default.findOne({ username: username });
            rooms.forEach((roomId) => __awaiter(void 0, void 0, void 0, function* () {
                if (roomId === socket.id)
                    return;
                io.to(roomId).emit(consts.LEFT_ROOM, { username, roomId });
                try {
                    const updatedroom = yield room_1.default.findOneAndUpdate({ roomId: roomId }, {
                        $inc: { currentPlayers: -1 },
                        $pull: { players: player._id },
                    }, { new: true });
                    const updatedPlayers = updatedroom.players;
                    setAsync(redisKeys.players(roomId), JSON.stringify(updatedPlayers));
                }
                catch (e) {
                    console.log(e);
                }
            }));
        }
        catch (e) {
            console.log(e);
        }
    });
    const disconnectHandler = (socket) => {
        console.log(socket.id);
        delete users[socket.id];
    };
};
exports.default = setupSocket;
//# sourceMappingURL=socket.js.map
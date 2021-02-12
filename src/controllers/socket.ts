import Room from "../models/room";
import User from "../models/User";
import {
  pictionaryWord,
  roomData,
  userInterface,
} from "../interfaces/interface";
import { words } from "../data/words";
import _ from "lodash";
const setupSocket = (io, { setAsync, getAsync }) => {
  var users = {};
  io.on("connection", (socket) => {
    //Handle New Client Connected
    socket.on("connected", (username) => {
      console.log("connected", socket.id);
      users[socket.id] = username;
      console.log(users);
    });

    //Handle Create Room
    socket.on("create room", async (roomData: roomData) => {
      try {
        const newRoom = new Room();
        const ownerUsername = roomData.owner;
        const owner = await User.findOne({ username: ownerUsername });
        if (owner) {
          newRoom.owner = owner;
        }
        //Generate random 9 digits number
        const roomId = `${Math.floor(100000000 + Math.random() * 900000000)}`;
        newRoom.name = roomData.name;
        newRoom.roomId = roomId;
        newRoom.maxPlayers = +roomData.maxPlayers;
        newRoom.gameMode = +roomData.gameMode;
        newRoom.currentPlayers = 1;
        newRoom.active = 1;
        newRoom.players = [owner];
        await newRoom.save();
        let easyWordList = words.filter((word) => word.level === 0);
        let mediumWordList = words.filter((word) => word.level === 1);
        let hardWordList = words.filter((word) => word.level === 2);
        const shuffledEasyWords = _.shuffle<pictionaryWord>(easyWordList);
        const shuffledMediumWords = _.shuffle<pictionaryWord>(mediumWordList);
        const shuffledHardWords = _.shuffle<pictionaryWord>(hardWordList);

        //Set random words of each type at the start of the game
        await setAsync(
          `easyWords:${roomId}`,
          JSON.stringify(shuffledEasyWords)
        );
        await setAsync(
          `mediumWords:${roomId}`,
          JSON.stringify(shuffledMediumWords)
        );

        //Set owner of the room as the first sketcher
        await setAsync(`sketcher:${roomId}`, JSON.stringify(owner));

        await setAsync(
          `hardWords:${roomId}`,
          JSON.stringify(shuffledHardWords)
        );
        socket.join(roomId);
        socket.emit("room created", {
          success: true,
          roomId: roomId,
          owner: ownerUsername,
        });
      } catch (e) {
        console.log(e);
        socket.emit("room created", { success: false, roomId: null });
      }
    });

    //Handle Join Room
    socket.on("join room", async (data) => {
      try {
        const roomId = data["roomId"];
        const username = data["username"];
        const room = await Room.findOne({ roomId: roomId });
        if (room.currentPlayers <= room.maxPlayers) {
          //If there is still space for player
          const user = await User.findOne({ username: username });
          room.currentPlayers += 1;
          //Add this user to the room in the database
          room.players.push(user);
          await room.save();
          const players = room.players;
          //Save in cache
          await setAsync(`players:${roomId}`, JSON.stringify(players));
          socket.join(roomId);
          socket.to(roomId).emit("new player", username);
        }
      } catch (e) {
        console.log(e);
      }
    });

    //Handle Leave a Room
    socket.on("leave room", async (data) => {
      console.log("Leave Room");
      console.log(data);
      const roomId = data["roomId"];
      const username = data["username"];
      socket.leave(roomId);
      socket.to(roomId).emit("left room", username);
      try {
        const room = await Room.findOne({ roomId: roomId });
        room.currentPlayers -= 1;
        await room.save();
      } catch (e) {
        console.log(e);
      }
    });

    //Handle Close Room
    socket.on("close room", async (roomId) => {
      try {
        const room = await Room.findOne({ roomId: roomId });
        room.active = 0;
        await room.save();
      } catch (e) {
        console.log(e);
      }
    });

    //Handle Point Drawing
    socket.on("drawing", (data) => {
      const roomId = data["roomId"];
      const newPoint = data["point"];
      socket.to(roomId).emit("drawing", newPoint);
    });

    // Handle Clear Drawing
    socket.on("clear drawing", (data) => {
      const roomId = data["roomId"];
      socket.to(roomId).emit("clear drawing");
    });

    //Handle New Messages
    socket.on("new message", (data) => {
      const roomId = data["roomId"];
      const message = data["message"];
      console.log(data);
      //Send to all clients in "gameId" room except sender
      socket.to(roomId).emit("new message", message);
    });

    socket.on("next turn", async (data) => {
      const roomId = data["roomId"];
      const round = +data["round"];
      const turn = +data["turn"];
      let shuffledWords: pictionaryWord[];
      //At each turn send three random words whose difficulty depends on the round no
      if (round === 0) {
        shuffledWords = JSON.parse(await getAsync(`easyWords:${roomId}`));
      } else if (round === 1) {
        shuffledWords = JSON.parse(await getAsync(`mediumWords:${roomId}`));
      } else {
        shuffledWords = JSON.parse(await getAsync(`hardWords:${roomId}`));
      }
      //Select next three words from shuffled words
      const wordChoices = shuffledWords.slice(turn * 3, 3 * (turn + 1));
      socket.to(roomId).emit("word choices", wordChoices);
    });

    socket.on("word selected", async (data) => {
      const roomId = data["roomId"];
      const selectedWord = data["selectedWord"];
      socket.to(roomId).emit("word selected", selectedWord);
    });

    socket.on("turn ended", async (data) => {
      const roomId = data["roomId"];
      const turn = +data["turn"];
      const players: userInterface[] = await getAsync(`players:${roomId}`);
      const nextSketcher = players[turn];
      await setAsync(`sketcher:${roomId}`, JSON.stringify(nextSketcher));
      socket.to(roomId).emit("next turn");
    });

    //Handle client disconnect
    socket.on("disconnect", () => {
      delete users[socket.id];
    });
  });
};
export default setupSocket;

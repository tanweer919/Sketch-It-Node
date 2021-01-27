import Room from "../models/room";
import User from '../models/User'
import { roomData } from "../interfaces/interface";
const setupSocket = (io) => {
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
        const owner = await User.findOne({username: ownerUsername});
        if(owner) {
          newRoom.owner = owner;
        }
        //Generte random 9 digits number
        const roomId = `${Math.floor(100000000 + Math.random() * 900000000)}`;
        newRoom.name = roomData.name;
        newRoom.roomId = roomId;
        newRoom.maxPlayers = +roomData.maxPlayers;
        newRoom.gameMode = +roomData.gameMode;
        newRoom.currentPlayers = 0;
        newRoom.active = 1;
        await newRoom.save();
        socket.emit("room created", { success: true, roomId: roomId });
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
          room.currentPlayers += 1;
          await room.save();
          socket.join(roomId);
          socket.to(roomId).emit("joined room", username);
        }
      } catch (e) {
        console.log(e);
      }
    });

    //Handle Leave a Room
    socket.on("leave room", (data) => {
      const roomId = data["roomId"];
      const username = data["username"];
      socket.leave(roomId);
      socket.to(roomId).emit("left room", username);
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
    // socket.on("typing", (roomNumber) => {
    //   console.log("someone is typing");
    //   socket.broadcast.to(roomNumber).emit("typing");
    // });
    // socket.on("notTyping", (roomNumber) => {
    //   socket.broadcast.to(roomNumber).emit("notTyping");
    // });

    //Handle Point Drawing
    socket.on("drawing", (data) => {
      const roomId = data["roomId"];
      const newPoint = data["point"];
      socket.broadcast.to(roomId).emit("drawing", newPoint);
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
      socket.to(roomId).emit("new message", message); //Send to all clients in "gameId" room except sender
    });

    //Handle client disconnect
    socket.on("disconnect", () => {
      delete users[socket.id];
    });
  });
};
export default setupSocket;

import Room from "../models/room";
import User from "../models/User";
import {
  pictionaryWord,
  roomData,
  userInterface,
  gameStatus,
} from "../interfaces/interface";
import * as consts from "../constants/socketEvents";
import { words } from "../data/words";
import { Server, Socket } from "socket.io";
import _ from "lodash";
const setupSocket = (io: Server, { setAsync, getAsync }) => {
  var users = {};
  io.on(consts.ON_CONNECTION, (socket) => {
    //Handle New Client Connected
    socket.on(consts.CONNECTED, (data) => {
      onConnectedHandler(socket, data);
    });

    //Handle Create Room
    socket.on(consts.CREATE_ROOM, async (data: roomData) => {
      await createRoomHandler(socket, data);
    });

    //Handle Join Room
    socket.on(consts.JOIN_ROOM, async (data) => {
      await joinRoomHandler(socket, data);
    });

    //Handle Leave a Room
    socket.on(consts.LEAVE_ROOM, async (data) => {
      await leaveRoomHandler(socket, data);
    });

    //Handle Close Room
    socket.on(consts.CLOSE_ROOM, async (data) => {
      await closeRoomHandler(socket, data);
    });

    //Handle Point Drawing
    socket.on(consts.DRAWING, (data) => {
      onDrawHandler(socket, data);
    });

    // Handle Clear Drawing
    socket.on(consts.CLEAR_DRAWING, (data) => {
      clearDrawingHandler(socket, data);
    });

    //Handle New Messages
    socket.on(consts.NEW_MESSAGE, async (data) => {
      await newMessageHandler(socket, data);
    });

    socket.on(consts.NEXT_TURN, async (data) => {
      await nextTurnHandler(socket, data);
    });

    socket.on(consts.WORD_SELECTED, (data) => {
      wordSelectedHandler(socket, data);
    });

    socket.on(consts.TURN_ENDED, async (data) => {
      await turnEndHandler(socket, data);
    });

    socket.on(consts.START_GAME, async (data) => {
      await startGameHandler(socket, data);
    });

    socket.on(consts.DISCONNECTING, async () => {
      await onDisconnectingHandler(socket);
    });

    //Handle client disconnect
    socket.on(consts.DISCONNECT, () => {
      disconnectHandler(socket);
    });
  });

  const onConnectedHandler = async (socket: Socket, data) => {
    console.log("connected", socket.id);
    users[socket.id] = data["username"];
    console.log(users);
  };

  const createRoomHandler = async (socket: Socket, roomData: roomData) => {
    try {
      const newRoom = new Room();
      const adminUsername = roomData.admin;
      const admin = await User.findOne({ username: adminUsername });
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
      await newRoom.save();
      let easyWordList = words.filter((word) => word.level === 0);
      let mediumWordList = words.filter((word) => word.level === 1);
      let hardWordList = words.filter((word) => word.level === 2);
      const shuffledEasyWords = _.shuffle<pictionaryWord>(easyWordList);
      const shuffledMediumWords = _.shuffle<pictionaryWord>(mediumWordList);
      const shuffledHardWords = _.shuffle<pictionaryWord>(hardWordList);

      //Set random words of each type at the start of the game
      await setAsync(`easyWords:${roomId}`, JSON.stringify(shuffledEasyWords));
      await setAsync(
        `mediumWords:${roomId}`,
        JSON.stringify(shuffledMediumWords)
      );

      await setAsync(`hardWords:${roomId}`, JSON.stringify(shuffledHardWords));

      //Set owner as the first player of the room
      await setAsync(`players:${roomId}`, JSON.stringify(newRoom.players));

      //Set owner of the room as the first sketcher
      await setAsync(`sketcher:${roomId}`, JSON.stringify(admin));

      //Set messages as empty
      await setAsync(`messages:${roomId}`, JSON.stringify([]));

      //Set game as not started
      await setAsync(
        `gameStatus:${roomId}`,
        JSON.stringify(gameStatus.NotStarted)
      );

      const status = "Waiting for other players to join...";
      await setAsync(`status:${roomId}`, status);
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
          gameStatus: gameStatus.NotStarted,
        },
      });
    } catch (e) {
      console.log(e);
      io.to(socket.id).emit(consts.ROOM_CREATED, {
        success: false,
        roomId: null,
      });
    }
  };

  const joinRoomHandler = async (socket: Socket, data) => {
    try {
      const roomId = data["roomId"];
      const username = data["username"];
      const source = data["source"];
      const room = await Room.findOne({ roomId: roomId }).populate("players");
      if (room.currentPlayers <= room.maxPlayers) {
        //If there is still space for player
        const user = await User.findOne({ username: username });
        room.currentPlayers += 1;
        //Add this user to the room in the database
        room.players.push(user);
        await room.save();
        const players = room.players;

        //Retrieve all previous messages
        let previousMessages = await getAsync(`messages:${roomId}`);
        previousMessages = JSON.parse(previousMessages);

        //Retrieve current sketcher
        let currentSketcher = await getAsync(`sketcher:${roomId}`);
        currentSketcher = JSON.parse(currentSketcher);

        //Save in cache
        await setAsync(`players:${roomId}`, JSON.stringify(players));
        const gameStatus: Number = JSON.parse(
          await getAsync(`gameStatus:${roomId}`)
        );

        let status: string;
        if (room.currentPlayers === 2) {
          status = "Waiting for admin to start the game...";
          await setAsync(`status:${roomId}`, status);
          socket.to(roomId).emit(consts.NEW_STATUS, { status });
        }
        status = await getAsync(`status:${roomId}`);
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
    } catch (e) {
      console.log(e);
    }
  };

  const leaveRoomHandler = async (socket: Socket, data) => {
    const roomId = data["roomId"];
    const username = data["username"];
    socket.leave(roomId);
    socket.to(roomId).emit(consts.LEFT_ROOM, { roomId, username });
    try {
      const player = await User.findOne({ username: username });
      const updatedroom = await Room.findOneAndUpdate(
        { roomId: roomId },
        {
          $inc: { currentPlayers: -1 },
          $pull: { players: player._id },
        },
        { new: true }
      );
      console.log(JSON.stringify(updatedroom));
      const updatedPlayers = updatedroom.players;
      setAsync(`players:${roomId}`, JSON.stringify(updatedPlayers));
    } catch (e) {
      console.log(e);
    }
  };

  const closeRoomHandler = async (socket: Socket, data) => {
    try {
      const roomId = data["roomId"];
      const room = await Room.findOne({ roomId: roomId });
      room.active = 0;
      await room.save();
    } catch (e) {
      console.log(e);
    }
  };

  const onDrawHandler = (socket: Socket, data) => {
    const roomId = data["roomId"];
    const newPoint = data["point"];
    socket.to(roomId).emit(consts.DRAWING, newPoint);
  };

  const clearDrawingHandler = (socket: Socket, data) => {
    const roomId = data["roomId"];
    socket.to(roomId).emit(consts.CLEAR_DRAWING);
  };

  const newMessageHandler = async (socket: Socket, data) => {
    const roomId = data["roomId"];
    const message = data["message"];
    let messages = await getAsync(`messages:${roomId}`);
    messages = JSON.parse(messages);
    messages.push(message);
    await setAsync(`messages:${roomId}`, JSON.stringify(messages));
    //Send to all clients in "gameId" room except sender
    socket.to(roomId).emit(consts.NEW_MESSAGE, message);
  };

  const nextTurnHandler = async (socket: Socket, data) => {
    const roomId = data["roomId"];
    const username = data["username"];
    const round: number = JSON.parse(await getAsync(`round:${roomId}`));
    const turn: number = JSON.parse(await getAsync(`turn:${roomId}`));
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

    io.to(socket.id).emit(consts.WORD_CHOICES, wordChoices);
    socket
      .to(roomId)
      .emit(consts.NEW_STATUS, `${username} is selecting a word to draw...`);
  };

  const wordSelectedHandler = (socket: Socket, data) => {
    const roomId = data["roomId"];
    const selectedWord = data["selectedWord"];
    socket.to(roomId).emit(consts.WORD_SELECTED, selectedWord);
  };

  const turnEndHandler = async (socket: Socket, data) => {
    const roomId = data["roomId"];
    const turn = +data["turn"];
    const players: userInterface[] = JSON.parse(
      await getAsync(`players:${roomId}`)
    );
    const nextSketcher = players[turn];
    await setAsync(`sketcher:${roomId}`, JSON.stringify(nextSketcher));
    socket.to(roomId).emit(consts.NEXT_TURN);
  };

  const startGameHandler = async (socket: Socket, data) => {
    const roomId = data["roomId"];
    const username = data["username"];
    try {
      const room = await Room.findOne({ roomId: roomId }).populate("admin");
      if (room) {
        console.log(`${room.admin.username} ${username}`);
        if (room.admin.username === username) {
          await setAsync(`round:${roomId}`, JSON.stringify(0));
          await setAsync(`turn:${roomId}`, JSON.stringify(0));

          await setAsync(
            `gameStatus:${roomId}`,
            JSON.stringify(gameStatus.Started)
          );
          io.in(roomId).emit(consts.GAME_STARTED);
          await nextTurnHandler(socket, { roomId: roomId, username: username });
        }
      }
    } catch (e) {
      console.log(e);
    }
  };

  const onDisconnectingHandler = async (socket: Socket) => {
    const rooms = Object.keys(socket.rooms);
    const username = users[socket.id];
    try {
      const player = await User.findOne({ username: username });
      rooms.forEach(async (roomId) => {
        if (roomId === socket.id) return;
        io.to(roomId).emit(consts.LEFT_ROOM, { username, roomId });
        try {
          const updatedroom = await Room.findOneAndUpdate(
            { roomId: roomId },
            {
              $inc: { currentPlayers: -1 },
              $pull: { players: player._id },
            },
            { new: true }
          );
          const updatedPlayers = updatedroom.players;
          setAsync(`players:${roomId}`, JSON.stringify(updatedPlayers));
        } catch (e) {
          console.log(e);
        }
      });
    } catch (e) {
      console.log(e);
    }
  };

  const disconnectHandler = (socket: Socket) => {
    console.log(socket.id);
    delete users[socket.id];
  };
};
export default setupSocket;

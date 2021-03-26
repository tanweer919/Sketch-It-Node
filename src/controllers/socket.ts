import Room from "../models/room";
import User from "../models/User";
import {
  pictionaryWord,
  roomData,
  userInterface,
  gameStatus,
  playerInterface,
  pointsInterface,
  messageInterface,
} from "../interfaces/interface";
import * as consts from "../constants/socketEvents";
import * as redisKeys from "../constants/redisKeys";
import { words } from "../data/words";
import { Server, Socket } from "socket.io";
import _ from "lodash";
const setupSocket = (io: Server, { setAsync, getAsync }) => {
  var usernameToSocketId = {};
  var socketIdToUsername = {};
  let wordSelectionTimer = {};
  let drawingTimer = {};
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

    // socket.on(consts.TURN_ENDED, async (data) => {
    //   await turnEndHandler(socket, data);
    // });

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
    socketIdToUsername[socket.id] = data["username"];
    usernameToSocketId[data["username"]] = socket.id;
    console.log(socketIdToUsername);
  };

  const createRoomHandler = async (socket: Socket, roomData: roomData) => {
    try {
      const newRoom = new Room();
      const adminUsername = roomData.admin;
      const admin = await User.findOne({ username: adminUsername });
      let playerAdmin: playerInterface;
      if (admin) {
        playerAdmin = { user: admin, score: 0 };
        newRoom.admin = playerAdmin;
        newRoom.players.push(playerAdmin);
      }
      //Generate random 9 digits number
      let roomId = `${Math.floor(100000000 + Math.random() * 900000000)}`;
      let roomWithSameId = Room.findOne({ roomId });
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
      await setAsync(
        redisKeys.easyWords(roomId),
        JSON.stringify(shuffledEasyWords)
      );
      await setAsync(
        redisKeys.mediumWords(roomId),
        JSON.stringify(shuffledMediumWords)
      );

      await setAsync(
        redisKeys.hardWords(roomId),
        JSON.stringify(shuffledHardWords)
      );

      //Set owner as the first player of the room
      //Set initial score to 0
      const players: playerInterface[] = [playerAdmin];
      await setAsync(redisKeys.players(roomId), JSON.stringify(players));

      //Set owner of the room as the first sketcher
      await setAsync(redisKeys.sketcher(roomId), JSON.stringify(playerAdmin));

      //Set messages as empty
      await setAsync(redisKeys.messages(roomId), JSON.stringify([]));

      await setAsync(redisKeys.isGuessingAllowed(roomId), JSON.stringify(0));

      //Set game as not started
      await setAsync(
        redisKeys.gameStatus(roomId),
        JSON.stringify(gameStatus.NotStarted)
      );

      const status = "Waiting for other players to join...";
      await setAsync(redisKeys.status(roomId), status);
      socket.join(roomId);
      io.to(socket.id).emit(consts.ROOM_CREATED, {
        success: true,
        roomId: roomId,
        initialRoomData: {
          players: players,
          sketcher: playerAdmin,
          messages: [],
          admin: playerAdmin.user,
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
      const room = await Room.findOne({ roomId: roomId }).populate(
        "players.user admin.user"
      );
      if (room.currentPlayers <= room.maxPlayers) {
        //If there is still space for player
        const user = await User.findOne({ username: username });
        //Add this user to the room in the database
        const player: playerInterface = { user, score: 0 };
        room.players.push(player);
        room.currentPlayers += 1;
        await room.save();

        //Retrieve all previous messages
        let previousMessages: messageInterface[] = JSON.parse(
          await getAsync(redisKeys.messages(roomId))
        );

        //Retrieve current sketcher
        let currentSketcher = await getAsync(redisKeys.sketcher(roomId));
        currentSketcher = JSON.parse(currentSketcher);

        //Save in cache
        await setAsync(redisKeys.players(roomId), JSON.stringify(room.players));
        const gameStatus: Number = JSON.parse(
          await getAsync(redisKeys.gameStatus(roomId))
        );

        let status: string;
        if (room.currentPlayers === 2) {
          status = "Waiting for admin to start the game...";
          await setAsync(redisKeys.status(roomId), status);
          socket.to(roomId).emit(consts.NEW_STATUS, { status });
        }
        status = await getAsync(redisKeys.status(roomId));
        socket.join(roomId);
        io.to(socket.id).emit(consts.JOINED_ROOM, {
          roomId,
          source,
          initialRoomData: {
            players: room.players,
            sketcher: currentSketcher,
            messages: previousMessages,
            admin: room.admin.user,
            status,
            gameStatus,
          },
        });
        io.in(roomId).emit(consts.NEW_PLAYER, username);
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
      setAsync(redisKeys.players(roomId), JSON.stringify(updatedPlayers));
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
    const message: messageInterface = data["message"];
    let messages: messageInterface[] = JSON.parse(
      await getAsync(redisKeys.messages(roomId))
    );
    console.log(messages);
    const isGuessingAllowed: number = JSON.parse(
      await getAsync(redisKeys.isGuessingAllowed(roomId))
    );
    const username = message["user"]["username"];
    if (isGuessingAllowed == 1 && message["messageType"] == "userMessage") {
      let points: pointsInterface = JSON.parse(
        await getAsync(redisKeys.pointsGainedThisTurn(roomId))
      );
      let answer: string = message["message"];
      let currentWord: string = await getAsync(redisKeys.currentWord(roomId));
      currentWord = currentWord.toLowerCase();
      if (answer !== "" && answer !== undefined && !(username in points)) {
        answer = answer.trim();
        answer = answer.toLowerCase();
        if (answer.includes(currentWord)) {
          const timer: NodeJS.Timeout = drawingTimer[roomId];
          const timeLeft: number = Math.ceil(
            (timer["_idleStart"] + timer["_idleTimeout"]) / 1000 -
              process.uptime()
          );
          if (timeLeft > 0) {
            const players: playerInterface[] = JSON.parse(
              await getAsync(redisKeys.players(roomId))
            );
            for (let i = 0; i < players.length; i++) {
              if (players[i].user.username === username) {
                players[i].score += timeLeft;
                break;
              }
            }
            points[username] = timeLeft;
            await setAsync(redisKeys.players(roomId), JSON.stringify(players));
            await setAsync(
              redisKeys.pointsGainedThisTurn(roomId),
              JSON.stringify(points)
            );
            let modifiedMessage: messageInterface = {
              ...message,
              message: `${username} have guessed correctly(+${timeLeft} points)`,
              messageType: "pointsGained",
            };
            messages.push(modifiedMessage);
            await setAsync(
              redisKeys.messages(roomId),
              JSON.stringify(messages)
            );
            io.in(roomId).emit(consts.NEW_MESSAGE, modifiedMessage);
            io.in(roomId).emit(consts.ADD_POINTS, {
              username: username,
              points: timeLeft,
            });
            if (Object.values(points).length == players.length - 1) {
              turnEndHandler(socket, roomId);
              return;
            }
          }
        }
      }
    }
    messages.push(message);
    await setAsync(redisKeys.messages(roomId), JSON.stringify(messages));
    //Send to all clients in "gameId" room except sender
    io.in(roomId).emit(consts.NEW_MESSAGE, message);
  };

  const nextTurnHandler = async (socket: Socket, data) => {
    const roomId = data["roomId"];
    const username = data["username"];
    const round: number = JSON.parse(await getAsync(redisKeys.round(roomId)));
    const turn: number = JSON.parse(await getAsync(redisKeys.turn(roomId)));
    let shuffledWords: pictionaryWord[];

    //At each turn send three random words whose difficulty depends on the round no
    if (round === 0) {
      shuffledWords = JSON.parse(await getAsync(redisKeys.easyWords(roomId)));
    } else if (round === 1) {
      shuffledWords = JSON.parse(await getAsync(redisKeys.mediumWords(roomId)));
    } else {
      shuffledWords = JSON.parse(await getAsync(redisKeys.hardWords(roomId)));
    }
    //Select next three words from shuffled words
    const wordChoices = shuffledWords.slice(turn * 3, 3 * (turn + 1));
    const sketcherSocketId = usernameToSocketId[username];
    io.to(sketcherSocketId).emit(consts.YOUR_TURN, wordChoices);

    const status = `${username} is selecting a word to draw...`;
    await setAsync(redisKeys.status(roomId), status);
    socket.to(roomId).emit(consts.NEW_STATUS, { status });
    const timer = setTimeout(async () => {
      await skipTurn(socket, { roomId, username }, false);
    }, 20000);
    wordSelectionTimer[roomId] = timer;
  };

  const wordSelectedHandler = async (socket: Socket, data) => {
    const roomId = data["roomId"];
    const selectedWord: string = data["selectedWord"];
    console.log(selectedWord);
    debugger;
    const placeholder = selectedWord.replace(" ", "  ").replace(/\S/gi, "_ ");
    const username = socketIdToUsername[socket.id];
    await setAsync(redisKeys.currentWord(roomId), selectedWord);
    socket.to(roomId).emit(consts.WORD_SELECTED, { selectedWord });

    const status = `${username} is drawing ${placeholder}`;
    socket.to(roomId).emit(consts.NEW_STATUS, { status });
    await setAsync(redisKeys.status(roomId), status);
    await setAsync(redisKeys.isGuessingAllowed(roomId), JSON.stringify(1));
    io.to(socket.id).emit(consts.NEW_STATUS, {
      status: `You are drawing ${selectedWord}`,
    });
    io.in(roomId).emit(consts.START_DRAWING);
    clearTimeout(wordSelectionTimer[roomId]);
    drawingTimer[roomId] = setTimeout(async () => {
      await turnEndHandler(socket, roomId);
    }, 60000);
  };

  const turnEndHandler = async (socket, roomId) => {
    const players: playerInterface[] = JSON.parse(
      await getAsync(redisKeys.players(roomId))
    );
    const pointsGainedThisTurn: pointsInterface = JSON.parse(
      await getAsync(redisKeys.pointsGainedThisTurn(roomId))
    );
    const pointsList: number[] = Object.values(pointsGainedThisTurn);
    let turn: number = +JSON.parse(await getAsync(redisKeys.turn(roomId)));
    let round: number = +JSON.parse(await getAsync(redisKeys.round(roomId)));
    let totalPoints = 0;
    for (let i = 0; i < pointsList.length; i++) {
      totalPoints += pointsList[i];
    }
    let sketcherPoints: number;
    if (totalPoints == 0) {
      sketcherPoints = -5;
    } else {
      sketcherPoints = Math.ceil(totalPoints / (pointsList.length * 2));
    }
    let sketcher: playerInterface = { ...players[turn], score: sketcherPoints };
    players[turn] = sketcher;
    await setAsync(redisKeys.players(roomId), JSON.stringify(players));
    const currentWord: string = await getAsync(redisKeys.currentWord(roomId));
    let message: messageInterface = {
      message: `${sketcher.user.username} was drawing ${currentWord}. ${
        pointsList.length
      }/${players.length - 1} players have guessed it correctly(${
        sketcherPoints > 0 ? "+" : ""
      }${sketcherPoints} points)`,
      messageType: "pointsGained",
      user: sketcher.user,
    };
    let messages: messageInterface[] = JSON.parse(
      await getAsync(redisKeys.messages(roomId))
    );
    messages.push(message);
    await setAsync(redisKeys.messages(roomId), JSON.stringify(messages));
    io.in(roomId).emit(consts.NEW_MESSAGE, message);
    console.log(sketcherPoints);
    io.in(roomId).emit(consts.ADD_POINTS, {
      username: sketcher.user.username,
      points: sketcherPoints,
    });

    turn += 1;
    console.log(players);
    if (turn > players.length - 1) {
      turn = 0;
      round += 1;
      if (round == 3) {
        return endGameHandler(socket, roomId);
      }
      await setAsync(redisKeys.round(roomId), JSON.stringify(round));
    }
    await setAsync(redisKeys.isGuessingAllowed(roomId), JSON.stringify(0));
    await setAsync(redisKeys.turn(roomId), JSON.stringify(turn));
    await setAsync(redisKeys.pointsGainedThisTurn(roomId), JSON.stringify({}));
    const nextSketcher = players[turn];
    await setAsync(redisKeys.sketcher(roomId), JSON.stringify(nextSketcher));
    clearTimeout(drawingTimer[roomId]);
    io.in(roomId).emit(consts.END_TURN, {
      message: `Starting next turn. ${nextSketcher.user.username} will be sketching now. Get ready...`,
    });
    setTimeout(() => {
      io.in(roomId).emit(consts.NEXT_TURN, {
        username: nextSketcher.user.username,
      });
      nextTurnHandler(socket, {
        roomId: roomId,
        username: nextSketcher.user.username,
      });
    }, 10000);
  };

  const startGameHandler = async (socket: Socket, data) => {
    const roomId = data["roomId"];
    const username = data["username"];
    try {
      const room = await Room.findOne({ roomId: roomId }).populate(
        "admin.user"
      );
      if (room) {
        if (room.admin.user.username === username) {
          await setAsync(redisKeys.round(roomId), JSON.stringify(0));
          await setAsync(redisKeys.turn(roomId), JSON.stringify(0));
          await setAsync(
            redisKeys.pointsGainedThisTurn(roomId),
            JSON.stringify({})
          );

          await setAsync(
            redisKeys.gameStatus(roomId),
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

  const skipTurn = async (socket: Socket, data, isDisconnected: boolean) => {
    const roomId = data["roomId"];
    const username = data["username"];
    const players: playerInterface[] = JSON.parse(
      await getAsync(redisKeys.players(roomId))
    );
    let turn: number = +JSON.parse(await getAsync(redisKeys.turn(roomId)));
    let round: number = +JSON.parse(await getAsync(redisKeys.round(roomId)));
    const previousSketcher: playerInterface = await getAsync(
      redisKeys.sketcher(roomId)
    );
    if (!isDisconnected) turn += 1;
    if (turn > players.length - 1) {
      turn = 0;
      round += 1;
      if (round == 3) {
        return endGameHandler(socket, roomId);
      }
      await setAsync(redisKeys.round(roomId), JSON.stringify(round));
    }
    await setAsync(redisKeys.isGuessingAllowed(roomId), JSON.stringify(0));
    await setAsync(redisKeys.turn(roomId), JSON.stringify(turn));
    const nextSketcher = players[turn];
    await setAsync(redisKeys.sketcher(roomId), JSON.stringify(nextSketcher));
    clearTimeout(wordSelectionTimer[roomId]);

    if (isDisconnected) {
      io.in(roomId).emit(consts.SKIP_TURN, {
        message: `${previousSketcher.user.username} disconnected. Skipping this turn. ${nextSketcher.user.username} will be sketching now. Get ready...`,
      });
    } else {
      io.in(roomId).emit(consts.SKIP_TURN, {
        message: `${previousSketcher.user.username} didn't select word in time. Skipping this turn. ${nextSketcher.user.username} will be sketching now. Get ready...`,
      });
    }
    setTimeout(() => {
      io.in(roomId).emit(consts.NEXT_TURN, {
        username: nextSketcher.user.username,
      });
      nextTurnHandler(socket, {
        roomId: roomId,
        username: nextSketcher.user.username,
      });
    }, 10000);
  };

  const onDisconnectingHandler = async (socket: Socket) => {
    //Get all the rooms, the disconnecting socket is part of
    const rooms = Object.keys(socket.rooms);
    //Get username from socket id
    const username = socketIdToUsername[socket.id];
    try {
      //Get the user from username
      const player:userInterface = await User.findOne({ username: username });
      rooms.forEach(async (roomId) => {
        //Ignore room with same id as the socket id
        if (roomId === socket.id) return;
        //Emit LEFT_ROOM event with the username
        io.in(roomId).emit(consts.LEFT_ROOM, { username, roomId });
        try {
          //Update room by removing player from the room and decreasing current player count by one
          const updatedRoom = await Room.findOneAndUpdate(
            { roomId: roomId },
            {
              $inc: { currentPlayers: -1 },
              $pull: { players: { user: player._id } },
            },
            { new: true }
          ).populate("players.user admin.user");
          const updatedPlayers: playerInterface[] = updatedRoom.players;
          let currentSketcher: playerInterface = await getAsync(
            redisKeys.sketcher(roomId)
          );
          setAsync(redisKeys.players(roomId), JSON.stringify(updatedPlayers));
          //If disconnected player was the admin of the room
          if (updatedRoom.admin.user.username === username) {
            //If admin was the only player in the room
            if (updatedPlayers.length == 0) {
              //Close room
              return closeRoomHandler(socket, { roomId });
            } else {
              const previousAdmin: playerInterface = updatedRoom.admin;
              //New admin would be the player who joined just after admin
              const newAdmin: playerInterface = updatedPlayers[0];
              //Update admin in the database
              updatedRoom.admin = newAdmin;
              await updatedRoom.save();
              //Emit CHANGE_ADMIN event
              io.in(roomId).emit(consts.CHANGE_ADMIN, {
                username: newAdmin.user.username,
              });

              //Store this information in the messages;
              const messages: messageInterface[] = JSON.parse(
                await getAsync(redisKeys.messages(roomId))
              );
              let message: messageInterface = {
                user: newAdmin.user,
                message: `Admin has left the room. ${newAdmin.user.username} is the new admin.`,
                messageType: "infoMessage",
              };
              messages.push(message);
              await setAsync(
                redisKeys.messages(roomId),
                JSON.stringify(messages)
              );
              //Sending this info message to the room
              io.in(roomId).emit(consts.NEW_MESSAGE, message);
            }
          }
          //If disconnected player was the sketcher in the room
          if (currentSketcher.user.username === username) {
            //Skip this turn
            return skipTurn(socket, { roomId, username }, true);
          }
        } catch (e) {
          console.log(e);
        }
      });
    } catch (e) {
      console.log(e);
    }
  };

  const endGameHandler = async (socket: Socket, roomId: string) => {
    io.in(roomId).emit(consts.END_GAME, {
      message: "Game has been completed. Scoreboard is coming up...",
    });
    try {
      const room = await Room.findOne({ roomId });
      if (room) {
        room.active = 0;
        await room.save();
      }
    } catch (e) {
      console.log(e);
    }
  };

  const disconnectHandler = (socket: Socket) => {
    delete socketIdToUsername[socket.id];
  };
};
export default setupSocket;

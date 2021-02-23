import express from "express";
import Room from "../models/room";
import User from "../models/User";
const router = express.Router();
router.post("/user/create/", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username });
    console.log("registering");
    if (user) {
      return res.status(400).send({ status: "Username is already taken" });
    } else {
      const user = new User();
      user.username = req.body.username;
      await user.save();
      return res.status(201).send({ status: "success" });
    }
  } catch (e) {
    return res
      .status(400)
      .send({ status: "Faced some problem generating username" });
  }
});
router.post("/user/check", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username });
    if (user) {
      return res.status(200).send({ available: false, status: "" });
    } else {
      return res.status(200).send({ available: true, status: "" });
    }
  } catch (e) {
    return res
      .status(400)
      .send({ status: "Faced some problem generating username" });
  }
});
router.post("/room/check/", async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.body.roomId, active: 1 });
    if (room) {
      if (room.currentPlayers <= room.maxPlayers) {
        return res.status(200).send({ status: "success" });
      } else {
        return res.status(400).send({ status: "Room is full" });
      }
    } else {
      return res
        .status(400)
        .send({ status: "No active room is found with given Room ID" });
    }
  } catch (e) {
    console.log(e);
    return res
      .status(400)
      .send({ status: "Faced some problem while joining room" });
  }
});

export default router;

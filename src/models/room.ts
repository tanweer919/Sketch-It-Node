import mongoose, { Document, Model, Schema } from "mongoose";
import { roomInterface } from "../interfaces/interface";
import User from "./User";

const roomSchema = new mongoose.Schema<roomInterface>({
  name: String,
  roomId: String,
  maxPlayers: Number,
  gameMode: Number,
  visiblity: Number,
  currentPlayers: Number,
  active: Number,
  admin: { user: { type: Schema.Types.ObjectId, ref: "User" }, score: Number },
  players: [
    { user: { type: Schema.Types.ObjectId, ref: "User" }, score: Number },
  ],
});

const Room: Model<roomInterface> = mongoose.model("Room", roomSchema);
export default Room;

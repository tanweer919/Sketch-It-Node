import { Document } from "mongoose";

export interface roomData {
  name: string;
  maxPlayers: number;
  gameMode: number;
  owner: string;
}

export interface userInterface extends Document {
  username: string;
}

export interface roomInterface extends Document {
  name: string;
  roomId: string;
  maxPlayers: number;
  gameMode: number;
  currentPlayers: number;
  active: number;
  owner: userInterface;
}



import { Document } from "mongoose";

export interface roomData {
  roomName: string;
  maxPlayers: number;
  gameMode: number;
  admin: string;
}

export interface userInterface extends Document {
  username: string;
}

export interface playerInterface {
  user: userInterface;
  score: number;
}

export interface roomInterface extends Document {
  name: string;
  roomId: string;
  maxPlayers: number;
  gameMode: number;
  currentPlayers: number;
  active: number;
  admin: playerInterface;
  players: playerInterface[];
}

export interface messageInterface {
  messageType: string;
  message: string;
  user: userInterface;
}

export interface pointsInterface {
  [key: string]: number;
}

export enum level {
  Easy,
  Medium,
  Hard,
}
export interface pictionaryWord {
  word: string;
  level: level;
}

export enum gameStatus {
  NotStarted,
  Started,
  Over,
}

import { Document } from "mongoose";

export interface roomData {
  roomName: string;
  maxPlayers: number;
  gameMode: number;
  visiblity: number;
  admin: string;
}

export interface userInterface extends Document {
  username: string;
  firebaseToken: string;
  email: string;
  profilePicUrl: string;
}

export interface serializedUserInterface {
  username: string;
  profilePicUrl: string;
}

export interface playerInterface {
  user: userInterface;
  score: number;
}

export interface serializedPlayerInterface {
  user: serializedUserInterface;
  score: number;
}

export interface roomInterface extends Document {
  name: string;
  roomId: string;
  maxPlayers: number;
  gameMode: number;
  visiblity: number;
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

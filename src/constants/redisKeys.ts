export const easyWords = (roomId: string) => `easyWords:${roomId}`;
export const mediumWords = (roomId: string) => `mediumWords:${roomId}`;
export const hardWords = (roomId: string) => `hardWords:${roomId}`;
export const players = (roomId: string) => `players:${roomId}`;
export const sketcher = (roomId: string) => `sketcher:${roomId}`;
export const messages = (roomId: string) => `messages:${roomId}`;
export const gameStatus = (roomId: string) => `gameStatus:${roomId}`;
export const status = (roomId: string) => `status:${roomId}`;
export const round = (roomId: string) => `round:${roomId}`;
export const turn = (roomId: string) => `turn:${roomId}`;
export const currentWord = (roomId: string) => `currentWord:${roomId}`;
export const isGuessingAllowed = (roomId: string) =>
  `isGuessingAllowed:${roomId}`;
export const pointsGainedThisTurn = (roomId: string) =>
  `pointsGainedThisTurn:${roomId}`;

import mongoose, { Number,Document, Model } from 'mongoose';
interface roomInterface extends Document {
  name: string;
  roomId: string;
  maxPlayers: number;
  gameMode: number;
  currentPlayers: number;
  active: number;
}
const roomSchema = new mongoose.Schema<roomInterface>({
  name: String,
  roomId: String,
  maxPlayers: Number,
  gameMode: Number,
  currentPlayers: Number,
  active: Number
});

const Room: Model<roomInterface> = mongoose.model("Room", roomSchema);
export default Room;
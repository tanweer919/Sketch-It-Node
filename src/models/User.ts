import mongoose, { Number, Document, Model } from "mongoose";
interface userInterface extends Document {
  username: string;
}
const userSchema = new mongoose.Schema<userInterface>({
  username: String
});

const User: Model<userInterface> = mongoose.model("User", userSchema);
export default User;

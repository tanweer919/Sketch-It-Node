import mongoose, { Number, Document, Model } from "mongoose";
import { userInterface } from "../interfaces/interface";

const userSchema = new mongoose.Schema<userInterface>({
  username: String,
  firebaseToken: String,
  email: String,
  profilePicUrl: String
});

const User: Model<userInterface> = mongoose.model("User", userSchema);
export default User;

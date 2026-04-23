
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  memory: {
    profile: { type: Map, of: String, default: {} },
    preferences: { type: Map, of: String, default: {} },
    goals: { type: [String], default: [] }
  }
});

export default mongoose.model("User", userSchema);

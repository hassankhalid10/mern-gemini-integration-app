/**
 * User Model
 * 
 * This file defines what a "User" looks like in our database.
 * It stores your name, email, encrypted password, and the things
 * the AI remembers about you (your memory).
 */

import mongoose from "mongoose";

import bcrypt from "bcryptjs";

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

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("User", userSchema);

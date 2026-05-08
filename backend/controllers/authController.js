/**
 * Auth Controller
 * 
 * This file handles all the user-related security, like creating a 
 * new account (Signup) or logging into an existing one (Login).
 */

import User from "../models/User.js";

import jwt from "jsonwebtoken";

/**
 * Creates a new user account so you can start using the app.
 */
export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // 1. Check if an account already exists with this email
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ msg: "User already exists" });

    // 2. Create a new user (the password will be scrambled automatically by the User model)
    const user = new User({ name, email, password });
    await user.save();

    // 3. Create a "Digital Key" (token) so the user is logged in immediately
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    
    // 4. Send the key back to the website
    res.status(201).json({ token });
  } catch (err) {
    res.status(500).json({ msg: "Signup failed" });
  }
};


/**
 * Logs you into your account and gives you a "key" (token) to access private features.
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 1. Find the user by their email address
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "User not found" });

    // 2. Check if the password they typed matches the scrambled one in our database
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    // 3. Create a fresh "Digital Key" (token) that lasts for 7 days
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    
    // 4. Send the key back so the website knows who is logged in
    res.json({ token });
  } catch (err) {
    res.status(500).json({ msg: "Login failed" });
  }
};


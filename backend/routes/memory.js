import express from "express";
import User from "../models/User.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// Get current user memory
router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("memory");
    if (!user.memory) {
      return res.json({ profile: {}, preferences: {}, goals: [] });
    }
    
    // Convert Mongoose Maps to plain objects for JSON response
    res.json({
      profile: Object.fromEntries(user.memory.profile),
      preferences: Object.fromEntries(user.memory.preferences),
      goals: user.memory.goals
    });
  } catch (err) {
    res.status(500).json({ msg: "Server error fetching memory" });
  }
});

// Update memory
router.patch("/", auth, async (req, res) => {
  try {
    const { profile, preferences, goals } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user.memory) {
      user.memory = { profile: {}, preferences: {}, goals: [] };
    }

    if (profile) {
      for (const [key, value] of Object.entries(profile)) {
        user.memory.profile.set(key, value);
      }
    }
    
    if (preferences) {
      for (const [key, value] of Object.entries(preferences)) {
        user.memory.preferences.set(key, value);
      }
    }
    
    if (goals) {
      user.memory.goals = goals;
    }

    await user.save();
    
    res.json({
      profile: Object.fromEntries(user.memory.profile),
      preferences: Object.fromEntries(user.memory.preferences),
      goals: user.memory.goals
    });
  } catch (err) {
    res.status(500).json({ msg: "Server error updating memory" });
  }
});

// Delete specific memory item
router.delete("/:category/:key", auth, async (req, res) => {
  try {
    const { category, key } = req.params;
    const user = await User.findById(req.user.id);
    
    if (!user.memory) return res.status(404).json({ msg: "No memory found" });

    if (category === "profile") {
      user.memory.profile.delete(key);
    } else if (category === "preferences") {
      user.memory.preferences.delete(key);
    } else if (category === "goals") {
      user.memory.goals = user.memory.goals.filter(g => g !== key);
    } else {
      return res.status(400).json({ msg: "Invalid category" });
    }

    await user.save();
    
    res.json({
      profile: Object.fromEntries(user.memory.profile),
      preferences: Object.fromEntries(user.memory.preferences),
      goals: user.memory.goals
    });
  } catch (err) {
    res.status(500).json({ msg: "Server error deleting memory" });
  }
});

export default router;

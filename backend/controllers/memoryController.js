/**
 * Memory Controller
 * 
 * This file manages the AI's "memory" of you. It stores details like 
 * your preferences and goals so that the AI can give you more 
 * personalized and helpful answers.
 */

import User from "../models/User.js";


/**
 * Gets all the things the AI remembers about you (profile, settings, goals).
 */
export const getMemory = async (req, res) => {

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });
    res.json(user.memory || { profile: {}, preferences: {}, goals: [] });
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch memory" });
  }
};

/**
 * Updates what the AI remembers about you.
 */
export const updateMemory = async (req, res) => {
  try {
    const { profile, preferences, goals } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // 1. If the user doesn't have any memory stored yet, create an empty structure
    if (!user.memory) {
      user.memory = { profile: {}, preferences: {}, goals: [] };
    }

    // 2. Add or update facts in the 'Profile' category (e.g., Name, Job)
    if (profile) {
      for (const [key, val] of Object.entries(profile)) {
        user.memory.profile.set(key, val);
      }
    }
    
    // 3. Add or update settings in the 'Preferences' category (e.g., Tone)
    if (preferences) {
      for (const [key, val] of Object.entries(preferences)) {
        user.memory.preferences.set(key, val);
      }
    }
    
    // 4. Update the entire list of 'Goals'
    if (goals) user.memory.goals = goals;

    // 5. Save the updated user data to the database
    await user.save();
    res.json(user.memory);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to update memory" });
  }
};


/**
 * Deletes a specific piece of information from the AI's memory.
 */
export const deleteMemoryItem = async (req, res) => {
  try {
    const { category, key } = req.params;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // 1. If we are deleting a 'Goal', we filter the list to remove that index
    if (category === "goals") {
      user.memory.goals = user.memory.goals.filter((_, i) => i !== parseInt(key));
    } else {
      // 2. Otherwise, we remove the specific Label:Value pair from the Map
      user.memory[category].delete(key);
    }

    // 3. Save and send back the updated memory
    await user.save();
    res.json(user.memory);
  } catch (err) {
    res.status(500).json({ msg: "Failed to delete memory item" });
  }
};


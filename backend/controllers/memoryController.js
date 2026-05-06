import User from "../models/User.js";

export const getMemory = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });
    res.json(user.memory || { profile: {}, preferences: {}, goals: [] });
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch memory" });
  }
};

export const updateMemory = async (req, res) => {
  try {
    const { profile, preferences, goals } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (!user.memory) {
      user.memory = { profile: {}, preferences: {}, goals: [] };
    }

    if (profile) {
      for (const [key, val] of Object.entries(profile)) {
        user.memory.profile.set(key, val);
      }
    }
    if (preferences) {
      for (const [key, val] of Object.entries(preferences)) {
        user.memory.preferences.set(key, val);
      }
    }
    if (goals) user.memory.goals = goals;

    await user.save();
    res.json(user.memory);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to update memory" });
  }
};

export const deleteMemoryItem = async (req, res) => {
  try {
    const { category, key } = req.params;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (category === "goals") {
      user.memory.goals = user.memory.goals.filter((_, i) => i !== parseInt(key));
    } else {
      user.memory[category].delete(key);
    }

    await user.save();
    res.json(user.memory);
  } catch (err) {
    res.status(500).json({ msg: "Failed to delete memory item" });
  }
};

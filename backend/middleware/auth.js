/**
 * Auth Middleware
 * 
 * This is like a "Security Guard". Every time the website asks the server
 * for something private (like your chat history), this guard checks to 
 * make sure you are logged in and have a valid "ID card" (token).
 */

import jwt from "jsonwebtoken";


export const authMiddleware = (req, res, next) => {
  let token = req.headers.authorization;

  if (!token) return res.status(401).json({ msg: "No token" });

  // Handle "Bearer <token>" format
  if (token.startsWith("Bearer ")) {
    token = token.split(" ")[1];
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ msg: "Invalid token" });
  }
};

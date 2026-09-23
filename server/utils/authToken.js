import jwt from "jsonwebtoken";

export function signToken(user) {
  // TODO: Sign a 7 day JWT carrying the user id with JWT_SECRET.
  const secret = process.env.JWT_SECRET || "replace-me";
  const userId = user._id || user.id;
  return jwt.sign({ id: userId, email: user.email }, secret, { expiresIn: "7d" });
}

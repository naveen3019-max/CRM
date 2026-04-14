import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function signAccessToken(user) {
  return jwt.sign(
    {
      role: user.role,
      email: user.email
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
      subject: String(user.id)
    }
  );
}

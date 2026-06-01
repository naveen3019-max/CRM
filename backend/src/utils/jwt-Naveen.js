import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { normalizeRole } from "./roleUtils.js";

export function signAccessToken(user) {
  return jwt.sign(
    {
      role: normalizeRole(user.role),
      email: user.email
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
      subject: String(user.id)
    }
  );
}

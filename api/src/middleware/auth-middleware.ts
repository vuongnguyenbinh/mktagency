import type { Context, Next } from "hono";
import { sign, verify } from "hono/jwt";

export const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

// JWT auth middleware for protected routes
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ success: false, message: "Unauthorized" }, 401);
  }
  try {
    const payload = await verify(authHeader.slice(7), JWT_SECRET, "HS256");
    c.set("user", payload);
    await next();
  } catch {
    return c.json({ success: false, message: "Invalid token" }, 401);
  }
}

export { sign, verify };

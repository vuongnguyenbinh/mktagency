import type { Context, Next } from "hono";
import { sign, verify } from "hono/jwt";

export const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

// JWT auth middleware for protected routes
// Accepts token from "Authorization: Bearer <t>" header OR "?token=<t>" query (needed for <img> tags)
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  const headerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const queryToken = c.req.query("token");
  const token = headerToken || queryToken;
  if (!token) {
    return c.json({ success: false, message: "Unauthorized" }, 401);
  }
  try {
    const payload = await verify(token, JWT_SECRET, "HS256");
    // Reject public catalog tokens — they must not access admin endpoints
    if ((payload as any).type === "public") {
      return c.json({ success: false, message: "Invalid token type" }, 401);
    }
    c.set("user", payload);
    await next();
  } catch {
    return c.json({ success: false, message: "Invalid token" }, 401);
  }
}

export { sign, verify };

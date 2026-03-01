import { Hono } from "hono";
import sql from "../db";
import { authMiddleware, sign, JWT_SECRET } from "../middleware/auth-middleware";

const auth = new Hono();

// Login with email + password
auth.post("/login", async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) {
    return c.json({ success: false, message: "Email và mật khẩu là bắt buộc" }, 400);
  }

  const rows = await sql`
    SELECT * FROM nhan_vien
    WHERE email = ${email} AND trang_thai = 'Hoat dong'
  `;
  const user = rows[0];
  if (!user || !user.password_hash) {
    return c.json({ success: false, message: "Sai thông tin đăng nhập" }, 401);
  }

  const valid = await Bun.password.verify(password, user.password_hash as string);
  if (!valid) {
    return c.json({ success: false, message: "Sai mật khẩu" }, 401);
  }

  const token = await sign(
    { ma_nv: user.ma_nv, email: user.email, quyen: user.quyen, exp: Math.floor(Date.now() / 1000) + 86400 },
    JWT_SECRET,
  );
  return c.json({ success: true, data: { token, user: { ma_nv: user.ma_nv, email: user.email, ho_ten: user.ho_ten, quyen: user.quyen } } });
});

// Get current user (JWT-protected)
auth.get("/user", authMiddleware, async (c) => {
  const { ma_nv } = c.get("user") as { ma_nv: string };
  const rows = await sql`SELECT * FROM nhan_vien WHERE ma_nv = ${ma_nv}`;
  if (!rows[0]) {
    return c.json({ success: false, message: "User not found" }, 404);
  }
  return c.json({ success: true, data: rows[0] });
});

export default auth;

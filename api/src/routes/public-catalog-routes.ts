import { Hono, type Context } from "hono";
import { existsSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import sql from "../db";
import { JWT_SECRET, sign, verify } from "../middleware/auth-middleware";
import { generateId } from "../utils/generate-id";

const publicCatalog = new Hono();

const UPLOAD_DIR = join(import.meta.dir, "../../uploads/locations");

// In-memory rate limit for register-ctv (5 req / hour / IP). Reset on process restart — KISS.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

function getClientIp(c: Context): string {
  const xff = c.req.header("x-forwarded-for");
  return (
    c.req.header("cf-connecting-ip") ||
    xff?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// Verify public JWT — accepts Authorization header OR ?token= query (needed for <img> tags)
async function verifyPublicToken(c: Context): Promise<Response | null> {
  const auth = c.req.header("Authorization");
  const headerToken = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const queryToken = c.req.query("token");
  const token = headerToken || queryToken;
  if (!token) return c.json({ success: false, message: "Unauthorized" }, 401);
  try {
    const payload = await verify(token, JWT_SECRET, "HS256");
    if ((payload as any).type !== "public") {
      return c.json({ success: false, message: "Invalid token type" }, 401);
    }
    return null;
  } catch {
    return c.json({ success: false, message: "Invalid token" }, 401);
  }
}

// POST /api/public/register-ctv — public form submission
publicCatalog.post("/register-ctv", async (c) => {
  const body = await c.req.json().catch(() => ({}));

  // Honeypot — bots fill all fields; humans don't see _hp
  if (body._hp) {
    return c.json({ success: false, message: "Invalid submission" }, 400);
  }

  const ip = getClientIp(c);
  if (!checkRateLimit(ip)) {
    return c.json({ success: false, message: "Quá nhiều yêu cầu, vui lòng thử lại sau" }, 429);
  }

  const { ho_ten, sdt, email, cccd, dia_chi, ngan_hang, so_tk, chu_tk, ghi_chu } = body;
  if (!ho_ten?.trim() || !sdt?.trim()) {
    return c.json({ success: false, message: "Họ tên và SĐT là bắt buộc" }, 400);
  }

  const maCtv = await generateId("cong_tac_vien", "ma_ctv", "CTV");
  try {
    await sql`
      INSERT INTO cong_tac_vien (ma_ctv, ho_ten, sdt, email, cccd, dia_chi, ngan_hang, so_tk, chu_tk, ghi_chu)
      VALUES (${maCtv}, ${ho_ten.trim()}, ${sdt.trim()}, ${email || null}, ${cccd || null},
              ${dia_chi || null}, ${ngan_hang || null}, ${so_tk || null}, ${chu_tk || null}, ${ghi_chu || null})
    `;
  } catch (e: any) {
    if (e.code === "23505" || e.message?.includes("duplicate key")) {
      return c.json({ success: false, message: "SĐT đã đăng ký trước đó" }, 409);
    }
    throw e;
  }
  return c.json({ success: true, message: "Đăng ký thành công", data: { ma_ctv: maCtv } });
});

// POST /api/public/verify-password — exchange shared password for short-lived JWT
publicCatalog.post("/verify-password", async (c) => {
  const { password } = await c.req.json().catch(() => ({}));
  const expected = process.env.PUBLIC_CATALOG_PASSWORD;
  if (!expected) {
    console.error("PUBLIC_CATALOG_PASSWORD env not set");
    return c.json({ success: false, message: "Server chưa cấu hình" }, 500);
  }
  if (password !== expected) {
    return c.json({ success: false, message: "Sai mật khẩu" }, 401);
  }
  const token = await sign(
    { type: "public", exp: Math.floor(Date.now() / 1000) + 7 * 86400 },
    JWT_SECRET,
  );
  return c.json({ success: true, data: { token } });
});

// GET /api/public/products — catalog list (filtered, no sensitive cols)
publicCatalog.get("/products", async (c) => {
  const fail = await verifyPublicToken(c);
  if (fail) return fail;

  const rows = await sql`
    SELECT ma_dd, ten_hien_thi, toa_nha, dia_chi, tang, phong, dien_tich,
           gia_thue, phi_dich_vu, mo_ta, tien_ich, trang_thai
    FROM dia_diem
    WHERE hien_thi_public = true
    ORDER BY toa_nha, tang, phong
  `;

  // Attach image filenames for each location
  const data = rows.map((r: any) => {
    const dir = join(UPLOAD_DIR, r.ma_dd);
    let images: string[] = [];
    if (existsSync(dir)) {
      try {
        images = readdirSync(dir).filter((name) => statSync(join(dir, name)).isFile());
      } catch {
        images = [];
      }
    }
    return { ...r, images };
  });

  return c.json({ success: true, data, total: data.length });
});

// GET /api/public/products/:id/images/:filename — serve image (token via header or ?token=)
publicCatalog.get("/products/:id/images/:filename", async (c) => {
  const fail = await verifyPublicToken(c);
  if (fail) return fail;

  const id = c.req.param("id");
  const filename = c.req.param("filename");

  // Path traversal guard
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return c.json({ success: false, message: "Invalid filename" }, 400);
  }
  if (id.includes("..") || id.includes("/")) {
    return c.json({ success: false, message: "Invalid id" }, 400);
  }

  const filepath = join(UPLOAD_DIR, id, filename);
  if (!existsSync(filepath)) {
    return c.json({ success: false, message: "File not found" }, 404);
  }

  const ext = extname(filename).toLowerCase();
  const contentType =
    ext === ".png" ? "image/png" :
    ext === ".gif" ? "image/gif" :
    ext === ".webp" ? "image/webp" :
    "image/jpeg";

  return new Response(Bun.file(filepath), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
});

export default publicCatalog;

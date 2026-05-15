import { Hono } from "hono";
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { extname, join } from "node:path";
import sql from "../db";
import { generateId } from "../utils/generate-id";

const locations = new Hono();

const UPLOAD_DIR = join(import.meta.dir, "../../uploads/locations");
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
const ALLOWED_IMG_EXT = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
const MAX_IMG_SIZE = 5 * 1024 * 1024;

// List locations grouped by building
locations.get("/", async (c) => {
  const rows = await sql`
    SELECT
      toa_nha as ten,
      MIN(dia_chi) as "diaChi",
      COUNT(*)::int as "tongPhong",
      SUM(CASE WHEN trang_thai = 'Trống' THEN 1 ELSE 0 END)::int as trong,
      SUM(CASE WHEN trang_thai = 'Đang thuê' THEN 1 ELSE 0 END)::int as "dangThue",
      SUM(CASE WHEN trang_thai = 'Giữ chỗ' THEN 1 ELSE 0 END)::int as "giuCho"
    FROM dia_diem
    GROUP BY toa_nha
    ORDER BY toa_nha
  `;
  return c.json({ success: true, data: rows });
});

// All locations flat (for GAS sync)
locations.get("/all", async (c) => {
  const rows = await sql`SELECT * FROM dia_diem ORDER BY toa_nha, tang, phong`;
  return c.json({ success: true, data: rows, total: rows.length });
});

// Export locations as CSV (must be before /:toaNha to avoid route conflict)
locations.get("/export/csv", async (c) => {
  const rows = await sql`SELECT * FROM dia_diem ORDER BY toa_nha, tang, phong`;
  const headers = ["ma_dd", "toa_nha", "dia_chi", "tang", "phong", "ten_hien_thi", "dien_tich", "gia_thue", "phi_dich_vu", "trang_thai", "ghi_chu"];
  const BOM = "\uFEFF";
  const csv = BOM + [headers.join(","), ...rows.map((r: any) =>
    headers.map((h) => `"${(r[h] ?? "").toString().replace(/"/g, '""')}"`).join(",")
  )].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=dia-diem-${new Date().toISOString().split("T")[0]}.csv`,
    },
  });
});

// Location detail — all rooms in a building
locations.get("/:toaNha", async (c) => {
  const toaNha = decodeURIComponent(c.req.param("toaNha"));
  const rows = await sql`
    SELECT * FROM dia_diem WHERE toa_nha = ${toaNha} ORDER BY tang, phong
  `;
  return c.json({ success: true, data: rows });
});

// Create location
locations.post("/", async (c) => {
  const body = await c.req.json();
  const maDd = await generateId("dia_diem", "ma_dd", "DD");

  await sql`
    INSERT INTO dia_diem (
      ma_dd, toa_nha, dia_chi, tang, phong, ten_hien_thi,
      dien_tich, gia_thue, phi_dich_vu, trang_thai, ghi_chu,
      mo_ta, tien_ich, hien_thi_public
    ) VALUES (
      ${maDd}, ${body.toaNha}, ${body.diaChi || null},
      ${body.tang || null}, ${body.phong || null}, ${body.tenHienThi || null},
      ${body.dienTich || null}, ${body.giaThue || null}, ${body.phiDichVu || null},
      ${body.trangThai || "Trống"}, ${body.ghiChu || null},
      ${body.moTa || null}, ${body.tienIch || null}, ${body.hienThiPublic !== false}
    )
  `;
  return c.json({ success: true, message: "Them dia diem thanh cong", data: { maDd } });
});

// Update location
locations.put("/:id", async (c) => {
  const maDd = c.req.param("id");
  const body = await c.req.json();

  const existing = await sql`SELECT ma_dd FROM dia_diem WHERE ma_dd = ${maDd}`;
  if (existing.length === 0) {
    return c.json({ success: false, message: "Dia diem khong ton tai" }, 404);
  }

  await sql`
    UPDATE dia_diem SET
      toa_nha = ${body.toaNha}, dia_chi = ${body.diaChi || null},
      tang = ${body.tang || null}, phong = ${body.phong || null},
      ten_hien_thi = ${body.tenHienThi || null},
      dien_tich = ${body.dienTich || null}, gia_thue = ${body.giaThue || null},
      phi_dich_vu = ${body.phiDichVu || null}, trang_thai = ${body.trangThai || null},
      ghi_chu = ${body.ghiChu || null},
      mo_ta = ${body.moTa || null}, tien_ich = ${body.tienIch || null},
      hien_thi_public = ${body.hienThiPublic !== false},
      ngay_cap_nhat = NOW()
    WHERE ma_dd = ${maDd}
  `;
  return c.json({ success: true, message: "Cap nhat dia diem thanh cong" });
});

// Upload image for a location (multipart/form-data, field "file")
locations.post("/:id/images", async (c) => {
  const maDd = c.req.param("id");
  const existing = await sql`SELECT ma_dd FROM dia_diem WHERE ma_dd = ${maDd}`;
  if (existing.length === 0) return c.json({ success: false, message: "Địa điểm không tồn tại" }, 404);

  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return c.json({ success: false, message: "No file uploaded" }, 400);

  const ext = extname(file.name).toLowerCase();
  if (!ALLOWED_IMG_EXT.includes(ext)) {
    return c.json({ success: false, message: "Chỉ chấp nhận ảnh JPG/PNG/GIF/WEBP" }, 400);
  }
  if (file.size > MAX_IMG_SIZE) {
    return c.json({ success: false, message: "Ảnh vượt quá 5MB" }, 400);
  }

  const locDir = join(UPLOAD_DIR, maDd);
  if (!existsSync(locDir)) mkdirSync(locDir, { recursive: true });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${Date.now()}_${safeName}`;
  await Bun.write(join(locDir, filename), file);

  return c.json({ success: true, message: "Upload thành công", data: { filename, size: file.size, type: file.type } });
});

// List images for a location
locations.get("/:id/images", async (c) => {
  const maDd = c.req.param("id");
  const locDir = join(UPLOAD_DIR, maDd);
  if (!existsSync(locDir)) return c.json({ success: true, data: [] });

  const files = readdirSync(locDir).map((name) => {
    const stat = statSync(join(locDir, name));
    const displayName = name.replace(/^\d+_/, "");
    return { filename: name, displayName, size: stat.size, uploadedAt: stat.mtime.toISOString() };
  });
  return c.json({ success: true, data: files });
});

// Serve a location image (path-traversal guarded; supports ?token= via global authMiddleware)
locations.get("/:id/images/:filename", async (c) => {
  const maDd = c.req.param("id");
  const filename = c.req.param("filename");
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return c.json({ success: false, message: "Invalid filename" }, 400);
  }
  const filepath = join(UPLOAD_DIR, maDd, filename);
  if (!existsSync(filepath)) return c.json({ success: false, message: "File not found" }, 404);

  const ext = extname(filename).toLowerCase();
  const contentType =
    ext === ".png" ? "image/png" :
    ext === ".gif" ? "image/gif" :
    ext === ".webp" ? "image/webp" :
    "image/jpeg";
  return new Response(Bun.file(filepath), {
    headers: { "Content-Type": contentType, "Content-Disposition": `inline; filename="${filename}"` },
  });
});

// Delete a location image
locations.delete("/:id/images/:filename", async (c) => {
  const maDd = c.req.param("id");
  const filename = c.req.param("filename");
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return c.json({ success: false, message: "Invalid filename" }, 400);
  }
  const filepath = join(UPLOAD_DIR, maDd, filename);
  if (!existsSync(filepath)) return c.json({ success: false, message: "File not found" }, 404);
  unlinkSync(filepath);
  return c.json({ success: true, message: "Xóa ảnh thành công" });
});

// Delete location
locations.delete("/:id", async (c) => {
  const maDd = c.req.param("id");
  const existing = await sql`SELECT ma_dd FROM dia_diem WHERE ma_dd = ${maDd}`;
  if (existing.length === 0) {
    return c.json({ success: false, message: "Dia diem khong ton tai" }, 404);
  }
  await sql`DELETE FROM dia_diem WHERE ma_dd = ${maDd}`;
  return c.json({ success: true, message: "Xoa dia diem thanh cong" });
});

export default locations;

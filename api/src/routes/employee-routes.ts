import { Hono } from "hono";
import sql from "../db";
import { generateId } from "../utils/generate-id";

const employees = new Hono();

// List all employees (including inactive for admin management)
employees.get("/", async (c) => {
  const rows = await sql`
    SELECT ma_nv, email, ho_ten, quyen, trang_thai, ngay_tao
    FROM nhan_vien
    ORDER BY ma_nv
  `;
  return c.json({ success: true, data: rows, total: rows.length });
});

// Create employee
employees.post("/", async (c) => {
  const body = await c.req.json();
  if (!body.email || !body.hoTen) {
    return c.json({ success: false, message: "Email và họ tên là bắt buộc" }, 400);
  }

  // Check duplicate email
  const existing = await sql`SELECT ma_nv FROM nhan_vien WHERE email = ${body.email}`;
  if (existing.length > 0) {
    return c.json({ success: false, message: "Email đã tồn tại" }, 400);
  }

  const maNv = await generateId("nhan_vien", "ma_nv", "NV");
  let passwordHash = null;
  if (body.password) {
    passwordHash = await Bun.password.hash(body.password, { algorithm: "argon2id" });
  }

  await sql`
    INSERT INTO nhan_vien (ma_nv, email, ho_ten, quyen, trang_thai, password_hash)
    VALUES (${maNv}, ${body.email}, ${body.hoTen}, ${body.quyen || "Sale"}, ${body.trangThai || "Hoat dong"}, ${passwordHash})
  `;
  return c.json({ success: true, message: "Thêm nhân viên thành công", data: { maNv } });
});

// Update employee
employees.put("/:id", async (c) => {
  const maNv = c.req.param("id");
  const body = await c.req.json();

  const existing = await sql`SELECT ma_nv FROM nhan_vien WHERE ma_nv = ${maNv}`;
  if (existing.length === 0) {
    return c.json({ success: false, message: "Nhân viên không tồn tại" }, 404);
  }

  // Check duplicate email (exclude current employee)
  if (body.email) {
    const dup = await sql`SELECT ma_nv FROM nhan_vien WHERE email = ${body.email} AND ma_nv != ${maNv}`;
    if (dup.length > 0) {
      return c.json({ success: false, message: "Email đã tồn tại" }, 400);
    }
  }

  await sql`
    UPDATE nhan_vien SET
      ho_ten = ${body.hoTen || null},
      email = ${body.email || null},
      quyen = ${body.quyen || null},
      trang_thai = ${body.trangThai || null}
    WHERE ma_nv = ${maNv}
  `;

  // Update password if provided
  if (body.password) {
    const hash = await Bun.password.hash(body.password, { algorithm: "argon2id" });
    await sql`UPDATE nhan_vien SET password_hash = ${hash} WHERE ma_nv = ${maNv}`;
  }

  return c.json({ success: true, message: "Cập nhật nhân viên thành công" });
});

// Delete employee
employees.delete("/:id", async (c) => {
  const maNv = c.req.param("id");
  const existing = await sql`SELECT ma_nv FROM nhan_vien WHERE ma_nv = ${maNv}`;
  if (existing.length === 0) {
    return c.json({ success: false, message: "Nhân viên không tồn tại" }, 404);
  }
  await sql`DELETE FROM nhan_vien WHERE ma_nv = ${maNv}`;
  return c.json({ success: true, message: "Xóa nhân viên thành công" });
});

export default employees;

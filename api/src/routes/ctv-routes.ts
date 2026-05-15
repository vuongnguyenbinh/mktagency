import { Hono } from "hono";
import sql from "../db";

const ctv = new Hono();

// List CTV registrations with optional filter + search
ctv.get("/", async (c) => {
  const trangThai = c.req.query("trangThai");
  const search = c.req.query("search");
  let rows;

  if (search && trangThai) {
    const pattern = `%${search}%`;
    rows = await sql`
      SELECT * FROM cong_tac_vien
      WHERE (ho_ten ILIKE ${pattern} OR sdt ILIKE ${pattern} OR email ILIKE ${pattern})
        AND trang_thai = ${trangThai}
      ORDER BY ngay_dang_ky DESC
    `;
  } else if (search) {
    const pattern = `%${search}%`;
    rows = await sql`
      SELECT * FROM cong_tac_vien
      WHERE ho_ten ILIKE ${pattern} OR sdt ILIKE ${pattern} OR email ILIKE ${pattern}
      ORDER BY ngay_dang_ky DESC
    `;
  } else if (trangThai) {
    rows = await sql`SELECT * FROM cong_tac_vien WHERE trang_thai = ${trangThai} ORDER BY ngay_dang_ky DESC`;
  } else {
    rows = await sql`SELECT * FROM cong_tac_vien ORDER BY ngay_dang_ky DESC`;
  }
  return c.json({ success: true, data: rows, total: rows.length });
});

// Get CTV detail
ctv.get("/:id", async (c) => {
  const maCtv = c.req.param("id");
  const rows = await sql`SELECT * FROM cong_tac_vien WHERE ma_ctv = ${maCtv}`;
  if (rows.length === 0) {
    return c.json({ success: false, message: "Không tìm thấy CTV" }, 404);
  }
  return c.json({ success: true, data: rows[0] });
});

// Update CTV (partial — typically trang_thai approval)
ctv.patch("/:id", async (c) => {
  const maCtv = c.req.param("id");
  const body = await c.req.json();

  const existing = await sql`SELECT ma_ctv FROM cong_tac_vien WHERE ma_ctv = ${maCtv}`;
  if (existing.length === 0) {
    return c.json({ success: false, message: "Không tìm thấy CTV" }, 404);
  }

  // Whitelist updatable fields — never allow ma_ctv / ngay_dang_ky changes
  const allowed = ["ho_ten", "sdt", "email", "cccd", "dia_chi", "ngan_hang", "so_tk", "chu_tk", "ghi_chu", "trang_thai"];
  const updates: Record<string, any> = {};
  for (const k of allowed) {
    if (k in body) updates[k] = body[k];
  }
  if (Object.keys(updates).length === 0) {
    return c.json({ success: false, message: "Không có trường nào để cập nhật" }, 400);
  }

  // Build dynamic UPDATE with parameterized values
  const keys = Object.keys(updates);
  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const values = keys.map((k) => updates[k]);
  try {
    await sql.unsafe(`UPDATE cong_tac_vien SET ${setClause} WHERE ma_ctv = $${keys.length + 1}`, [...values, maCtv]);
  } catch (e: any) {
    if (e.code === "23505" || e.message?.includes("duplicate key")) {
      return c.json({ success: false, message: "SĐT đã tồn tại" }, 409);
    }
    throw e;
  }
  return c.json({ success: true, message: "Cập nhật CTV thành công" });
});

// Delete CTV
ctv.delete("/:id", async (c) => {
  const maCtv = c.req.param("id");
  const existing = await sql`SELECT ma_ctv FROM cong_tac_vien WHERE ma_ctv = ${maCtv}`;
  if (existing.length === 0) {
    return c.json({ success: false, message: "Không tìm thấy CTV" }, 404);
  }
  await sql`DELETE FROM cong_tac_vien WHERE ma_ctv = ${maCtv}`;
  return c.json({ success: true, message: "Xóa CTV thành công" });
});

export default ctv;

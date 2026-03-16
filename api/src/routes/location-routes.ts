import { Hono } from "hono";
import sql from "../db";
import { generateId } from "../utils/generate-id";

const locations = new Hono();

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
      dien_tich, gia_thue, phi_dich_vu, trang_thai, ghi_chu
    ) VALUES (
      ${maDd}, ${body.toaNha}, ${body.diaChi || null},
      ${body.tang || null}, ${body.phong || null}, ${body.tenHienThi || null},
      ${body.dienTich || null}, ${body.giaThue || null}, ${body.phiDichVu || null},
      ${body.trangThai || "Trống"}, ${body.ghiChu || null}
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
      ghi_chu = ${body.ghiChu || null}, ngay_cap_nhat = NOW()
    WHERE ma_dd = ${maDd}
  `;
  return c.json({ success: true, message: "Cap nhat dia diem thanh cong" });
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

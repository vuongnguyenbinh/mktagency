import { Hono } from "hono";
import sql from "../db";
import { generateId } from "../utils/generate-id";

const opportunities = new Hono();

// List opportunities with optional filters
opportunities.get("/", async (c) => {
  const { giaiDoan, phuTrach, search } = c.req.query();
  const conditions: string[] = [];
  const values: any = {};

  let query = "SELECT * FROM co_hoi WHERE 1=1";

  // Build dynamic query using tagged templates with conditions
  if (giaiDoan && phuTrach && search) {
    const pattern = `%${search}%`;
    const rows = await sql`
      SELECT * FROM co_hoi
      WHERE giai_doan = ${giaiDoan} AND phu_trach = ${phuTrach}
        AND (ten_kh ILIKE ${pattern} OR ten_cong_ty ILIKE ${pattern} OR sdt ILIKE ${pattern})
      ORDER BY ngay_tao DESC
    `;
    return c.json({ success: true, data: rows, total: rows.length });
  }
  if (giaiDoan && phuTrach) {
    const rows = await sql`
      SELECT * FROM co_hoi WHERE giai_doan = ${giaiDoan} AND phu_trach = ${phuTrach}
      ORDER BY ngay_tao DESC
    `;
    return c.json({ success: true, data: rows, total: rows.length });
  }
  if (giaiDoan && search) {
    const pattern = `%${search}%`;
    const rows = await sql`
      SELECT * FROM co_hoi
      WHERE giai_doan = ${giaiDoan}
        AND (ten_kh ILIKE ${pattern} OR ten_cong_ty ILIKE ${pattern} OR sdt ILIKE ${pattern})
      ORDER BY ngay_tao DESC
    `;
    return c.json({ success: true, data: rows, total: rows.length });
  }
  if (phuTrach && search) {
    const pattern = `%${search}%`;
    const rows = await sql`
      SELECT * FROM co_hoi
      WHERE phu_trach = ${phuTrach}
        AND (ten_kh ILIKE ${pattern} OR ten_cong_ty ILIKE ${pattern} OR sdt ILIKE ${pattern})
      ORDER BY ngay_tao DESC
    `;
    return c.json({ success: true, data: rows, total: rows.length });
  }
  if (giaiDoan) {
    const rows = await sql`SELECT * FROM co_hoi WHERE giai_doan = ${giaiDoan} ORDER BY ngay_tao DESC`;
    return c.json({ success: true, data: rows, total: rows.length });
  }
  if (phuTrach) {
    const rows = await sql`SELECT * FROM co_hoi WHERE phu_trach = ${phuTrach} ORDER BY ngay_tao DESC`;
    return c.json({ success: true, data: rows, total: rows.length });
  }
  if (search) {
    const pattern = `%${search}%`;
    const rows = await sql`
      SELECT * FROM co_hoi
      WHERE ten_kh ILIKE ${pattern} OR ten_cong_ty ILIKE ${pattern} OR sdt ILIKE ${pattern}
      ORDER BY ngay_tao DESC
    `;
    return c.json({ success: true, data: rows, total: rows.length });
  }

  const rows = await sql`SELECT * FROM co_hoi ORDER BY ngay_tao DESC`;
  return c.json({ success: true, data: rows, total: rows.length });
});

// Create opportunity
opportunities.post("/", async (c) => {
  const body = await c.req.json();
  const maCh = await generateId("co_hoi", "ma_ch", "CH");
  const now = new Date().toISOString();

  await sql`
    INSERT INTO co_hoi (
      ma_ch, ma_kh, ten_kh, sdt, ten_cong_ty, mst,
      nhu_cau_dt, ngan_sach, khu_vuc, dd_quan_tam,
      giai_doan, danh_gia, phu_trach, lich_su_tu_van,
      ngay_tao, ngay_cap_nhat
    ) VALUES (
      ${maCh}, ${body.maKh || null}, ${body.tenKh}, ${body.sdt || null},
      ${body.tenCongTy || null}, ${body.mst || null},
      ${body.nhuCauDt || null}, ${body.nganSach || null},
      ${body.khuVuc || null}, ${body.ddQuanTam || null},
      ${"Moi"}, ${body.danhGia || "Suy nghi"},
      ${body.phuTrach || "SYSTEM"},
      ${`[${new Date().toLocaleDateString("vi-VN")}] Tao moi`},
      ${now}, ${now}
    )
  `;
  return c.json({ success: true, message: "Them co hoi thanh cong", data: { maCh } });
});

// Update opportunity
opportunities.put("/:id", async (c) => {
  const maCh = c.req.param("id");
  const body = await c.req.json();

  const existing = await sql`SELECT ma_ch FROM co_hoi WHERE ma_ch = ${maCh}`;
  if (existing.length === 0) {
    return c.json({ success: false, message: "Co hoi khong ton tai" }, 404);
  }

  const now = new Date().toISOString();
  await sql`
    UPDATE co_hoi SET
      ten_kh = ${body.tenKh}, sdt = ${body.sdt || null},
      ten_cong_ty = ${body.tenCongTy || null}, mst = ${body.mst || null},
      nhu_cau_dt = ${body.nhuCauDt || null}, ngan_sach = ${body.nganSach || null},
      khu_vuc = ${body.khuVuc || null}, dd_quan_tam = ${body.ddQuanTam || null},
      giai_doan = ${body.giaiDoan}, danh_gia = ${body.danhGia || null},
      phu_trach = ${body.phuTrach || null}, lich_su_tu_van = ${body.lichSuTuVan || null},
      ly_do_that_bai = ${body.lyDoThatBai || null}, ngay_cap_nhat = ${now}
    WHERE ma_ch = ${maCh}
  `;

  // Set success/failure date if stage changed
  if (body.giaiDoan === "Thanh cong") {
    await sql`UPDATE co_hoi SET ngay_thanh_cong = ${now} WHERE ma_ch = ${maCh}`;
  } else if (body.giaiDoan === "That bai") {
    await sql`UPDATE co_hoi SET ngay_that_bai = ${now} WHERE ma_ch = ${maCh}`;
  }

  return c.json({ success: true, message: "Cap nhat co hoi thanh cong" });
});

// Export opportunities as CSV
opportunities.get("/export/csv", async (c) => {
  const rows = await sql`SELECT * FROM co_hoi ORDER BY ngay_tao DESC`;
  const headers = ["ma_ch", "ma_kh", "ten_kh", "sdt", "ten_cong_ty", "mst", "nhu_cau_dt", "ngan_sach", "khu_vuc", "dd_quan_tam", "giai_doan", "danh_gia", "phu_trach", "ngay_tao"];
  const BOM = "\uFEFF";
  const csv = BOM + [headers.join(","), ...rows.map((r: any) =>
    headers.map((h) => `"${(r[h] ?? "").toString().replace(/"/g, '""')}"`).join(",")
  )].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=co-hoi-${new Date().toISOString().split("T")[0]}.csv`,
    },
  });
});

// Delete opportunity
opportunities.delete("/:id", async (c) => {
  const maCh = c.req.param("id");
  const existing = await sql`SELECT ma_ch FROM co_hoi WHERE ma_ch = ${maCh}`;
  if (existing.length === 0) {
    return c.json({ success: false, message: "Co hoi khong ton tai" }, 404);
  }
  await sql`DELETE FROM co_hoi WHERE ma_ch = ${maCh}`;
  return c.json({ success: true, message: "Xoa co hoi thanh cong" });
});

export default opportunities;

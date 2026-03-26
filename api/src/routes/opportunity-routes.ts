import { Hono } from "hono";
import sql from "../db";
import { generateId } from "../utils/generate-id";

const opportunities = new Hono();

// List opportunities with LEFT JOIN to resolve phu_trach (ma_nv) → ho_ten
opportunities.get("/", async (c) => {
  const { giaiDoan, phuTrach, search } = c.req.query();
  const pattern = search ? `%${search}%` : null;

  let rows;
  if (giaiDoan && phuTrach && pattern) {
    rows = await sql`
      SELECT co_hoi.*, nv.ho_ten as ten_phu_trach
      FROM co_hoi LEFT JOIN nhan_vien nv ON co_hoi.phu_trach = nv.ma_nv
      WHERE giai_doan = ${giaiDoan} AND co_hoi.phu_trach = ${phuTrach}
        AND (ten_kh ILIKE ${pattern} OR ten_cong_ty ILIKE ${pattern} OR sdt ILIKE ${pattern})
      ORDER BY ngay_tao DESC`;
  } else if (giaiDoan && phuTrach) {
    rows = await sql`
      SELECT co_hoi.*, nv.ho_ten as ten_phu_trach
      FROM co_hoi LEFT JOIN nhan_vien nv ON co_hoi.phu_trach = nv.ma_nv
      WHERE giai_doan = ${giaiDoan} AND co_hoi.phu_trach = ${phuTrach}
      ORDER BY ngay_tao DESC`;
  } else if (giaiDoan && pattern) {
    rows = await sql`
      SELECT co_hoi.*, nv.ho_ten as ten_phu_trach
      FROM co_hoi LEFT JOIN nhan_vien nv ON co_hoi.phu_trach = nv.ma_nv
      WHERE giai_doan = ${giaiDoan}
        AND (ten_kh ILIKE ${pattern} OR ten_cong_ty ILIKE ${pattern} OR sdt ILIKE ${pattern})
      ORDER BY ngay_tao DESC`;
  } else if (phuTrach && pattern) {
    rows = await sql`
      SELECT co_hoi.*, nv.ho_ten as ten_phu_trach
      FROM co_hoi LEFT JOIN nhan_vien nv ON co_hoi.phu_trach = nv.ma_nv
      WHERE co_hoi.phu_trach = ${phuTrach}
        AND (ten_kh ILIKE ${pattern} OR ten_cong_ty ILIKE ${pattern} OR sdt ILIKE ${pattern})
      ORDER BY ngay_tao DESC`;
  } else if (giaiDoan) {
    rows = await sql`
      SELECT co_hoi.*, nv.ho_ten as ten_phu_trach
      FROM co_hoi LEFT JOIN nhan_vien nv ON co_hoi.phu_trach = nv.ma_nv
      WHERE giai_doan = ${giaiDoan} ORDER BY ngay_tao DESC`;
  } else if (phuTrach) {
    rows = await sql`
      SELECT co_hoi.*, nv.ho_ten as ten_phu_trach
      FROM co_hoi LEFT JOIN nhan_vien nv ON co_hoi.phu_trach = nv.ma_nv
      WHERE co_hoi.phu_trach = ${phuTrach} ORDER BY ngay_tao DESC`;
  } else if (pattern) {
    rows = await sql`
      SELECT co_hoi.*, nv.ho_ten as ten_phu_trach
      FROM co_hoi LEFT JOIN nhan_vien nv ON co_hoi.phu_trach = nv.ma_nv
      WHERE ten_kh ILIKE ${pattern} OR ten_cong_ty ILIKE ${pattern} OR sdt ILIKE ${pattern}
      ORDER BY ngay_tao DESC`;
  } else {
    rows = await sql`
      SELECT co_hoi.*, nv.ho_ten as ten_phu_trach
      FROM co_hoi LEFT JOIN nhan_vien nv ON co_hoi.phu_trach = nv.ma_nv
      ORDER BY ngay_tao DESC`;
  }

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
      ${"Mới"}, ${body.danhGia || "Suy nghĩ"},
      ${body.phuTrach || null},
      ${`[${new Date().toLocaleDateString("vi-VN")}] Tao moi`},
      ${now}, ${now}
    )
  `;

  // Auto-update customer status when linked to an opportunity
  if (body.maKh) {
    await sql`
      UPDATE khach_hang SET trang_thai = 'Đã gán cơ hội'
      WHERE ma_kh = ${body.maKh} AND (trang_thai = 'Mới' OR trang_thai IS NULL)
    `;
  }

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
  if (body.giaiDoan === "Thành công") {
    await sql`UPDATE co_hoi SET ngay_thanh_cong = ${now} WHERE ma_ch = ${maCh}`;
  } else if (body.giaiDoan === "Thất bại") {
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

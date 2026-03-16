import { Hono } from "hono";
import sql from "../db";
import { generateId } from "../utils/generate-id";

const n8n = new Hono();

// n8n webhook: create or update customer
n8n.post("/customer", async (c) => {
  const body = await c.req.json();
  const { hoTen, sdt, email, congTy, nguon, ghiChu } = body;

  if (!hoTen) {
    return c.json({ success: false, message: "hoTen is required" }, 400);
  }

  // Check for existing customer by phone
  if (sdt) {
    const existing = await sql`SELECT ma_kh FROM khach_hang WHERE sdt = ${sdt}`;
    if (existing.length > 0) {
      // Update existing customer
      const maKh = existing[0].ma_kh;
      await sql`
        UPDATE khach_hang SET
          ho_ten = ${hoTen}, email = ${email || null},
          cong_ty = ${congTy || null}, nguon = ${nguon || null},
          ghi_chu = ${ghiChu || null}
        WHERE ma_kh = ${maKh}
      `;
      return c.json({ success: true, action: "updated", data: { maKh } });
    }
  }

  // Create new customer
  const maKh = await generateId("khach_hang", "ma_kh", "KH");
  await sql`
    INSERT INTO khach_hang (ma_kh, ho_ten, sdt, email, cong_ty, nguon, ghi_chu)
    VALUES (${maKh}, ${hoTen}, ${sdt || null}, ${email || null},
            ${congTy || null}, ${nguon || "n8n"}, ${ghiChu || null})
  `;
  return c.json({ success: true, action: "created", data: { maKh } });
});

// n8n webhook: create opportunity
n8n.post("/opportunity", async (c) => {
  const body = await c.req.json();
  const { tenKh, sdt, tenCongTy, nhuCauDt, nganSach, khuVuc, giaiDoan, danhGia, phuTrach } = body;

  if (!tenKh) {
    return c.json({ success: false, message: "tenKh is required" }, 400);
  }

  const maCh = await generateId("co_hoi", "ma_ch", "CH");
  const now = new Date().toISOString();
  await sql`
    INSERT INTO co_hoi (
      ma_ch, ma_kh, ten_kh, sdt, ten_cong_ty, mst,
      nhu_cau_dt, ngan_sach, khu_vuc, dd_quan_tam,
      giai_doan, danh_gia, phu_trach, lich_su_tu_van,
      ngay_tao, ngay_cap_nhat
    ) VALUES (
      ${maCh}, ${body.maKh || null}, ${tenKh}, ${sdt || null},
      ${tenCongTy || null}, ${body.mst || null},
      ${nhuCauDt || null}, ${nganSach || null},
      ${khuVuc || null}, ${body.ddQuanTam || null},
      ${giaiDoan || "Mới"}, ${danhGia || "Suy nghĩ"},
      ${phuTrach || "n8n"},
      ${`[${new Date().toLocaleDateString("vi-VN")}] Tạo từ n8n`},
      ${now}, ${now}
    )
  `;
  return c.json({ success: true, action: "created", data: { maCh } });
});

// n8n webhook: update opportunity stage
n8n.put("/opportunity/:id/stage", async (c) => {
  const maCh = c.req.param("id");
  const { giaiDoan, ghiChu } = await c.req.json();

  if (!giaiDoan) {
    return c.json({ success: false, message: "giaiDoan is required" }, 400);
  }

  const existing = await sql`SELECT ma_ch, lich_su_tu_van FROM co_hoi WHERE ma_ch = ${maCh}`;
  if (existing.length === 0) {
    return c.json({ success: false, message: "Opportunity not found" }, 404);
  }

  const now = new Date().toISOString();
  const logEntry = `[${new Date().toLocaleDateString("vi-VN")}] n8n: ${giaiDoan}${ghiChu ? " - " + ghiChu : ""}`;
  const lichSu = existing[0].lich_su_tu_van
    ? existing[0].lich_su_tu_van + "\n" + logEntry
    : logEntry;

  await sql`
    UPDATE co_hoi SET
      giai_doan = ${giaiDoan}, lich_su_tu_van = ${lichSu}, ngay_cap_nhat = ${now}
    WHERE ma_ch = ${maCh}
  `;

  if (giaiDoan === "Thành công") {
    await sql`UPDATE co_hoi SET ngay_thanh_cong = ${now} WHERE ma_ch = ${maCh}`;
  } else if (giaiDoan === "Thất bại") {
    await sql`UPDATE co_hoi SET ngay_that_bai = ${now} WHERE ma_ch = ${maCh}`;
  }

  return c.json({ success: true, message: "Stage updated" });
});

// n8n webhook: update location status
n8n.put("/location/:id/status", async (c) => {
  const maDd = c.req.param("id");
  const { trangThai } = await c.req.json();

  const valid = ["Trống", "Đang thuê", "Giữ chỗ"];
  if (!trangThai || !valid.includes(trangThai)) {
    return c.json({ success: false, message: `trangThai must be one of: ${valid.join(", ")}` }, 400);
  }

  const existing = await sql`SELECT ma_dd FROM dia_diem WHERE ma_dd = ${maDd}`;
  if (existing.length === 0) {
    return c.json({ success: false, message: "Location not found" }, 404);
  }

  await sql`UPDATE dia_diem SET trang_thai = ${trangThai}, ngay_cap_nhat = NOW() WHERE ma_dd = ${maDd}`;
  return c.json({ success: true, message: "Status updated" });
});

// n8n webhook: bulk update locations
n8n.post("/locations/bulk-status", async (c) => {
  const { updates } = await c.req.json();
  if (!Array.isArray(updates)) {
    return c.json({ success: false, message: "updates must be an array" }, 400);
  }

  const results: { maDd: string; success: boolean; message?: string }[] = [];
  for (const u of updates) {
    try {
      await sql`UPDATE dia_diem SET trang_thai = ${u.trangThai}, ngay_cap_nhat = NOW() WHERE ma_dd = ${u.maDd}`;
      results.push({ maDd: u.maDd, success: true });
    } catch (e: any) {
      results.push({ maDd: u.maDd, success: false, message: e.message });
    }
  }
  return c.json({ success: true, data: results });
});

export default n8n;

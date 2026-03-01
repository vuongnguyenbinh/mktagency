import { Hono } from "hono";
import sql from "../db";
import { generateId } from "../utils/generate-id";

const contracts = new Hono();

// List contracts with optional filters
contracts.get("/", async (c) => {
  const { trangThai, search } = c.req.query();

  if (trangThai && search) {
    const pattern = `%${search}%`;
    const rows = await sql`
      SELECT * FROM hop_dong
      WHERE trang_thai = ${trangThai}
        AND (ten_ben_thue ILIKE ${pattern} OR dia_diem ILIKE ${pattern})
      ORDER BY ngay_tao DESC
    `;
    return c.json({ success: true, data: rows, total: rows.length });
  }
  if (trangThai) {
    const rows = await sql`SELECT * FROM hop_dong WHERE trang_thai = ${trangThai} ORDER BY ngay_tao DESC`;
    return c.json({ success: true, data: rows, total: rows.length });
  }
  if (search) {
    const pattern = `%${search}%`;
    const rows = await sql`
      SELECT * FROM hop_dong
      WHERE ten_ben_thue ILIKE ${pattern} OR dia_diem ILIKE ${pattern}
      ORDER BY ngay_tao DESC
    `;
    return c.json({ success: true, data: rows, total: rows.length });
  }

  const rows = await sql`SELECT * FROM hop_dong ORDER BY ngay_tao DESC`;
  return c.json({ success: true, data: rows, total: rows.length });
});

// Create contract
contracts.post("/", async (c) => {
  const body = await c.req.json();
  const maHd = await generateId("hop_dong", "ma_hd", "HD");

  await sql`
    INSERT INTO hop_dong (
      ma_hd, so_hd, ma_ch, ma_dia_diem, dia_diem, loai_kh,
      ten_ben_thue, dia_chi_ben_thue, mst, nguoi_dai_dien, sdt_dai_dien,
      ngay_bat_dau, ngay_ket_thuc, gia_thue, phi_dich_vu, tong_thang,
      tien_coc, ky_thanh_toan, ngay_thanh_toan, trang_thai, ghi_chu
    ) VALUES (
      ${maHd}, ${body.soHd || null}, ${body.maCh || null},
      ${body.maDiaDiem || body.maDd || null}, ${body.diaDiem || body.tenDiaDiem || null},
      ${body.loaiKh || null}, ${body.tenBenThue},
      ${body.diaChiBenThue || null}, ${body.mst || null},
      ${body.nguoiDaiDien || null}, ${body.sdtDaiDien || null},
      ${body.ngayBatDau || body.ngayBd || null},
      ${body.ngayKetThuc || body.ngayKt || null},
      ${body.giaThue || null}, ${body.phiDichVu || null},
      ${body.tongThang || null}, ${body.tienCoc || null},
      ${body.kyThanhToan || null}, ${body.ngayThanhToan || null},
      ${"Dang hieu luc"}, ${body.ghiChu || null}
    )
  `;
  return c.json({ success: true, message: "Them hop dong thanh cong", data: { maHd } });
});

// Update contract
contracts.put("/:id", async (c) => {
  const maHd = c.req.param("id");
  const body = await c.req.json();

  const existing = await sql`SELECT ma_hd FROM hop_dong WHERE ma_hd = ${maHd}`;
  if (existing.length === 0) {
    return c.json({ success: false, message: "Hop dong khong ton tai" }, 404);
  }

  await sql`
    UPDATE hop_dong SET
      ten_ben_thue = ${body.tenBenThue}, dia_diem = ${body.diaDiem || body.tenDiaDiem || null},
      ma_dia_diem = ${body.maDiaDiem || body.maDd || null},
      dia_chi_ben_thue = ${body.diaChiBenThue || null},
      mst = ${body.mst || null}, nguoi_dai_dien = ${body.nguoiDaiDien || null},
      sdt_dai_dien = ${body.sdtDaiDien || null},
      ngay_bat_dau = ${body.ngayBatDau || body.ngayBd || null},
      ngay_ket_thuc = ${body.ngayKetThuc || body.ngayKt || null},
      gia_thue = ${body.giaThue || null}, phi_dich_vu = ${body.phiDichVu || null},
      tong_thang = ${body.tongThang || null}, tien_coc = ${body.tienCoc || null},
      ky_thanh_toan = ${body.kyThanhToan || null},
      trang_thai = ${body.trangThai || null}, ghi_chu = ${body.ghiChu || null}
    WHERE ma_hd = ${maHd}
  `;
  return c.json({ success: true, message: "Cap nhat hop dong thanh cong" });
});

// Export contracts as CSV
contracts.get("/export/csv", async (c) => {
  const rows = await sql`SELECT * FROM hop_dong ORDER BY ngay_tao DESC`;
  const headers = ["ma_hd", "so_hd", "ten_ben_thue", "dia_diem", "loai_kh", "mst", "nguoi_dai_dien", "sdt_dai_dien", "ngay_bat_dau", "ngay_ket_thuc", "gia_thue", "phi_dich_vu", "tong_thang", "tien_coc", "ky_thanh_toan", "ngay_thanh_toan", "trang_thai", "ghi_chu"];
  const BOM = "\uFEFF";
  const csv = BOM + [headers.join(","), ...rows.map((r: any) =>
    headers.map((h) => `"${(r[h] ?? "").toString().replace(/"/g, '""')}"`).join(",")
  )].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=hop-dong-${new Date().toISOString().split("T")[0]}.csv`,
    },
  });
});

// Delete contract
contracts.delete("/:id", async (c) => {
  const maHd = c.req.param("id");
  const existing = await sql`SELECT ma_hd FROM hop_dong WHERE ma_hd = ${maHd}`;
  if (existing.length === 0) {
    return c.json({ success: false, message: "Hop dong khong ton tai" }, 404);
  }
  await sql`DELETE FROM hop_dong WHERE ma_hd = ${maHd}`;
  return c.json({ success: true, message: "Xoa hop dong thanh cong" });
});

export default contracts;

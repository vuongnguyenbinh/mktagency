import { Hono } from "hono";
import { existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import sql from "../db";
import { generateId } from "../utils/generate-id";

// Upload directory for contract attachments
const UPLOAD_DIR = join(import.meta.dir, "../../uploads/contracts");
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

const contracts = new Hono();

// List contracts with location JOIN for dien_tich
contracts.get("/", async (c) => {
  const { trangThai, search } = c.req.query();
  const pattern = search ? `%${search}%` : null;

  let rows;
  if (trangThai && pattern) {
    rows = await sql`
      SELECT hop_dong.*, dd.dien_tich, dd.ten_hien_thi as ten_dia_diem
      FROM hop_dong LEFT JOIN dia_diem dd ON hop_dong.ma_dia_diem = dd.ma_dd
      WHERE trang_thai = ${trangThai}
        AND (ten_ben_thue ILIKE ${pattern} OR hop_dong.dia_diem ILIKE ${pattern})
      ORDER BY ngay_tao DESC`;
  } else if (trangThai) {
    rows = await sql`
      SELECT hop_dong.*, dd.dien_tich, dd.ten_hien_thi as ten_dia_diem
      FROM hop_dong LEFT JOIN dia_diem dd ON hop_dong.ma_dia_diem = dd.ma_dd
      WHERE trang_thai = ${trangThai} ORDER BY ngay_tao DESC`;
  } else if (pattern) {
    rows = await sql`
      SELECT hop_dong.*, dd.dien_tich, dd.ten_hien_thi as ten_dia_diem
      FROM hop_dong LEFT JOIN dia_diem dd ON hop_dong.ma_dia_diem = dd.ma_dd
      WHERE ten_ben_thue ILIKE ${pattern} OR hop_dong.dia_diem ILIKE ${pattern}
      ORDER BY ngay_tao DESC`;
  } else {
    rows = await sql`
      SELECT hop_dong.*, dd.dien_tich, dd.ten_hien_thi as ten_dia_diem
      FROM hop_dong LEFT JOIN dia_diem dd ON hop_dong.ma_dia_diem = dd.ma_dd
      ORDER BY ngay_tao DESC`;
  }

  // Compute next payment date for each contract
  const data = rows.map((hd: any) => {
    let ky_tt_tiep_theo = null;
    if (hd.ngay_thanh_toan && hd.trang_thai !== "Thanh lý" && hd.trang_thai !== "Hết hạn") {
      const today = new Date();
      const day = Math.min(hd.ngay_thanh_toan, 28); // cap at 28 to avoid invalid dates
      let nextDate = new Date(today.getFullYear(), today.getMonth(), day);
      if (nextDate <= today) {
        nextDate = new Date(today.getFullYear(), today.getMonth() + 1, day);
      }
      // Use local date parts to avoid UTC timezone shift
      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, "0");
      const d = String(nextDate.getDate()).padStart(2, "0");
      ky_tt_tiep_theo = `${y}-${m}-${d}`;
    }
    return { ...hd, ky_tt_tiep_theo };
  });

  return c.json({ success: true, data, total: data.length });
});

// Resolve location display name from ma_dd
async function resolveLocationName(maDiaDiem: string | null): Promise<string | null> {
  if (!maDiaDiem) return null;
  const rows = await sql`SELECT ten_hien_thi FROM dia_diem WHERE ma_dd = ${maDiaDiem}`;
  return rows.length > 0 ? (rows[0] as any).ten_hien_thi : null;
}

// Create contract
contracts.post("/", async (c) => {
  const body = await c.req.json();
  const maHd = await generateId("hop_dong", "ma_hd", "HD");
  const maDd = body.maDiaDiem || body.maDd || null;
  const diaDiem = await resolveLocationName(maDd) || body.diaDiem || body.tenDiaDiem || null;

  await sql`
    INSERT INTO hop_dong (
      ma_hd, so_hd, ma_ch, ma_dia_diem, dia_diem, loai_kh,
      ten_ben_thue, dia_chi_ben_thue, mst, nguoi_dai_dien, sdt_dai_dien,
      ngay_bat_dau, ngay_ket_thuc, gia_thue, phi_dich_vu, tong_thang,
      tien_coc, ky_thanh_toan, ngay_thanh_toan, trang_thai, ghi_chu,
      dong_tien, gia_thue_usd, phi_dich_vu_usd, tien_coc_usd
    ) VALUES (
      ${maHd}, ${body.soHd || null}, ${body.maCh || null},
      ${maDd}, ${diaDiem},
      ${body.loaiKh || null}, ${body.tenBenThue},
      ${body.diaChiBenThue || null}, ${body.mst || null},
      ${body.nguoiDaiDien || null}, ${body.sdtDaiDien || null},
      ${body.ngayBatDau || body.ngayBd || null},
      ${body.ngayKetThuc || body.ngayKt || null},
      ${body.giaThue || null}, ${body.phiDichVu || null},
      ${body.tongThang || null}, ${body.tienCoc || null},
      ${body.kyThanhToan || null}, ${body.ngayThanhToan || null},
      ${body.trangThai || "Đang thuê"}, ${body.ghiChu || null},
      ${body.dongTien || "USD"}, ${body.giaThueUsd || null},
      ${body.phiDichVuUsd || null}, ${body.tienCocUsd || null}
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

  const maDd = body.maDiaDiem || body.maDd || null;
  const diaDiem = await resolveLocationName(maDd) || body.diaDiem || body.tenDiaDiem || null;

  await sql`
    UPDATE hop_dong SET
      ten_ben_thue = ${body.tenBenThue}, dia_diem = ${diaDiem},
      ma_dia_diem = ${maDd},
      dia_chi_ben_thue = ${body.diaChiBenThue || null},
      mst = ${body.mst || null}, nguoi_dai_dien = ${body.nguoiDaiDien || null},
      sdt_dai_dien = ${body.sdtDaiDien || null},
      ngay_bat_dau = ${body.ngayBatDau || body.ngayBd || null},
      ngay_ket_thuc = ${body.ngayKetThuc || body.ngayKt || null},
      gia_thue = ${body.giaThue || null}, phi_dich_vu = ${body.phiDichVu || null},
      tong_thang = ${body.tongThang || null}, tien_coc = ${body.tienCoc || null},
      ky_thanh_toan = ${body.kyThanhToan || null},
      ngay_thanh_toan = ${body.ngayThanhToan || null},
      trang_thai = ${body.trangThai || null}, ghi_chu = ${body.ghiChu || null},
      dong_tien = ${body.dongTien || "USD"},
      gia_thue_usd = ${body.giaThueUsd || null},
      phi_dich_vu_usd = ${body.phiDichVuUsd || null},
      tien_coc_usd = ${body.tienCocUsd || null}
    WHERE ma_hd = ${maHd}
  `;
  return c.json({ success: true, message: "Cap nhat hop dong thanh cong" });
});

// ==================== FILE ATTACHMENTS ====================

// Upload file for a contract (multipart/form-data)
contracts.post("/:id/files", async (c) => {
  const maHd = c.req.param("id");
  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return c.json({ success: false, message: "No file uploaded" }, 400);

  // Validate file type (images + PDF only)
  const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"];
  const ext = extname(file.name).toLowerCase();
  if (!allowed.includes(ext)) {
    return c.json({ success: false, message: "Only images and PDF files are allowed" }, 400);
  }

  // Max 10MB
  if (file.size > 10 * 1024 * 1024) {
    return c.json({ success: false, message: "File too large (max 10MB)" }, 400);
  }

  // Create contract-specific directory
  const contractDir = join(UPLOAD_DIR, maHd);
  if (!existsSync(contractDir)) mkdirSync(contractDir, { recursive: true });

  // Save file with timestamp prefix to avoid name collisions
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${timestamp}_${safeName}`;
  const filepath = join(contractDir, filename);

  await Bun.write(filepath, file);

  return c.json({
    success: true,
    message: "Upload thanh cong",
    data: { filename, size: file.size, type: file.type },
  });
});

// List files for a contract
contracts.get("/:id/files", async (c) => {
  const maHd = c.req.param("id");
  const contractDir = join(UPLOAD_DIR, maHd);

  if (!existsSync(contractDir)) {
    return c.json({ success: true, data: [] });
  }

  const files = readdirSync(contractDir).map((name) => {
    const stat = statSync(join(contractDir, name));
    // Strip timestamp prefix for display name
    const displayName = name.replace(/^\d+_/, "");
    const ext = extname(name).toLowerCase();
    const isImage = [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext);
    return {
      filename: name,
      displayName,
      size: stat.size,
      isImage,
      isPdf: ext === ".pdf",
      uploadedAt: stat.mtime.toISOString(),
    };
  });

  return c.json({ success: true, data: files });
});

// Download/serve a file
contracts.get("/:id/files/:filename", async (c) => {
  const maHd = c.req.param("id");
  const filename = c.req.param("filename");
  const filepath = join(UPLOAD_DIR, maHd, filename);

  if (!existsSync(filepath)) {
    return c.json({ success: false, message: "File not found" }, 404);
  }

  const file = Bun.file(filepath);
  const ext = extname(filename).toLowerCase();
  const contentType =
    ext === ".pdf" ? "application/pdf" :
    ext === ".png" ? "image/png" :
    ext === ".gif" ? "image/gif" :
    ext === ".webp" ? "image/webp" :
    "image/jpeg";

  return new Response(file, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
});

// Delete a file
contracts.delete("/:id/files/:filename", async (c) => {
  const maHd = c.req.param("id");
  const filename = c.req.param("filename");
  const filepath = join(UPLOAD_DIR, maHd, filename);

  if (!existsSync(filepath)) {
    return c.json({ success: false, message: "File not found" }, 404);
  }

  unlinkSync(filepath);
  return c.json({ success: true, message: "Xoa file thanh cong" });
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

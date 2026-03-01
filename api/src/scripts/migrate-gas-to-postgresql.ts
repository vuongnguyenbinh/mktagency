/**
 * One-time migration script: GAS API → PostgreSQL
 * Run from VPS where PostgreSQL is accessible at localhost:5432
 * Usage: bun run src/scripts/migrate-gas-to-postgresql.ts
 */

const GAS_URL = process.env.GAS_API_URL!;
if (!GAS_URL) throw new Error("GAS_API_URL environment variable is required");

const sql = new Bun.SQL(process.env.DATABASE_URL!);
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL environment variable is required");

// Fetch from GAS API
async function fetchGAS(action: string, params: Record<string, any> = {}): Promise<any> {
  const url = new URL(GAS_URL);
  url.searchParams.set("action", action);
  if (Object.keys(params).length > 0) {
    url.searchParams.set("params", JSON.stringify(params));
  }
  console.log(`  Fetching GAS: ${action}...`);
  const res = await fetch(url.toString(), { redirect: "follow" });
  const data = await res.json();
  if (!data.success) {
    throw new Error(`GAS ${action} failed: ${data.message || JSON.stringify(data)}`);
  }
  return data;
}

// Convert phone numbers from JS number to string
function phoneStr(val: any): string | null {
  if (val === null || val === undefined || val === "") return null;
  return String(val);
}

// Convert date string to ISO or null
function dateVal(val: any): string | null {
  if (!val || val === "" || val === "null") return null;
  return val;
}

// Convert numeric value
function numVal(val: any): number | null {
  if (val === null || val === undefined || val === "" || val === "null") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

// ===================== MIGRATION FUNCTIONS =====================

async function migrateEmployees() {
  console.log("\n[1/5] Migrating employees (nhan_vien)...");
  // Try fetching employee list via GAS
  try {
    const data = await fetchGAS("getEmployees");
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      for (const e of data.data) {
        await sql`
          INSERT INTO nhan_vien (ma_nv, email, ho_ten, quyen, trang_thai)
          VALUES (${e.maNV || e.ma_nv}, ${e.email}, ${e.hoTen || e.ho_ten}, ${e.quyen || "Sale"}, ${e.trangThai || e.trang_thai || "Hoat dong"})
          ON CONFLICT (ma_nv) DO NOTHING
        `;
      }
      console.log(`  Inserted ${data.data.length} employees`);
      return;
    }
  } catch (e) {
    console.log("  getEmployees not available, trying getUser...");
  }

  // Fallback: get current user only
  try {
    const data = await fetchGAS("getUser");
    if (data.data) {
      const u = data.data;
      await sql`
        INSERT INTO nhan_vien (ma_nv, email, ho_ten, quyen, trang_thai)
        VALUES (${u.maNV || "NV001"}, ${u.email}, ${u.hoTen || u.ho_ten || "Admin"}, ${u.quyen || "Admin"}, ${"Hoat dong"})
        ON CONFLICT (ma_nv) DO NOTHING
      `;
      console.log("  Inserted 1 employee (current user)");
    }
  } catch (e) {
    console.log("  Warning: Could not fetch employees. Skipping...");
  }
}

async function migrateCustomers() {
  console.log("\n[2/5] Migrating customers (khach_hang)...");
  const data = await fetchGAS("getCustomers");
  if (!data.data || !Array.isArray(data.data)) {
    console.log("  No customer data");
    return;
  }

  let count = 0;
  for (const c of data.data) {
    await sql`
      INSERT INTO khach_hang (ma_kh, sdt, ho_ten, email, cong_ty, nguon, nguoi_tao, ghi_chu, ngay_tao)
      VALUES (
        ${c.maKH || c.ma_kh}, ${phoneStr(c.sdt)}, ${c.hoTen || c.ho_ten},
        ${c.email || null}, ${c.congTy || c.cong_ty || null},
        ${c.nguon || null}, ${c.nguoiTao || c.nguoi_tao || null},
        ${c.ghiChu || c.ghi_chu || null},
        ${dateVal(c.ngayTao || c.ngay_tao) || new Date().toISOString()}
      )
      ON CONFLICT (ma_kh) DO NOTHING
    `;
    count++;
  }
  console.log(`  Inserted ${count} customers`);
}

async function migrateLocations() {
  console.log("\n[3/5] Migrating locations (dia_diem)...");
  const data = await fetchGAS("getLocations");
  if (!data.data || !Array.isArray(data.data)) {
    console.log("  No location data");
    return;
  }

  let count = 0;
  // GAS returns: { ten, diaChi, danhSachTang: { "1": [rooms], "2": [rooms] } }
  for (const building of data.data) {
    const toaNha = building.ten || building.toaNha;
    const diaChi = building.diaChi || null;

    // Flatten nested danhSachTang structure
    if (building.danhSachTang && typeof building.danhSachTang === "object") {
      for (const [tang, rooms] of Object.entries(building.danhSachTang)) {
        if (!Array.isArray(rooms)) continue;
        for (const room of rooms as any[]) {
          await sql`
            INSERT INTO dia_diem (ma_dd, toa_nha, dia_chi, tang, phong, ten_hien_thi, dien_tich, gia_thue, phi_dich_vu, trang_thai, ghi_chu)
            VALUES (
              ${room.maDiaDiem}, ${toaNha}, ${diaChi}, ${parseInt(tang)},
              ${numVal(room.phong)}, ${room.tenHienThi || null},
              ${numVal(room.dienTich)}, ${numVal(room.giaThue)},
              ${numVal(room.phiDichVu)}, ${room.trangThai || "Trong"},
              ${room.ghiChu || null}
            )
            ON CONFLICT (ma_dd) DO NOTHING
          `;
          count++;
        }
      }
    }
  }
  console.log(`  Inserted ${count} locations`);
}

async function migrateOpportunities() {
  console.log("\n[4/5] Migrating opportunities (co_hoi)...");
  const data = await fetchGAS("getOpportunities");
  if (!data.data || !Array.isArray(data.data)) {
    console.log("  No opportunity data");
    return;
  }

  let count = 0;
  for (const o of data.data) {
    // Set FK to null if referenced record doesn't exist
    const maKh = o.maKH || o.ma_kh || null;
    const ddQuanTam = o.ddQuanTam || o.dd_quan_tam || null;
    const phuTrach = o.phuTrach || o.phu_trach || null;

    await sql`
      INSERT INTO co_hoi (
        ma_ch, ma_kh, ten_kh, sdt, ten_cong_ty, mst, nhu_cau_dt, ngan_sach,
        khu_vuc, dd_quan_tam, giai_doan, danh_gia, phu_trach, lich_su_tu_van,
        ly_do_that_bai, ngay_tao, ngay_cap_nhat, ngay_thanh_cong, ngay_that_bai
      ) VALUES (
        ${o.maCH || o.ma_ch}, ${maKh}, ${o.tenKH || o.ten_kh || null},
        ${phoneStr(o.sdt)}, ${o.tenCongTy || o.ten_cong_ty || null},
        ${o.mst || null}, ${o.nhuCauDT || o.nhu_cau_dt || null},
        ${numVal(o.nganSach || o.ngan_sach)}, ${o.khuVuc || o.khu_vuc || null},
        ${ddQuanTam}, ${o.giaiDoan || o.giai_doan || "Moi"},
        ${o.danhGia || o.danh_gia || null}, ${phuTrach},
        ${o.lichSuTuVan || o.lich_su_tu_van || null},
        ${o.lyDoThatBai || o.ly_do_that_bai || null},
        ${dateVal(o.ngayTao || o.ngay_tao) || new Date().toISOString()},
        ${dateVal(o.ngayCapNhat || o.ngay_cap_nhat) || new Date().toISOString()},
        ${dateVal(o.ngayThanhCong || o.ngay_thanh_cong)},
        ${dateVal(o.ngayThatBai || o.ngay_that_bai)}
      )
      ON CONFLICT (ma_ch) DO NOTHING
    `;
    count++;
  }
  console.log(`  Inserted ${count} opportunities`);
}

async function migrateContracts() {
  console.log("\n[5/5] Migrating contracts (hop_dong)...");
  const data = await fetchGAS("getContracts");
  if (!data.data || !Array.isArray(data.data)) {
    console.log("  No contract data");
    return;
  }

  let count = 0;
  for (const h of data.data) {
    await sql`
      INSERT INTO hop_dong (
        ma_hd, so_hd, ma_ch, ma_dia_diem, dia_diem, loai_kh,
        ten_ben_thue, dia_chi_ben_thue, mst, nguoi_dai_dien, sdt_dai_dien,
        ngay_bat_dau, ngay_ket_thuc, gia_thue, phi_dich_vu, tong_thang,
        tien_coc, ky_thanh_toan, ngay_thanh_toan, trang_thai, ghi_chu
      ) VALUES (
        ${h.maHD || h.ma_hd}, ${h.soHD || h.so_hd || null},
        ${h.maCH || h.ma_ch || null}, ${h.maDiaDiem || h.ma_dia_diem || null},
        ${h.diaDiem || h.dia_diem || null}, ${h.loaiKH || h.loai_kh || null},
        ${h.tenBenThue || h.ten_ben_thue || null},
        ${h.diaChiBenThue || h.dia_chi_ben_thue || null},
        ${h.mst || null}, ${h.nguoiDaiDien || h.nguoi_dai_dien || null},
        ${phoneStr(h.sdtDaiDien || h.sdt_dai_dien)},
        ${dateVal(h.ngayBatDau || h.ngay_bat_dau)},
        ${dateVal(h.ngayKetThuc || h.ngay_ket_thuc)},
        ${numVal(h.giaThue || h.gia_thue)}, ${numVal(h.phiDichVu || h.phi_dich_vu)},
        ${numVal(h.tongThang || h.tong_thang)}, ${numVal(h.tienCoc || h.tien_coc)},
        ${h.kyThanhToan || h.ky_thanh_toan || null},
        ${numVal(h.ngayThanhToan || h.ngay_thanh_toan)},
        ${h.trangThai || h.trang_thai || "Dang hieu luc"},
        ${h.ghiChu || h.ghi_chu || null}
      )
      ON CONFLICT (ma_hd) DO NOTHING
    `;
    count++;
  }
  console.log(`  Inserted ${count} contracts`);
}

// ===================== VERIFY =====================
async function verifyCounts() {
  console.log("\n--- Verification ---");
  const tables = ["nhan_vien", "khach_hang", "dia_diem", "co_hoi", "hop_dong"];
  for (const t of tables) {
    const [row] = await sql.unsafe(`SELECT COUNT(*)::int as count FROM ${t}`);
    console.log(`  ${t}: ${row.count} rows`);
  }
}

// ===================== MAIN =====================
async function main() {
  console.log("=== ESG Sale: GAS → PostgreSQL Migration ===");
  console.log(`Database: ${process.env.DATABASE_URL || "localhost:5432/ecosmart_db"}`);

  try {
    // Temporarily disable FK checks for migration
    console.log("Disabling FK constraints...");
    await sql`SET session_replication_role = replica`;

    await migrateEmployees();
    await migrateCustomers();
    await migrateLocations();
    await migrateOpportunities();
    await migrateContracts();

    // Re-enable FK checks
    console.log("\nRe-enabling FK constraints...");
    await sql`SET session_replication_role = DEFAULT`;

    await verifyCounts();
    console.log("\n=== Migration complete ===");
  } catch (error) {
    // Re-enable FK checks even on error
    try { await sql`SET session_replication_role = DEFAULT`; } catch {}
    console.error("\n!!! Migration failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

main();

/**
 * Migration script: Import CSV data from Google Sheets to SQLite
 *
 * Usage:
 * 1. Export each sheet from Google Sheets as CSV
 * 2. Place CSVs in api/data/ folder with names:
 *    - khach_hang.csv
 *    - dia_diem.csv
 *    - co_hoi.csv
 *    - hop_dong.csv
 *    - nhan_vien.csv
 * 3. Run: bun run scripts/migrate.ts
 */

import { Database } from "bun:sqlite";
import { parse } from "csv-parse/sync";

const db = new Database("./data/esgsale.db");

// CSV column mapping (Google Sheets column name → SQLite column name)
const mappings = {
  khach_hang: {
    "Mã KH": "ma_kh",
    SĐT: "sdt",
    "Họ tên": "ho_ten",
    Email: "email",
    "Công ty": "cong_ty",
    Nguồn: "nguon",
    "Ghi chú": "ghi_chu",
    "Ngày tạo": "ngay_tao",
  },
  dia_diem: {
    "Mã ĐĐ": "ma_dd",
    "Tòa nhà": "toa_nha",
    Tầng: "tang",
    Phòng: "phong",
    "Tên hiển thị": "ten_hien_thi",
    "Diện tích": "dien_tich",
    "Giá thuê": "gia_thue",
    "Phí dịch vụ": "phi_dich_vu",
    "Trạng thái": "trang_thai",
    "Ghi chú": "ghi_chu",
  },
  co_hoi: {
    "Mã CH": "ma_ch",
    "Mã KH": "ma_kh",
    "Tên KH": "ten_kh",
    SĐT: "sdt",
    "Tên công ty": "ten_cong_ty",
    MST: "mst",
    "Nhu cầu DT": "nhu_cau_dt",
    "Ngân sách": "ngan_sach",
    "Khu vực": "khu_vuc",
    "ĐĐ quan tâm": "dd_quan_tam",
    "Giai đoạn": "giai_doan",
    "Đánh giá": "danh_gia",
    "Phụ trách": "phu_trach",
    "Lịch sử tư vấn": "lich_su_tu_van",
    "Lý do thất bại": "ly_do_that_bai",
    "Ngày tạo": "ngay_tao",
    "Ngày cập nhật": "ngay_cap_nhat",
    "Ngày thành công": "ngay_thanh_cong",
    "Ngày thất bại": "ngay_that_bai",
  },
  hop_dong: {
    "Mã HĐ": "ma_hd",
    "Mã CH": "ma_ch",
    "Mã KH": "ma_kh",
    "Tên bên thuê": "ten_ben_thue",
    "Mã ĐĐ": "ma_dd",
    "Tên địa điểm": "ten_dia_diem",
    "Diện tích": "dien_tich",
    "Giá thuê": "gia_thue",
    "Phí dịch vụ": "phi_dich_vu",
    "Tiền cọc": "tien_coc",
    "Kỳ thanh toán": "ky_thanh_toan",
    "Ngày BĐ": "ngay_bd",
    "Ngày KT": "ngay_kt",
    "Trạng thái": "trang_thai",
    "Ghi chú": "ghi_chu",
    "Ngày tạo": "ngay_tao",
  },
  nhan_vien: {
    "Mã NV": "ma_nv",
    Email: "email",
    "Họ tên": "ho_ten",
    Quyền: "quyen",
    "Trạng thái": "trang_thai",
  },
};

async function importCSV(tableName: string) {
  const csvPath = `./data/${tableName}.csv`;
  const file = Bun.file(csvPath);

  if (!(await file.exists())) {
    console.log(`⏭️  Skipping ${tableName}: ${csvPath} not found`);
    return 0;
  }

  const content = await file.text();
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  if (records.length === 0) {
    console.log(`⏭️  Skipping ${tableName}: empty CSV`);
    return 0;
  }

  const mapping = mappings[tableName as keyof typeof mappings];
  const columns = Object.values(mapping);
  const placeholders = columns.map(() => "?").join(", ");

  const stmt = db.prepare(
    `INSERT OR REPLACE INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`,
  );

  let count = 0;
  for (const row of records) {
    const values = Object.entries(mapping).map(([csvCol, _]) => {
      const val = row[csvCol];
      return val === "" || val === undefined ? null : val;
    });

    try {
      stmt.run(...values);
      count++;
    } catch (err) {
      console.error(`Error inserting row in ${tableName}:`, row, err);
    }
  }

  console.log(`✅ ${tableName}: imported ${count} records`);
  return count;
}

async function main() {
  console.log("🚀 Starting migration...\n");

  const tables = ["nhan_vien", "khach_hang", "dia_diem", "co_hoi", "hop_dong"];
  let total = 0;

  for (const table of tables) {
    total += await importCSV(table);
  }

  console.log(`\n✨ Migration complete! Total: ${total} records`);

  // Show summary
  console.log("\n📊 Database summary:");
  for (const table of tables) {
    const count = db
      .query(`SELECT COUNT(*) as count FROM ${table}`)
      .get() as any;
    console.log(`   ${table}: ${count.count} records`);
  }
}

main().catch(console.error);

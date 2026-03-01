/**
 * Seed script: Create sample data for testing
 * Run: bun run scripts/seed.ts
 */

import { Database } from "bun:sqlite";

const db = new Database("./data/esgsale.db");

console.log("🌱 Seeding sample data...\n");

// Sample employees
const nhanVien = [
  ["NV001", "admin@esgsale.vn", "Nguyễn Văn Admin", "Admin", "Hoạt động"],
  ["NV002", "sale1@esgsale.vn", "Trần Thị Sale", "Sale", "Hoạt động"],
  ["NV003", "sale2@esgsale.vn", "Lê Văn Bán", "Sale", "Hoạt động"],
];

// Sample customers
const khachHang = [
  [
    "KH0001",
    "0901234567",
    "Nguyễn Văn A",
    "nva@gmail.com",
    "Công ty ABC",
    "Website",
    "Khách tiềm năng",
  ],
  [
    "KH0002",
    "0912345678",
    "Trần Thị B",
    "ttb@gmail.com",
    "Công ty XYZ",
    "Giới thiệu",
    "Đã liên hệ",
  ],
  [
    "KH0003",
    "0923456789",
    "Lê Văn C",
    "lvc@gmail.com",
    "Startup DEF",
    "Facebook",
    "",
  ],
  [
    "KH0004",
    "0934567890",
    "Phạm Thị D",
    "ptd@gmail.com",
    "Công ty GHI",
    "Zalo",
    "Cần follow up",
  ],
  [
    "KH0005",
    "0945678901",
    "Hoàng Văn E",
    "hve@gmail.com",
    "Công ty JKL",
    "Website",
    "",
  ],
];

// Sample locations
const diaDiem = [
  [
    "DD001",
    "Tòa A",
    1,
    101,
    "A-1-101",
    50,
    15000000,
    2000000,
    "Trống",
    "View đẹp",
  ],
  ["DD002", "Tòa A", 1, 102, "A-1-102", 45, 13500000, 1800000, "Đang thuê", ""],
  ["DD003", "Tòa A", 2, 201, "A-2-201", 60, 18000000, 2400000, "Trống", "Góc"],
  ["DD004", "Tòa A", 2, 202, "A-2-202", 55, 16500000, 2200000, "Giữ chỗ", ""],
  [
    "DD005",
    "Tòa B",
    1,
    101,
    "B-1-101",
    80,
    24000000,
    3200000,
    "Trống",
    "Diện tích lớn",
  ],
  ["DD006", "Tòa B", 1, 102, "B-1-102", 70, 21000000, 2800000, "Đang thuê", ""],
  [
    "DD007",
    "Tòa B",
    2,
    201,
    "B-2-201",
    90,
    27000000,
    3600000,
    "Trống",
    "Premium",
  ],
  ["DD008", "Tòa B", 2, 202, "B-2-202", 85, 25500000, 3400000, "Đang thuê", ""],
];

// Sample opportunities
const coHoi = [
  [
    "CH0001",
    "KH0001",
    "Nguyễn Văn A",
    "0901234567",
    "Công ty ABC",
    "0123456789",
    "50-80m2",
    "15-20tr",
    "Cầu Giấy",
    "Tòa A",
    "Mới",
    "Nóng",
    "NV002",
    "[11/01/2026] Tạo mới",
    "",
    "2026-01-11",
    "2026-01-11",
    "",
    "",
  ],
  [
    "CH0002",
    "KH0002",
    "Trần Thị B",
    "0912345678",
    "Công ty XYZ",
    "9876543210",
    "60-100m2",
    "20-30tr",
    "Thanh Xuân",
    "Tòa B",
    "Đã liên hệ",
    "Ấm",
    "NV002",
    "[11/01/2026] Đã gọi điện",
    "",
    "2026-01-10",
    "2026-01-11",
    "",
    "",
  ],
  [
    "CH0003",
    "KH0003",
    "Lê Văn C",
    "0923456789",
    "Startup DEF",
    "",
    "30-50m2",
    "10-15tr",
    "Đống Đa",
    "Tòa A",
    "Đã xem",
    "Suy nghĩ",
    "NV003",
    "[11/01/2026] Đã xem phòng A-1-101",
    "",
    "2026-01-09",
    "2026-01-11",
    "",
    "",
  ],
  [
    "CH0004",
    "KH0004",
    "Phạm Thị D",
    "0934567890",
    "Công ty GHI",
    "1122334455",
    "80-120m2",
    "25-35tr",
    "Hoàn Kiếm",
    "Tòa B",
    "Đang đàm phán",
    "Nóng",
    "NV002",
    "[11/01/2026] Đang thương lượng giá",
    "",
    "2026-01-08",
    "2026-01-11",
    "",
    "",
  ],
  [
    "CH0005",
    "KH0005",
    "Hoàng Văn E",
    "0945678901",
    "Công ty JKL",
    "5566778899",
    "100m2+",
    "30tr+",
    "Ba Đình",
    "Tòa B",
    "Thành công",
    "Nóng",
    "NV003",
    "[11/01/2026] Ký hợp đồng",
    "",
    "2026-01-05",
    "2026-01-11",
    "2026-01-11",
    "",
  ],
];

// Sample contracts
const hopDong = [
  [
    "HD0001",
    "CH0005",
    "KH0005",
    "Công ty JKL",
    "DD007",
    "B-2-201",
    90,
    27000000,
    3600000,
    54000000,
    "Hàng tháng",
    "2026-01-15",
    "2027-01-14",
    "Đang thuê",
    "Hợp đồng 1 năm",
  ],
  [
    "HD0002",
    "",
    "KH0002",
    "Công ty XYZ",
    "DD002",
    "A-1-102",
    45,
    13500000,
    1800000,
    27000000,
    "Hàng quý",
    "2025-06-01",
    "2026-05-31",
    "Đang thuê",
    "",
  ],
  [
    "HD0003",
    "",
    "",
    "Công ty MNO",
    "DD006",
    "B-1-102",
    70,
    21000000,
    2800000,
    42000000,
    "Hàng tháng",
    "2025-03-01",
    "2026-02-28",
    "Đang thuê",
    "Sắp hết hạn",
  ],
  [
    "HD0004",
    "",
    "",
    "Công ty PQR",
    "DD008",
    "B-2-202",
    85,
    25500000,
    3400000,
    51000000,
    "Hàng quý",
    "2025-09-01",
    "2026-08-31",
    "Đang thuê",
    "",
  ],
];

// Insert data
console.log("📝 Inserting employees...");
const stmtNV = db.prepare(
  "INSERT OR REPLACE INTO nhan_vien (ma_nv, email, ho_ten, quyen, trang_thai) VALUES (?, ?, ?, ?, ?)",
);
nhanVien.forEach((row) => stmtNV.run(...row));
console.log(`   ✅ ${nhanVien.length} employees`);

console.log("📝 Inserting customers...");
const stmtKH = db.prepare(
  "INSERT OR REPLACE INTO khach_hang (ma_kh, sdt, ho_ten, email, cong_ty, nguon, ghi_chu) VALUES (?, ?, ?, ?, ?, ?, ?)",
);
khachHang.forEach((row) => stmtKH.run(...row));
console.log(`   ✅ ${khachHang.length} customers`);

console.log("📝 Inserting locations...");
const stmtDD = db.prepare(
  "INSERT OR REPLACE INTO dia_diem (ma_dd, toa_nha, tang, phong, ten_hien_thi, dien_tich, gia_thue, phi_dich_vu, trang_thai, ghi_chu) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
);
diaDiem.forEach((row) => stmtDD.run(...row));
console.log(`   ✅ ${diaDiem.length} locations`);

console.log("📝 Inserting opportunities...");
const stmtCH = db.prepare(
  "INSERT OR REPLACE INTO co_hoi (ma_ch, ma_kh, ten_kh, sdt, ten_cong_ty, mst, nhu_cau_dt, ngan_sach, khu_vuc, dd_quan_tam, giai_doan, danh_gia, phu_trach, lich_su_tu_van, ly_do_that_bai, ngay_tao, ngay_cap_nhat, ngay_thanh_cong, ngay_that_bai) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
);
coHoi.forEach((row) => stmtCH.run(...row));
console.log(`   ✅ ${coHoi.length} opportunities`);

console.log("📝 Inserting contracts...");
const stmtHD = db.prepare(
  "INSERT OR REPLACE INTO hop_dong (ma_hd, ma_ch, ma_kh, ten_ben_thue, ma_dd, ten_dia_diem, dien_tich, gia_thue, phi_dich_vu, tien_coc, ky_thanh_toan, ngay_bd, ngay_kt, trang_thai, ghi_chu) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
);
hopDong.forEach((row) => stmtHD.run(...row));
console.log(`   ✅ ${hopDong.length} contracts`);

console.log("\n✨ Seeding complete!");

// Show summary
console.log("\n📊 Database summary:");
const tables = ["nhan_vien", "khach_hang", "dia_diem", "co_hoi", "hop_dong"];
tables.forEach((table) => {
  const count = db.query(`SELECT COUNT(*) as count FROM ${table}`).get() as any;
  console.log(`   ${table}: ${count.count} records`);
});

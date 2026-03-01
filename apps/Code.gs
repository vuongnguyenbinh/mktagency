/**
 * ESG SALE - HỆ THỐNG QUẢN LÝ CHO THUÊ VĂN PHÒNG
 * Version: 1.0
 * Location: Hà Nội
 * Design: Bình Vương Design DNA
 *
 * Phase 1: Setup Database + Sample Data
 * Phase 2: Xác thực + Phân quyền
 */

// ==================== CẤU HÌNH ====================
const CONFIG = {
  // Spreadsheet ID - QUAN TRỌNG: Thay bằng ID thực của Google Sheet
  SPREADSHEET_ID: "17Wd3dFdsqkZd0MXJujIhocW6Y9FqmFSamVlPMLUawnA",

  // Thông tin hệ thống
  APP_NAME: "ESG Sale",
  APP_DESCRIPTION: "Hệ thống quản lý cho thuê văn phòng",
  LOCATION: "Hà Nội",
  VERSION: "1.0",

  // Tên các sheet
  SHEETS: {
    DIA_DIEM: "ĐỊA ĐIỂM",
    KHACH_HANG: "KHÁCH HÀNG",
    NHAN_VIEN: "NHÂN VIÊN",
    CO_HOI: "CƠ HỘI",
    HOP_DONG: "HỢP ĐỒNG",
    CAU_HINH: "CẤU HÌNH",
  },

  // Dropdown options
  OPTIONS: {
    TRANG_THAI_DIA_DIEM: ["Trống", "Đang thuê", "Giữ chỗ"],
    NGUON_KHACH: [
      "Facebook",
      "Zalo",
      "Website",
      "Giới thiệu",
      "Trực tiếp",
      "Hotline",
    ],
    QUYEN: ["Admin", "Sale"],
    TRANG_THAI_NV: ["Hoạt động", "Nghỉ việc"],
    GIAI_DOAN: [
      "Mới",
      "Đã liên hệ",
      "Đã xem",
      "Đang đàm phán",
      "Thành công",
      "Thất bại",
    ],
    DANH_GIA: ["Thích", "Suy nghĩ", "Không thích"],
    LY_DO_THAT_BAI: [
      "Giá cao",
      "Không phù hợp",
      "Chọn nơi khác",
      "Không liên lạc được",
    ],
    LOAI_KH: ["Cá nhân", "Doanh nghiệp"],
    KY_THANH_TOAN: ["Tháng", "Quý"],
    TRANG_THAI_HD: ["Đang hiệu lực", "Sắp hết hạn", "Đã kết thúc"],
    LOAI_TUONG_TAC: ["Gọi điện", "Gặp mặt", "Xem phòng", "Zalo/SMS", "Email"],
    KET_QUA: ["Tích cực", "Trung lập", "Tiêu cực"],
  },

  // Màu sắc theo Bình Vương Design DNA
  COLORS: {
    // Dark Mode
    CHARCOAL: "#1E1E2A",
    BV_RED: "#DA251D",
    WHITE: "#FFFFFF",
    GRAY_TEXT: "#D1D5DB",
    LINE_BORDER: "#374151",

    // Accent
    BLUE: "#3B82F6",
    GREEN: "#10B981",
    YELLOW: "#EAB308",
    PURPLE: "#8B5CF6",

    // Header (cho Sheet)
    HEADER: "#DA251D",
    HEADER_TEXT: "#FFFFFF",
    ROW_EVEN: "#f8f9fa",
    ROW_ODD: "#ffffff",
  },
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Lấy Spreadsheet - Dùng thay cho getActiveSpreadsheet() để hoạt động trong Web App
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getSpreadsheet() {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

// ==================== KHỞI TẠO HỆ THỐNG ====================

/**
 * Tạo menu khi mở spreadsheet
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("🏢 ESG Sale")
    .addItem("🚀 Khởi tạo hệ thống", "khoiTaoHeThong")
    .addItem("📊 Tạo dữ liệu mẫu", "taoDuLieuMau")
    .addSeparator()
    .addItem("🌐 Mở Web App", "moWebApp")
    .addSeparator()
    .addSubMenu(
      ui
        .createMenu("⚙️ Quản trị")
        .addItem("👥 Quản lý nhân viên", "quanLyNhanVien")
        .addItem("🔄 Reset dữ liệu", "resetDuLieu"),
    )
    .addToUi();
}

/**
 * Khởi tạo toàn bộ hệ thống
 */
function khoiTaoHeThong() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    "🚀 Khởi tạo ESG Sale",
    "Bạn có chắc muốn khởi tạo hệ thống ESG Sale?\n\nHành động này sẽ tạo các sheet mới nếu chưa có.",
    ui.ButtonSet.YES_NO,
  );

  if (response !== ui.Button.YES) return;

  try {
    taoTatCaSheet();
    ui.alert(
      "✅ Thành công",
      "Hệ thống ESG Sale đã được khởi tạo thành công!\n\nVui lòng thêm email của bạn vào sheet NHÂN VIÊN với quyền Admin để bắt đầu sử dụng.",
      ui.ButtonSet.OK,
    );
  } catch (error) {
    ui.alert("❌ Lỗi", "Có lỗi xảy ra: " + error.message, ui.ButtonSet.OK);
  }
}

/**
 * Tạo tất cả các sheet
 */
function taoTatCaSheet() {
  const ss = getSpreadsheet();
  ss.rename("ESG Sale - CRM Văn Phòng");

  // Tạo từng sheet
  taoSheetDiaDiem(ss);
  taoSheetKhachHang(ss);
  taoSheetNhanVien(ss);
  taoSheetCoHoi(ss);
  taoSheetHopDong(ss);
  taoSheetCauHinh(ss);

  // Xóa sheet mặc định nếu còn
  const defaultSheet = ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }
}

// ==================== TẠO SHEET ĐỊA ĐIỂM ====================

function taoSheetDiaDiem(ss) {
  let sheet = ss.getSheetByName(CONFIG.SHEETS.DIA_DIEM);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEETS.DIA_DIEM);
  } else {
    sheet.clear();
  }

  // Cấu trúc cột
  const headers = [
    "Mã ĐĐ", // A - Tự động
    "Toà nhà", // B
    "Địa chỉ", // C
    "Tầng", // D
    "Phòng", // E
    "Tên hiển thị", // F - Công thức
    "Diện tích (m²)", // G
    "Giá thuê", // H
    "Phí dịch vụ", // I
    "Trạng thái", // J
    "Ghi chú", // K
    "Ngày tạo", // L
    "Ngày cập nhật", // M
  ];

  // Đặt header
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  formatHeader(headerRange);

  // Đặt độ rộng cột
  sheet.setColumnWidth(1, 80); // Mã ĐĐ
  sheet.setColumnWidth(2, 150); // Toà nhà
  sheet.setColumnWidth(3, 250); // Địa chỉ
  sheet.setColumnWidth(4, 60); // Tầng
  sheet.setColumnWidth(5, 80); // Phòng
  sheet.setColumnWidth(6, 200); // Tên hiển thị
  sheet.setColumnWidth(7, 100); // Diện tích
  sheet.setColumnWidth(8, 120); // Giá thuê
  sheet.setColumnWidth(9, 120); // Phí dịch vụ
  sheet.setColumnWidth(10, 100); // Trạng thái
  sheet.setColumnWidth(11, 200); // Ghi chú
  sheet.setColumnWidth(12, 100); // Ngày tạo
  sheet.setColumnWidth(13, 100); // Ngày cập nhật

  // Data validation cho Trạng thái
  const trangThaiRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CONFIG.OPTIONS.TRANG_THAI_DIA_DIEM, true)
    .build();
  sheet.getRange("J2:J1000").setDataValidation(trangThaiRule);

  // Format số
  sheet.getRange("G2:G1000").setNumberFormat("#,##0");
  sheet.getRange("H2:I1000").setNumberFormat('#,##0 "đ"');
  sheet.getRange("L2:M1000").setNumberFormat("dd/MM/yyyy");

  // Freeze header
  sheet.setFrozenRows(1);

  return sheet;
}

// ==================== TẠO SHEET KHÁCH HÀNG ====================

function taoSheetKhachHang(ss) {
  let sheet = ss.getSheetByName(CONFIG.SHEETS.KHACH_HANG);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEETS.KHACH_HANG);
  } else {
    sheet.clear();
  }

  const headers = [
    "Mã KH", // A - Tự động
    "Số điện thoại", // B - Unique
    "Họ tên", // C
    "Email", // D
    "Nguồn", // E
    "Người tạo", // F
    "Ngày tạo", // G
    "Ghi chú", // H
  ];

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  formatHeader(headerRange);

  // Đặt độ rộng cột
  sheet.setColumnWidth(1, 80); // Mã KH
  sheet.setColumnWidth(2, 120); // SĐT
  sheet.setColumnWidth(3, 180); // Họ tên
  sheet.setColumnWidth(4, 200); // Email
  sheet.setColumnWidth(5, 100); // Nguồn
  sheet.setColumnWidth(6, 150); // Người tạo
  sheet.setColumnWidth(7, 100); // Ngày tạo
  sheet.setColumnWidth(8, 250); // Ghi chú

  // Data validation
  const nguonRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CONFIG.OPTIONS.NGUON_KHACH, true)
    .build();
  sheet.getRange("E2:E1000").setDataValidation(nguonRule);

  // Format
  sheet.getRange("G2:G1000").setNumberFormat("dd/MM/yyyy");

  sheet.setFrozenRows(1);

  return sheet;
}

// ==================== TẠO SHEET NHÂN VIÊN ====================

function taoSheetNhanVien(ss) {
  let sheet = ss.getSheetByName(CONFIG.SHEETS.NHAN_VIEN);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEETS.NHAN_VIEN);
  } else {
    sheet.clear();
  }

  const headers = [
    "Mã NV", // A - Tự động
    "Email", // B - Unique, dùng để đăng nhập
    "Họ tên", // C
    "Quyền", // D
    "Trạng thái", // E
    "Ngày tạo", // F
  ];

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  formatHeader(headerRange);

  // Đặt độ rộng cột
  sheet.setColumnWidth(1, 80); // Mã NV
  sheet.setColumnWidth(2, 250); // Email
  sheet.setColumnWidth(3, 180); // Họ tên
  sheet.setColumnWidth(4, 100); // Quyền
  sheet.setColumnWidth(5, 100); // Trạng thái
  sheet.setColumnWidth(6, 100); // Ngày tạo

  // Data validation
  const quyenRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CONFIG.OPTIONS.QUYEN, true)
    .build();
  sheet.getRange("D2:D1000").setDataValidation(quyenRule);

  const trangThaiRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CONFIG.OPTIONS.TRANG_THAI_NV, true)
    .build();
  sheet.getRange("E2:E1000").setDataValidation(trangThaiRule);

  // Format
  sheet.getRange("F2:F1000").setNumberFormat("dd/MM/yyyy");

  sheet.setFrozenRows(1);

  return sheet;
}

// ==================== TẠO SHEET CƠ HỘI ====================

function taoSheetCoHoi(ss) {
  let sheet = ss.getSheetByName(CONFIG.SHEETS.CO_HOI);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEETS.CO_HOI);
  } else {
    sheet.clear();
  }

  const headers = [
    "Mã CH", // A - Tự động
    "Mã KH", // B - Liên kết
    "Tên KH", // C - Hiển thị
    "SĐT", // D - Hiển thị
    "Tên công ty", // E
    "MST", // F
    "Nhu cầu DT", // G - Diện tích
    "Ngân sách", // H
    "Khu vực", // I
    "ĐĐ quan tâm", // J - Mã địa điểm
    "Giai đoạn", // K
    "Đánh giá", // L
    "Phụ trách", // M - Mã NV
    "Lịch sử tư vấn", // N - Text dài
    "Lý do thất bại", // O
    "Ngày tạo", // P
    "Ngày cập nhật", // Q
    "Ngày thành công", // R
    "Ngày thất bại", // S
  ];

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  formatHeader(headerRange);

  // Đặt độ rộng cột
  sheet.setColumnWidth(1, 80); // Mã CH
  sheet.setColumnWidth(2, 80); // Mã KH
  sheet.setColumnWidth(3, 150); // Tên KH
  sheet.setColumnWidth(4, 110); // SĐT
  sheet.setColumnWidth(5, 180); // Tên công ty
  sheet.setColumnWidth(6, 100); // MST
  sheet.setColumnWidth(7, 100); // Nhu cầu DT
  sheet.setColumnWidth(8, 120); // Ngân sách
  sheet.setColumnWidth(9, 150); // Khu vực
  sheet.setColumnWidth(10, 150); // ĐĐ quan tâm
  sheet.setColumnWidth(11, 120); // Giai đoạn
  sheet.setColumnWidth(12, 100); // Đánh giá
  sheet.setColumnWidth(13, 150); // Phụ trách
  sheet.setColumnWidth(14, 400); // Lịch sử tư vấn
  sheet.setColumnWidth(15, 150); // Lý do thất bại
  sheet.setColumnWidth(16, 100); // Ngày tạo
  sheet.setColumnWidth(17, 100); // Ngày cập nhật
  sheet.setColumnWidth(18, 100); // Ngày thành công
  sheet.setColumnWidth(19, 100); // Ngày thất bại

  // Data validation
  const giaiDoanRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CONFIG.OPTIONS.GIAI_DOAN, true)
    .build();
  sheet.getRange("K2:K1000").setDataValidation(giaiDoanRule);

  const danhGiaRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CONFIG.OPTIONS.DANH_GIA, true)
    .build();
  sheet.getRange("L2:L1000").setDataValidation(danhGiaRule);

  const lyDoRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CONFIG.OPTIONS.LY_DO_THAT_BAI, true)
    .build();
  sheet.getRange("O2:O1000").setDataValidation(lyDoRule);

  // Format
  sheet.getRange("H2:H1000").setNumberFormat('#,##0 "đ"');
  sheet.getRange("P2:S1000").setNumberFormat("dd/MM/yyyy");
  sheet.getRange("N2:N1000").setWrap(true);

  sheet.setFrozenRows(1);

  return sheet;
}

// ==================== TẠO SHEET HỢP ĐỒNG ====================

function taoSheetHopDong(ss) {
  let sheet = ss.getSheetByName(CONFIG.SHEETS.HOP_DONG);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEETS.HOP_DONG);
  } else {
    sheet.clear();
  }

  const headers = [
    "Mã HĐ", // A - Tự động
    "Số HĐ", // B - Số HĐ giấy
    "Mã CH", // C - Liên kết cơ hội
    "Mã ĐĐ", // D - Liên kết địa điểm
    "Địa điểm", // E - Hiển thị
    "Loại KH", // F
    "Tên bên thuê", // G
    "Địa chỉ bên thuê", // H
    "MST", // I
    "Người đại diện", // J
    "SĐT đại diện", // K
    "Ngày bắt đầu", // L
    "Ngày kết thúc", // M
    "Giá thuê", // N
    "Phí dịch vụ", // O
    "Tổng/tháng", // P - Công thức
    "Tiền cọc", // Q
    "Kỳ thanh toán", // R
    "Ngày TT", // S - Ngày thanh toán hàng tháng
    "Trạng thái", // T
    "Số ngày còn lại", // U - Công thức
    "Ngày tạo", // V
  ];

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  formatHeader(headerRange);

  // Đặt độ rộng cột
  sheet.setColumnWidth(1, 80); // Mã HĐ
  sheet.setColumnWidth(2, 120); // Số HĐ
  sheet.setColumnWidth(3, 80); // Mã CH
  sheet.setColumnWidth(4, 80); // Mã ĐĐ
  sheet.setColumnWidth(5, 180); // Địa điểm
  sheet.setColumnWidth(6, 100); // Loại KH
  sheet.setColumnWidth(7, 180); // Tên bên thuê
  sheet.setColumnWidth(8, 250); // Địa chỉ
  sheet.setColumnWidth(9, 100); // MST
  sheet.setColumnWidth(10, 150); // Người ĐD
  sheet.setColumnWidth(11, 110); // SĐT ĐD
  sheet.setColumnWidth(12, 100); // Ngày BĐ
  sheet.setColumnWidth(13, 100); // Ngày KT
  sheet.setColumnWidth(14, 120); // Giá thuê
  sheet.setColumnWidth(15, 120); // Phí DV
  sheet.setColumnWidth(16, 120); // Tổng/tháng
  sheet.setColumnWidth(17, 120); // Tiền cọc
  sheet.setColumnWidth(18, 100); // Kỳ TT
  sheet.setColumnWidth(19, 70); // Ngày TT
  sheet.setColumnWidth(20, 120); // Trạng thái
  sheet.setColumnWidth(21, 100); // Số ngày còn lại
  sheet.setColumnWidth(22, 100); // Ngày tạo

  // Data validation
  const loaiKHRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CONFIG.OPTIONS.LOAI_KH, true)
    .build();
  sheet.getRange("F2:F1000").setDataValidation(loaiKHRule);

  const kyTTRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CONFIG.OPTIONS.KY_THANH_TOAN, true)
    .build();
  sheet.getRange("R2:R1000").setDataValidation(kyTTRule);

  const trangThaiRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CONFIG.OPTIONS.TRANG_THAI_HD, true)
    .build();
  sheet.getRange("T2:T1000").setDataValidation(trangThaiRule);

  // Format
  sheet.getRange("L2:M1000").setNumberFormat("dd/MM/yyyy");
  sheet.getRange("N2:Q1000").setNumberFormat('#,##0 "đ"');
  sheet.getRange("V2:V1000").setNumberFormat("dd/MM/yyyy");

  sheet.setFrozenRows(1);

  return sheet;
}

// ==================== TẠO SHEET CẤU HÌNH ====================

function taoSheetCauHinh(ss) {
  let sheet = ss.getSheetByName(CONFIG.SHEETS.CAU_HINH);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEETS.CAU_HINH);
  } else {
    sheet.clear();
  }

  const headers = ["Tham số", "Giá trị", "Mô tả"];

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  formatHeader(headerRange);

  // Các tham số cấu hình
  const configs = [
    ["TEN_HE_THONG", "ESG Sale", "Tên hệ thống"],
    ["MO_TA", "Hệ thống quản lý cho thuê văn phòng", "Mô tả hệ thống"],
    ["DIA_DIEM", "Hà Nội", "Địa điểm hoạt động"],
    ["SO_NGAY_CANH_BAO_HD", "30", "Số ngày cảnh báo HĐ sắp hết hạn"],
    ["MA_DIA_DIEM_PREFIX", "DD", "Tiền tố mã địa điểm"],
    ["MA_KHACH_HANG_PREFIX", "KH", "Tiền tố mã khách hàng"],
    ["MA_NHAN_VIEN_PREFIX", "NV", "Tiền tố mã nhân viên"],
    ["MA_CO_HOI_PREFIX", "CH", "Tiền tố mã cơ hội"],
    ["MA_HOP_DONG_PREFIX", "HD", "Tiền tố mã hợp đồng"],
    ["VERSION", "1.0", "Phiên bản hệ thống"],
    ["NGAY_CAI_DAT", new Date().toLocaleDateString("vi-VN"), "Ngày cài đặt"],
    ["THEME_DEFAULT", "dark", "Theme mặc định (dark/light)"],
    ["PRIMARY_COLOR", "#DA251D", "Màu chính (Bình Vương Red)"],
    ["BG_DARK", "#1E1E2A", "Màu nền Dark Mode"],
  ];

  sheet.getRange(2, 1, configs.length, 3).setValues(configs);

  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(2, 250);
  sheet.setColumnWidth(3, 300);

  sheet.setFrozenRows(1);

  return sheet;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Format header row
 */
function formatHeader(range) {
  range
    .setBackground(CONFIG.COLORS.HEADER)
    .setFontColor(CONFIG.COLORS.HEADER_TEXT)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  range.getSheet().setRowHeight(1, 35);
}

/**
 * Tạo mã tự động
 */
function taoMaTuDong(sheet, prefix, column) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return prefix + "001";

  const data = sheet.getRange(2, column, lastRow - 1, 1).getValues();
  let maxNum = 0;

  data.forEach((row) => {
    const ma = row[0].toString();
    if (ma.startsWith(prefix)) {
      const num = parseInt(ma.replace(prefix, ""));
      if (num > maxNum) maxNum = num;
    }
  });

  return prefix + String(maxNum + 1).padStart(3, "0");
}

/**
 * Lấy ngày hiện tại format dd/MM/yyyy
 */
function ngayHienTai() {
  return new Date();
}

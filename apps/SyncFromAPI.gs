/**
 * SyncFromAPI.gs — Pull data from Bun/Hono API to Google Sheet
 * Direction: PostgreSQL -> Google Sheet (one-way sync)
 * Trigger: onOpen() or manual via Sync menu
 */

const BUN_API_BASE = "https://sale.ecosmartgroup.vn/api";

// Sheet column definitions (order must match Sheet headers exactly)
const SYNC_SHEETS = {
  employees: {
    sheetName: "NHÂN VIÊN",
    endpoint: "/employees",
    columns: ["ma_nv", "email", "ho_ten", "quyen", "trang_thai", "ngay_tao"],
  },
  locations: {
    sheetName: "ĐỊA ĐIỂM",
    endpoint: "/locations/all",
    columns: [
      "ma_dd", "toa_nha", "dia_chi", "tang", "phong", "ten_hien_thi",
      "dien_tich", "gia_thue", "phi_dich_vu", "trang_thai", "ghi_chu",
      "ngay_tao", "ngay_cap_nhat",
    ],
  },
  customers: {
    sheetName: "KHÁCH HÀNG",
    endpoint: "/customers",
    columns: ["ma_kh", "sdt", "ho_ten", "email", "nguon", "nguoi_tao", "ngay_tao", "ghi_chu"],
  },
  opportunities: {
    sheetName: "CƠ HỘI",
    endpoint: "/opportunities",
    columns: [
      "ma_ch", "ma_kh", "ten_kh", "sdt", "ten_cong_ty", "mst",
      "nhu_cau_dt", "ngan_sach", "khu_vuc", "dd_quan_tam", "giai_doan",
      "danh_gia", "phu_trach", "lich_su_tu_van", "ly_do_that_bai",
      "ngay_tao", "ngay_cap_nhat", "ngay_thanh_cong", "ngay_that_bai",
    ],
  },
  contracts: {
    sheetName: "HỢP ĐỒNG",
    endpoint: "/contracts",
    columns: [
      "ma_hd", "so_hd", "ma_ch", "ma_dia_diem", "dia_diem", "loai_kh",
      "ten_ben_thue", "dia_chi_ben_thue", "mst", "nguoi_dai_dien", "sdt_dai_dien",
      "ngay_bat_dau", "ngay_ket_thuc", "gia_thue", "phi_dich_vu", "tong_thang",
      "tien_coc", "ky_thanh_toan", "ngay_thanh_toan", "trang_thai", "ghi_chu", "ngay_tao",
    ],
  },
};

/**
 * Add Sync menu on Sheet open
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🔄 Sync")
    .addItem("Đồng bộ từ Database", "syncAllFromAPI")
    .addToUi();
}

/**
 * Sync all sheets from Bun API
 */
function syncAllFromAPI() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const results = [];

  for (const [key, config] of Object.entries(SYNC_SHEETS)) {
    try {
      const count = syncOneSheet(ss, config);
      results.push(key + ": " + count + " rows");
    } catch (e) {
      results.push(key + ": ERROR - " + e.message);
      Logger.log("Sync error for " + key + ": " + e.message);
    }
  }

  // Update sync timestamp
  const msg = "Last sync: " + new Date().toLocaleString("vi-VN") + "\n" + results.join("\n");
  Logger.log(msg);
  SpreadsheetApp.getUi().alert("✅ Đồng bộ hoàn tất", msg, SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Sync one sheet from API endpoint
 */
function syncOneSheet(ss, config) {
  const response = UrlFetchApp.fetch(BUN_API_BASE + config.endpoint, {
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() !== 200) {
    throw new Error("HTTP " + response.getResponseCode());
  }

  const json = JSON.parse(response.getContentText());
  if (!json.success) {
    throw new Error(json.message || "API returned success=false");
  }

  var items = json.data;
  if (!items || items.length === 0) {
    return 0;
  }

  const sheet = ss.getSheetByName(config.sheetName);
  if (!sheet) {
    throw new Error("Sheet not found: " + config.sheetName);
  }

  // Map API data to sheet column order
  const rows = items.map(function (item) {
    return config.columns.map(function (col) {
      var val = item[col];
      if (val === null || val === undefined) return "";
      // Format dates
      if (typeof val === "string" && val.match(/^\d{4}-\d{2}-\d{2}/)) {
        return new Date(val);
      }
      return val;
    });
  });

  // Clear existing data (keep header row)
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, config.columns.length).clearContent();
  }

  // Write new data
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, config.columns.length).setValues(rows);
  }

  return rows.length;
}


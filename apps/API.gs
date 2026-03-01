/**
 * ESG SALE - REST API
 * External frontend: https://sale.ecosmartgroup.vn/
 */

// ==================== WEB APP ENTRY POINTS ====================

function doGet(e) {
  // Handle API request
  if (e && e.parameter && e.parameter.action) {
    return handleApiRequest(e, "GET");
  }

  // No action: return API info
  return ContentService.createTextOutput(
    JSON.stringify({
      name: "ESG Sale API",
      version: "2.0",
      frontend: "https://sale.ecosmartgroup.vn/",
      actions: {
        GET: [
          "getUser",
          "getDashboard",
          "getExpiringContracts",
          "getLocations",
          "getLocationDetails",
          "getCustomers",
          "getOpportunities",
          "getContracts",
        ],
        POST: [
          "addCustomer",
          "addOpportunity",
          "addContract",
          "updateOpportunity",
          "updateContract",
        ],
      },
    }),
  ).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  return handleApiRequest(e, "POST");
}

/**
 * Handle REST API requests
 * @param {Object} e - Event object with parameters
 * @param {string} method - HTTP method (GET or POST)
 * @returns {TextOutput} JSON response
 */
function handleApiRequest(e, method) {
  let action, params;

  if (method === "POST") {
    // Parse POST body
    const body = e.postData ? JSON.parse(e.postData.contents) : {};
    action = body.action;
    params = body.params || {};
  } else {
    action = e.parameter.action;
    params = e.parameter.params ? JSON.parse(e.parameter.params) : {};
  }

  let result;
  try {
    switch (action) {
      // GET actions (read)
      case "getUser":
        result = apiLayThongTinUser();
        break;
      case "getDashboard":
        result = apiLayThongKeDashboard(params);
        break;
      case "getExpiringContracts":
        result = apiLayHopDongSapHetHan(params.days || 30);
        break;
      case "getLocations":
        result = apiLayDanhSachToaNha();
        break;
      case "getLocationDetails":
        result = apiLayChiTietDiaDiem(params.id);
        break;
      case "getCustomers":
        result = apiLayDanhSachKhachHang(params);
        break;
      case "getOpportunities":
        result = apiLayDanhSachCoHoi(params);
        break;
      case "getContracts":
        result = apiLayDanhSachHopDong(params);
        break;
      // POST actions (write)
      case "addCustomer":
        result = apiThemKhachHang(params);
        break;
      case "addOpportunity":
        result = apiThemCoHoi(params);
        break;
      case "updateOpportunity":
        result = apiCapNhatCoHoi(params);
        break;
      case "addContract":
        result = apiThemHopDong(params);
        break;
      default:
        result = { success: false, message: "Unknown action: " + action };
    }
  } catch (error) {
    console.error("API Error:", action, error);
    result = { success: false, message: error.message || error.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

// ==================== CLIENT-CALLABLE FUNCTIONS ====================

/**
 * Lấy thông tin user hiện tại
 */
function apiLayThongTinUser() {
  try {
    const user = nguoiDungHienTai();
    if (!user) {
      return {
        success: false,
        message: "Bạn chưa được đăng ký trong hệ thống",
        email: Session.getActiveUser().getEmail(),
      };
    }
    return { success: true, data: user };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Lấy thống kê dashboard
 */
function apiLayThongKeDashboard(params) {
  try {
    params = params || {};
    const data = layThongKeDashboard(params.thang, params.nam);
    if (!data) {
      return {
        success: false,
        message: "Không thể tải thống kê. Vui lòng đăng nhập lại.",
      };
    }
    return { success: true, data: data };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Lấy danh sách HĐ sắp hết hạn
 */
function apiLayHopDongSapHetHan(soNgay) {
  try {
    soNgay = soNgay || 30;
    const data = layHopDongSapHetHan(soNgay);
    return { success: true, data: data };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Lấy danh sách toà nhà (grouped)
 */
function apiLayDanhSachToaNha() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.DIA_DIEM);

    if (!sheet || sheet.getLastRow() < 2) {
      return { success: true, data: [] };
    }

    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 13).getValues();
    const toaNhaMap = {};

    data.forEach((row) => {
      const toaNha = row[1];
      const diaChi = row[2];

      if (!toaNhaMap[toaNha]) {
        toaNhaMap[toaNha] = {
          ten: toaNha,
          diaChi: diaChi,
          tongPhong: 0,
          trong: 0,
          dangThue: 0,
          giuCho: 0,
          danhSachTang: {},
        };
      }

      toaNhaMap[toaNha].tongPhong++;

      if (row[9] === "Trống") toaNhaMap[toaNha].trong++;
      else if (row[9] === "Đang thuê") toaNhaMap[toaNha].dangThue++;
      else if (row[9] === "Giữ chỗ") toaNhaMap[toaNha].giuCho++;

      const tang = row[3];
      if (!toaNhaMap[toaNha].danhSachTang[tang]) {
        toaNhaMap[toaNha].danhSachTang[tang] = [];
      }
      toaNhaMap[toaNha].danhSachTang[tang].push({
        maDiaDiem: row[0],
        phong: row[4],
        tenHienThi: row[5],
        dienTich: row[6],
        giaThue: row[7],
        phiDichVu: row[8],
        trangThai: row[9],
        ghiChu: row[10],
      });
    });

    return { success: true, data: Object.values(toaNhaMap) };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Lấy danh sách địa điểm
 */
function apiLayDanhSachDiaDiem(filters) {
  try {
    filters = filters || {};
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.DIA_DIEM);

    if (!sheet || sheet.getLastRow() < 2) {
      return { success: true, data: [], total: 0 };
    }

    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 13).getValues();

    let result = data.map((row, index) => ({
      rowIndex: index + 2,
      maDiaDiem: row[0],
      toaNha: row[1],
      diaChi: row[2],
      tang: row[3],
      phong: row[4],
      tenHienThi: row[5],
      dienTich: row[6],
      giaThue: row[7],
      phiDichVu: row[8],
      trangThai: row[9],
      ghiChu: row[10],
      ngayTao: row[11],
      ngayCapNhat: row[12],
    }));

    if (filters.toaNha) {
      result = result.filter((dd) => dd.toaNha === filters.toaNha);
    }
    if (filters.trangThai) {
      result = result.filter((dd) => dd.trangThai === filters.trangThai);
    }
    if (filters.timKiem) {
      const keyword = filters.timKiem.toLowerCase();
      result = result.filter(
        (dd) =>
          dd.tenHienThi.toLowerCase().includes(keyword) ||
          dd.toaNha.toLowerCase().includes(keyword),
      );
    }

    return { success: true, data: result, total: result.length };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Lấy chi tiết địa điểm
 */
function apiLayChiTietDiaDiem(maDiaDiem) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.DIA_DIEM);

    if (!sheet || sheet.getLastRow() < 2) {
      return { success: false, message: "Không tìm thấy địa điểm" };
    }

    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 13).getValues();

    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === maDiaDiem) {
        const hopDongSheet = ss.getSheetByName(CONFIG.SHEETS.HOP_DONG);
        let hopDongHienTai = null;

        if (hopDongSheet && hopDongSheet.getLastRow() > 1) {
          const hdData = hopDongSheet
            .getRange(2, 1, hopDongSheet.getLastRow() - 1, 22)
            .getValues();
          for (let j = 0; j < hdData.length; j++) {
            if (
              hdData[j][3] === maDiaDiem &&
              hdData[j][19] === "Đang hiệu lực"
            ) {
              const ngayKT = new Date(hdData[j][12]);
              const today = new Date();
              const soNgayConLai = Math.ceil(
                (ngayKT - today) / (1000 * 60 * 60 * 24),
              );

              hopDongHienTai = {
                maHD: hdData[j][0],
                soHD: hdData[j][1],
                tenBenThue: hdData[j][6],
                ngayBatDau: hdData[j][11],
                ngayKetThuc: hdData[j][12],
                soNgayConLai: soNgayConLai,
              };
              break;
            }
          }
        }

        return {
          success: true,
          data: {
            rowIndex: i + 2,
            maDiaDiem: data[i][0],
            toaNha: data[i][1],
            diaChi: data[i][2],
            tang: data[i][3],
            phong: data[i][4],
            tenHienThi: data[i][5],
            dienTich: data[i][6],
            giaThue: data[i][7],
            phiDichVu: data[i][8],
            trangThai: data[i][9],
            ghiChu: data[i][10],
            ngayTao: data[i][11],
            ngayCapNhat: data[i][12],
            hopDongHienTai: hopDongHienTai,
          },
        };
      }
    }

    return { success: false, message: "Không tìm thấy địa điểm" };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Thêm địa điểm mới
 */
function apiThemDiaDiem(params) {
  try {
    if (!laAdmin()) {
      return {
        success: false,
        message: "Bạn không có quyền thực hiện chức năng này",
      };
    }

    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.DIA_DIEM);

    const maDiaDiem = taoMaTuDong(sheet, "DD", 1);
    const tenHienThi = `${params.toaNha} - T${params.tang} - P${params.phong}`;

    sheet.appendRow([
      maDiaDiem,
      params.toaNha,
      params.diaChi || "",
      params.tang,
      params.phong,
      tenHienThi,
      params.dienTich || 0,
      params.giaThue || 0,
      params.phiDichVu || 0,
      params.trangThai || "Trống",
      params.ghiChu || "",
      new Date(),
      new Date(),
    ]);

    return {
      success: true,
      message: "Thêm địa điểm thành công",
      data: { maDiaDiem },
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Cập nhật địa điểm
 */
function apiCapNhatDiaDiem(params) {
  try {
    if (!laAdmin()) {
      return {
        success: false,
        message: "Bạn không có quyền thực hiện chức năng này",
      };
    }

    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.DIA_DIEM);
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 13).getValues();

    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === params.maDiaDiem) {
        const rowIndex = i + 2;

        if (params.dienTich !== undefined)
          sheet.getRange(rowIndex, 7).setValue(params.dienTich);
        if (params.giaThue !== undefined)
          sheet.getRange(rowIndex, 8).setValue(params.giaThue);
        if (params.phiDichVu !== undefined)
          sheet.getRange(rowIndex, 9).setValue(params.phiDichVu);
        if (params.trangThai)
          sheet.getRange(rowIndex, 10).setValue(params.trangThai);
        if (params.ghiChu !== undefined)
          sheet.getRange(rowIndex, 11).setValue(params.ghiChu);
        sheet.getRange(rowIndex, 13).setValue(new Date());

        return { success: true, message: "Cập nhật thành công" };
      }
    }

    return { success: false, message: "Không tìm thấy địa điểm" };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// ==================== API KHÁCH HÀNG ====================

/**
 * Lấy danh sách khách hàng
 */
function apiLayDanhSachKhachHang(filters) {
  try {
    console.log("apiLayDanhSachKhachHang called");
    filters = filters || {};
    const ss = getSpreadsheet();
    console.log("Spreadsheet opened:", ss.getName());
    const sheet = ss.getSheetByName(CONFIG.SHEETS.KHACH_HANG);
    console.log("Sheet:", CONFIG.SHEETS.KHACH_HANG, "exists:", !!sheet);

    if (!sheet || sheet.getLastRow() < 2) {
      console.log("Sheet empty or not found");
      return { success: true, data: [], total: 0 };
    }

    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();

    let result = data.map((row, index) => ({
      rowIndex: index + 2,
      maKH: row[0],
      sdt: row[1],
      hoTen: row[2],
      email: row[3],
      nguon: row[4],
      nguoiTao: row[5],
      ngayTao: row[6],
      ghiChu: row[7],
    }));

    if (filters.nguon) {
      result = result.filter((kh) => kh.nguon === filters.nguon);
    }
    if (filters.timKiem) {
      const keyword = filters.timKiem.toLowerCase();
      result = result.filter(
        (kh) =>
          (kh.hoTen && kh.hoTen.toLowerCase().includes(keyword)) ||
          (kh.sdt && kh.sdt.toString().includes(keyword)) ||
          (kh.email && kh.email.toLowerCase().includes(keyword)),
      );
    }

    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;
    const total = result.length;
    const start = (page - 1) * pageSize;
    result = result.slice(start, start + pageSize);

    return {
      success: true,
      data: result,
      total: total,
      page: page,
      pageSize: pageSize,
    };
  } catch (error) {
    console.error("apiLayDanhSachKhachHang error:", error);
    return { success: false, message: error.message || error.toString() };
  }
}

/**
 * Kiểm tra SĐT trùng
 */
function apiKiemTraSdt(sdt) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.KHACH_HANG);

    if (!sheet || sheet.getLastRow() < 2) {
      return { success: true, exists: false };
    }

    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();

    for (let i = 0; i < data.length; i++) {
      if (data[i][1] === sdt) {
        return {
          success: true,
          exists: true,
          data: { maKH: data[i][0], hoTen: data[i][2] },
        };
      }
    }

    return { success: true, exists: false };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Thêm khách hàng (public - for external frontend)
 */
function apiThemKhachHang(params) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.KHACH_HANG);

    const check = apiKiemTraSdt(params.sdt);
    if (check.exists) {
      return {
        success: false,
        message: "Số điện thoại đã tồn tại",
        data: check.data,
      };
    }

    const maKH = taoMaTuDong(sheet, "KH", 1);

    sheet.appendRow([
      maKH,
      params.sdt,
      params.hoTen,
      params.email || "",
      params.nguon || "Trực tiếp",
      user.maNV,
      new Date(),
      params.ghiChu || "",
    ]);

    return {
      success: true,
      message: "Thêm khách hàng thành công",
      data: { maKH },
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// ==================== API CƠ HỘI ====================

/**
 * Lấy danh sách cơ hội
 */
function apiLayDanhSachCoHoi(filters) {
  try {
    filters = filters || {};
    const user = nguoiDungHienTai(); // Optional for filtering

    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.CO_HOI);

    if (!sheet || sheet.getLastRow() < 2) {
      return { success: true, data: [], total: 0 };
    }

    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 19).getValues();

    let result = data.map((row, index) => ({
      rowIndex: index + 2,
      maCH: row[0],
      maKH: row[1],
      tenKH: row[2],
      sdt: row[3],
      tenCongTy: row[4],
      mst: row[5],
      nhuCauDT: row[6],
      nganSach: row[7],
      khuVuc: row[8],
      ddQuanTam: row[9],
      giaiDoan: row[10],
      danhGia: row[11],
      phuTrach: row[12],
      lichSuTuVan: row[13],
      lyDoThatBai: row[14],
      ngayTao: row[15],
      ngayCapNhat: row[16],
      ngayThanhCong: row[17],
      ngayThatBai: row[18],
    }));

    // Lọc theo quyền (chỉ khi có user)
    if (user && user.quyen === "Sale") {
      result = result.filter((ch) => ch.phuTrach === user.maNV);
    }

    if (filters.giaiDoan) {
      result = result.filter((ch) => ch.giaiDoan === filters.giaiDoan);
    }
    if (filters.danhGia) {
      result = result.filter((ch) => ch.danhGia === filters.danhGia);
    }
    if (filters.phuTrach) {
      result = result.filter((ch) => ch.phuTrach === filters.phuTrach);
    }
    if (filters.timKiem) {
      const keyword = filters.timKiem.toLowerCase();
      result = result.filter(
        (ch) =>
          ch.tenKH.toLowerCase().includes(keyword) ||
          ch.sdt.includes(keyword) ||
          (ch.tenCongTy && ch.tenCongTy.toLowerCase().includes(keyword)),
      );
    }

    return { success: true, data: result, total: result.length };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Lấy chi tiết cơ hội (public)
 */
function apiLayChiTietCoHoi(maCoHoi) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.CO_HOI);

    if (!sheet || sheet.getLastRow() < 2) {
      return { success: false, message: "Không tìm thấy cơ hội" };
    }

    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 19).getValues();

    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === maCoHoi) {
        if (user.quyen === "Sale" && data[i][12] !== user.maNV) {
          return {
            success: false,
            message: "Bạn không có quyền xem cơ hội này",
          };
        }

        const nvSheet = ss.getSheetByName(CONFIG.SHEETS.NHAN_VIEN);
        let tenNV = data[i][12];

        if (nvSheet && nvSheet.getLastRow() > 1) {
          const nvData = nvSheet
            .getRange(2, 1, nvSheet.getLastRow() - 1, 3)
            .getValues();
          for (let j = 0; j < nvData.length; j++) {
            if (nvData[j][0] === data[i][12]) {
              tenNV = nvData[j][2];
              break;
            }
          }
        }

        return {
          success: true,
          data: {
            rowIndex: i + 2,
            maCH: data[i][0],
            maKH: data[i][1],
            tenKH: data[i][2],
            sdt: data[i][3],
            tenCongTy: data[i][4],
            mst: data[i][5],
            nhuCauDT: data[i][6],
            nganSach: data[i][7],
            khuVuc: data[i][8],
            ddQuanTam: data[i][9],
            giaiDoan: data[i][10],
            danhGia: data[i][11],
            phuTrach: data[i][12],
            tenPhuTrach: tenNV,
            lichSuTuVan: data[i][13],
            lyDoThatBai: data[i][14],
            ngayTao: data[i][15],
            ngayCapNhat: data[i][16],
            ngayThanhCong: data[i][17],
            ngayThatBai: data[i][18],
          },
        };
      }
    }

    return { success: false, message: "Không tìm thấy cơ hội" };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Thêm cơ hội mới (public - for external frontend)
 */
function apiThemCoHoi(params) {
  try {
    const user = nguoiDungHienTai(); // Optional
    const userMaNV = user ? user.maNV : params.phuTrach || "SYSTEM";

    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.CO_HOI);
    const khSheet = ss.getSheetByName(CONFIG.SHEETS.KHACH_HANG);

    let tenKH = "";
    let sdtKH = "";

    if (khSheet && khSheet.getLastRow() > 1) {
      const khData = khSheet
        .getRange(2, 1, khSheet.getLastRow() - 1, 3)
        .getValues();
      for (let i = 0; i < khData.length; i++) {
        if (khData[i][0] === params.maKH) {
          tenKH = khData[i][2];
          sdtKH = khData[i][1];
          break;
        }
      }
    }

    const maCH = taoMaTuDong(sheet, "CH", 1);
    const phuTrach = params.phuTrach || userMaNV;
    const lichSuBanDau = `[${new Date().toLocaleDateString("vi-VN")} - Tạo mới - ${userMaNV}]\nTạo cơ hội mới từ khách hàng ${tenKH}`;

    sheet.appendRow([
      maCH,
      params.maKH,
      tenKH,
      sdtKH,
      params.tenCongTy || "",
      params.mst || "",
      params.nhuCauDT || "",
      params.nganSach || "",
      params.khuVuc || "",
      params.ddQuanTam || "",
      "Mới",
      params.danhGia || "Suy nghĩ",
      phuTrach,
      lichSuBanDau,
      "",
      new Date(),
      new Date(),
      "",
      "",
    ]);

    return { success: true, message: "Thêm cơ hội thành công", data: { maCH } };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// ==================== API HỢP ĐỒNG ====================

/**
 * Lấy danh sách hợp đồng
 */
function apiLayDanhSachHopDong(filters) {
  try {
    filters = filters || {};
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.HOP_DONG);

    if (!sheet || sheet.getLastRow() < 2) {
      return { success: true, data: [], total: 0 };
    }

    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 22).getValues();
    const today = new Date();

    let result = data.map((row, index) => {
      const ngayKT = new Date(row[12]);
      const soNgayConLai = Math.ceil((ngayKT - today) / (1000 * 60 * 60 * 24));

      return {
        rowIndex: index + 2,
        maHD: row[0],
        soHD: row[1],
        maCH: row[2],
        maDiaDiem: row[3],
        diaDiem: row[4],
        loaiKH: row[5],
        tenBenThue: row[6],
        diaChiBenThue: row[7],
        mst: row[8],
        nguoiDaiDien: row[9],
        sdtDaiDien: row[10],
        ngayBatDau: row[11],
        ngayKetThuc: row[12],
        giaThue: row[13],
        phiDichVu: row[14],
        tongThang: row[15],
        tienCoc: row[16],
        kyThanhToan: row[17],
        ngayThanhToan: row[18],
        trangThai: row[19],
        soNgayConLai: soNgayConLai,
        ngayTao: row[21],
      };
    });

    if (filters.trangThai) {
      result = result.filter((hd) => hd.trangThai === filters.trangThai);
    }
    if (filters.timKiem) {
      const keyword = filters.timKiem.toLowerCase();
      result = result.filter(
        (hd) =>
          hd.soHD.toLowerCase().includes(keyword) ||
          hd.tenBenThue.toLowerCase().includes(keyword) ||
          hd.diaDiem.toLowerCase().includes(keyword),
      );
    }

    return { success: true, data: result, total: result.length };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Lấy chi tiết hợp đồng
 */
function apiLayChiTietHopDong(maHopDong) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.HOP_DONG);

    if (!sheet || sheet.getLastRow() < 2) {
      return { success: false, message: "Không tìm thấy hợp đồng" };
    }

    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 22).getValues();
    const today = new Date();

    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === maHopDong) {
        const ngayKT = new Date(data[i][12]);
        const soNgayConLai = Math.ceil(
          (ngayKT - today) / (1000 * 60 * 60 * 24),
        );

        return {
          success: true,
          data: {
            rowIndex: i + 2,
            maHD: data[i][0],
            soHD: data[i][1],
            maCH: data[i][2],
            maDiaDiem: data[i][3],
            diaDiem: data[i][4],
            loaiKH: data[i][5],
            tenBenThue: data[i][6],
            diaChiBenThue: data[i][7],
            mst: data[i][8],
            nguoiDaiDien: data[i][9],
            sdtDaiDien: data[i][10],
            ngayBatDau: data[i][11],
            ngayKetThuc: data[i][12],
            giaThue: data[i][13],
            phiDichVu: data[i][14],
            tongThang: data[i][15],
            tienCoc: data[i][16],
            kyThanhToan: data[i][17],
            ngayThanhToan: data[i][18],
            trangThai: data[i][19],
            soNgayConLai: soNgayConLai,
            ngayTao: data[i][21],
          },
        };
      }
    }

    return { success: false, message: "Không tìm thấy hợp đồng" };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Thêm hợp đồng mới
 */
function apiThemHopDong(params) {
  try {
    // Public for external frontend (was: Admin only)
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.HOP_DONG);
    const ddSheet = ss.getSheetByName(CONFIG.SHEETS.DIA_DIEM);

    let tenDiaDiem = "";
    if (ddSheet && ddSheet.getLastRow() > 1) {
      const ddData = ddSheet
        .getRange(2, 1, ddSheet.getLastRow() - 1, 6)
        .getValues();
      for (let i = 0; i < ddData.length; i++) {
        if (ddData[i][0] === params.maDiaDiem) {
          tenDiaDiem = ddData[i][5];
          ddSheet.getRange(i + 2, 10).setValue("Đang thuê");
          break;
        }
      }
    }

    const maHD = taoMaTuDong(sheet, "HD", 1);
    const tongThang = (params.giaThue || 0) + (params.phiDichVu || 0);
    const ngayKT = new Date(params.ngayKetThuc);
    const today = new Date();
    const soNgayConLai = Math.ceil((ngayKT - today) / (1000 * 60 * 60 * 24));

    let trangThai = "Đang hiệu lực";
    if (soNgayConLai <= 0) trangThai = "Đã kết thúc";
    else if (soNgayConLai <= 30) trangThai = "Sắp hết hạn";

    sheet.appendRow([
      maHD,
      params.soHD,
      params.maCH || "",
      params.maDiaDiem,
      tenDiaDiem,
      params.loaiKH || "Cá nhân",
      params.tenBenThue,
      params.diaChiBenThue || "",
      params.mst || "",
      params.nguoiDaiDien || "",
      params.sdtDaiDien || "",
      new Date(params.ngayBatDau),
      ngayKT,
      params.giaThue || 0,
      params.phiDichVu || 0,
      tongThang,
      params.tienCoc || 0,
      params.kyThanhToan || "Tháng",
      params.ngayThanhToan || 5,
      trangThai,
      soNgayConLai,
      new Date(),
    ]);

    return {
      success: true,
      message: "Tạo hợp đồng thành công",
      data: { maHD },
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// ==================== API NHÂN VIÊN ====================

function apiLayDanhSachNhanVien() {
  try {
    return {
      success: true,
      data: layDanhSachNhanVien(true),
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

function moWebApp() {
  const html = HtmlService.createHtmlOutput(
    `<script>window.open('https://sale.ecosmartgroup.vn/', '_blank'); google.script.host.close();</script>`,
  );
  SpreadsheetApp.getUi().showModalDialog(html, "Đang mở ESG Sale...");
}

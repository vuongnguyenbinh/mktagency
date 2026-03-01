/**
 * XÁC THỰC VÀ PHÂN QUYỀN
 * Phase 2: Đăng nhập bằng Google Account, phân quyền Admin/Sale
 */

// ==================== XÁC THỰC ====================

/**
 * Lấy thông tin người dùng hiện tại
 */
function nguoiDungHienTai() {
  const email = Session.getActiveUser().getEmail();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.NHAN_VIEN);

  if (!sheet || sheet.getLastRow() < 2) {
    return null;
  }

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();

  for (let i = 0; i < data.length; i++) {
    if (
      data[i][1].toLowerCase() === email.toLowerCase() &&
      data[i][4] === "Hoạt động"
    ) {
      return {
        maNV: data[i][0],
        email: data[i][1],
        hoTen: data[i][2],
        quyen: data[i][3],
        trangThai: data[i][4],
        rowIndex: i + 2,
      };
    }
  }

  return null;
}

/**
 * Kiểm tra quyền Admin
 */
function laAdmin() {
  const user = nguoiDungHienTai();
  return user && user.quyen === "Admin";
}

/**
 * Kiểm tra quyền Sale
 */
function laSale() {
  const user = nguoiDungHienTai();
  return user && user.quyen === "Sale";
}

/**
 * Kiểm tra người dùng đã đăng ký trong hệ thống
 */
function daDangKy() {
  return nguoiDungHienTai() !== null;
}

/**
 * Lấy danh sách nhân viên (cho dropdown)
 */
function layDanhSachNhanVien(chiHoatDong = true) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.NHAN_VIEN);

  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues();

  return data
    .filter((row) => !chiHoatDong || row[4] === "Hoạt động")
    .map((row) => ({
      maNV: row[0],
      email: row[1],
      hoTen: row[2],
      quyen: row[3],
      trangThai: row[4],
    }));
}

/**
 * Lấy danh sách nhân viên Sale (cho assign cơ hội)
 */
function layDanhSachSale() {
  return layDanhSachNhanVien(true).filter((nv) => nv.quyen === "Sale");
}

// ==================== QUẢN LÝ NHÂN VIÊN ====================

/**
 * Thêm nhân viên mới
 */
function themNhanVien(email, hoTen, quyen) {
  // Kiểm tra quyền
  if (!laAdmin()) {
    return {
      success: false,
      message: "Bạn không có quyền thực hiện chức năng này",
    };
  }

  // Validate
  if (!email || !hoTen || !quyen) {
    return { success: false, message: "Vui lòng điền đầy đủ thông tin" };
  }

  if (!CONFIG.OPTIONS.QUYEN.includes(quyen)) {
    return { success: false, message: "Quyền không hợp lệ" };
  }

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.NHAN_VIEN);

  // Kiểm tra email đã tồn tại
  if (sheet.getLastRow() > 1) {
    const emails = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues();
    for (let i = 0; i < emails.length; i++) {
      if (emails[i][0].toLowerCase() === email.toLowerCase()) {
        return { success: false, message: "Email đã tồn tại trong hệ thống" };
      }
    }
  }

  // Tạo mã nhân viên mới
  const maNV = taoMaTuDong(sheet, "NV", 1);

  // Thêm dữ liệu
  sheet.appendRow([maNV, email, hoTen, quyen, "Hoạt động", new Date()]);

  return {
    success: true,
    message: "Thêm nhân viên thành công",
    data: { maNV, email, hoTen, quyen },
  };
}

/**
 * Cập nhật thông tin nhân viên
 */
function capNhatNhanVien(maNV, hoTen, quyen, trangThai) {
  // Kiểm tra quyền
  if (!laAdmin()) {
    return {
      success: false,
      message: "Bạn không có quyền thực hiện chức năng này",
    };
  }

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.NHAN_VIEN);

  if (sheet.getLastRow() < 2) {
    return { success: false, message: "Không tìm thấy nhân viên" };
  }

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();

  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === maNV) {
      const rowIndex = i + 2;

      if (hoTen) sheet.getRange(rowIndex, 3).setValue(hoTen);
      if (quyen && CONFIG.OPTIONS.QUYEN.includes(quyen)) {
        sheet.getRange(rowIndex, 4).setValue(quyen);
      }
      if (trangThai && CONFIG.OPTIONS.TRANG_THAI_NV.includes(trangThai)) {
        sheet.getRange(rowIndex, 5).setValue(trangThai);
      }

      return { success: true, message: "Cập nhật thành công" };
    }
  }

  return { success: false, message: "Không tìm thấy nhân viên" };
}

/**
 * Xóa nhân viên (chuyển trạng thái nghỉ việc)
 */
function xoaNhanVien(maNV) {
  return capNhatNhanVien(maNV, null, null, "Nghỉ việc");
}

/**
 * Mở trang quản lý nhân viên (external frontend)
 */
function quanLyNhanVien() {
  if (!laAdmin()) {
    SpreadsheetApp.getUi().alert(
      "❌ Lỗi",
      "Bạn không có quyền truy cập chức năng này",
      SpreadsheetApp.getUi().ButtonSet.OK,
    );
    return;
  }

  const html = HtmlService.createHtmlOutput(
    `<script>window.open('https://sale.ecosmartgroup.vn/', '_blank'); google.script.host.close();</script>`,
  );
  SpreadsheetApp.getUi().showModalDialog(html, "Đang mở ESG Sale...");
}

// ==================== KIỂM TRA QUYỀN TRUY CẬP DỮ LIỆU ====================

/**
 * Kiểm tra quyền xem cơ hội
 * Admin: Xem tất cả
 * Sale: Chỉ xem của mình
 */
function coQuyenXemCoHoi(maCoHoi) {
  const user = nguoiDungHienTai();
  if (!user) return false;
  if (user.quyen === "Admin") return true;

  // Sale chỉ xem cơ hội của mình
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.CO_HOI);

  if (sheet.getLastRow() < 2) return false;

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 13).getValues();

  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === maCoHoi) {
      return data[i][12] === user.maNV; // Cột phụ trách
    }
  }

  return false;
}

/**
 * Kiểm tra quyền sửa cơ hội
 */
function coQuyenSuaCoHoi(maCoHoi) {
  return coQuyenXemCoHoi(maCoHoi); // Cùng logic
}

/**
 * Lấy danh sách cơ hội theo quyền
 */
function layCoHoiTheoQuyen(filters = {}) {
  const user = nguoiDungHienTai();
  if (!user) return [];

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.CO_HOI);

  if (sheet.getLastRow() < 2) return [];

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

  // Lọc theo quyền
  if (user.quyen === "Sale") {
    result = result.filter((ch) => ch.phuTrach === user.maNV);
  }

  // Áp dụng filters
  if (filters.giaiDoan) {
    result = result.filter((ch) => ch.giaiDoan === filters.giaiDoan);
  }
  if (filters.danhGia) {
    result = result.filter((ch) => ch.danhGia === filters.danhGia);
  }
  if (filters.phuTrach) {
    result = result.filter((ch) => ch.phuTrach === filters.phuTrach);
  }
  if (filters.tuNgay) {
    const tuNgay = new Date(filters.tuNgay);
    result = result.filter((ch) => new Date(ch.ngayTao) >= tuNgay);
  }
  if (filters.denNgay) {
    const denNgay = new Date(filters.denNgay);
    result = result.filter((ch) => new Date(ch.ngayTao) <= denNgay);
  }
  if (filters.timKiem) {
    const keyword = filters.timKiem.toLowerCase();
    result = result.filter(
      (ch) =>
        ch.tenKH.toLowerCase().includes(keyword) ||
        ch.sdt.includes(keyword) ||
        ch.tenCongTy.toLowerCase().includes(keyword),
    );
  }

  return result;
}

// ==================== THỐNG KÊ THEO QUYỀN ====================

/**
 * Lấy thống kê dashboard (public - no auth required)
 */
function layThongKeDashboard(thang, nam) {
  const ss = getSpreadsheet();
  const user = nguoiDungHienTai(); // Optional, for filtering

  // Lấy dữ liệu cơ hội
  const coHoiSheet = ss.getSheetByName(CONFIG.SHEETS.CO_HOI);
  if (!coHoiSheet || coHoiSheet.getLastRow() < 2) {
    return {
      tongCoHoi: 0,
      thanhCong: 0,
      thatBai: 0,
      tyLeChuyenDoi: 0,
      theoGiaiDoan: {},
      theoNhanVien: [],
    };
  }

  let coHoiData = coHoiSheet
    .getRange(2, 1, coHoiSheet.getLastRow() - 1, 19)
    .getValues();

  // Lọc theo quyền (chỉ khi có user)
  if (user && user.quyen === "Sale") {
    coHoiData = coHoiData.filter((row) => row[12] === user.maNV);
  }

  // Lọc theo tháng/năm nếu có
  if (thang && nam) {
    coHoiData = coHoiData.filter((row) => {
      const ngayTao = new Date(row[15]);
      return ngayTao.getMonth() + 1 === thang && ngayTao.getFullYear() === nam;
    });
  }

  // Tính toán
  const tongCoHoi = coHoiData.length;
  const thanhCong = coHoiData.filter((row) => row[10] === "Thành công").length;
  const thatBai = coHoiData.filter((row) => row[10] === "Thất bại").length;
  const tyLeChuyenDoi =
    tongCoHoi > 0 ? Math.round((thanhCong / tongCoHoi) * 100 * 10) / 10 : 0;

  // Thống kê theo giai đoạn
  const theoGiaiDoan = {};
  CONFIG.OPTIONS.GIAI_DOAN.forEach((gd) => {
    theoGiaiDoan[gd] = coHoiData.filter((row) => row[10] === gd).length;
  });

  // Thống kê theo nhân viên (public view, or Admin only if needed)
  let theoNhanVien = [];
  if (!user || user.quyen === "Admin") {
    const nhanVienList = layDanhSachNhanVien(true);
    theoNhanVien = nhanVienList
      .map((nv) => {
        const coHoiNV = coHoiData.filter((row) => row[12] === nv.maNV);
        const tcNV = coHoiNV.filter((row) => row[10] === "Thành công").length;
        return {
          maNV: nv.maNV,
          hoTen: nv.hoTen,
          tongCoHoi: coHoiNV.length,
          thanhCong: tcNV,
          tyLe:
            coHoiNV.length > 0
              ? Math.round((tcNV / coHoiNV.length) * 100 * 10) / 10
              : 0,
        };
      })
      .filter((nv) => nv.tongCoHoi > 0);
  }

  return {
    tongCoHoi,
    thanhCong,
    thatBai,
    tyLeChuyenDoi,
    theoGiaiDoan,
    theoNhanVien,
  };
}

/**
 * Lấy danh sách hợp đồng sắp hết hạn
 */
function layHopDongSapHetHan(soNgay = 30) {
  const user = nguoiDungHienTai();
  if (!user) return [];

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.HOP_DONG);

  if (!sheet || sheet.getLastRow() < 2) return [];

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 22).getValues();
  const today = new Date();

  let result = data
    .map((row, index) => {
      const ngayKT = new Date(row[12]);
      const soNgayConLai = Math.ceil((ngayKT - today) / (1000 * 60 * 60 * 24));

      return {
        rowIndex: index + 2,
        maHD: row[0],
        soHD: row[1],
        diaDiem: row[4],
        tenBenThue: row[6],
        ngayKetThuc: row[12],
        soNgayConLai: soNgayConLai,
        tongThang: row[15],
        trangThai: row[19],
      };
    })
    .filter((hd) => hd.soNgayConLai > 0 && hd.soNgayConLai <= soNgay)
    .sort((a, b) => a.soNgayConLai - b.soNgayConLai);

  return result;
}

// ==================== HELPER API CHO WEB APP ====================

/**
 * API endpoint để lấy thông tin user (gọi từ Web App)
 */
function apiLayThongTinUser() {
  const user = nguoiDungHienTai();
  if (!user) {
    return {
      success: false,
      message: "Bạn chưa được đăng ký trong hệ thống. Vui lòng liên hệ Admin.",
      email: Session.getActiveUser().getEmail(),
    };
  }

  return {
    success: true,
    data: user,
  };
}

/**
 * API endpoint để kiểm tra quyền
 */
function apiKiemTraQuyen(quyen) {
  const user = nguoiDungHienTai();
  if (!user) return false;

  if (quyen === "Admin") return user.quyen === "Admin";
  if (quyen === "Sale") return user.quyen === "Sale" || user.quyen === "Admin";

  return false;
}

/**
 * DỮ LIỆU MẪU CHO ESG SALE
 * Dữ liệu demo các toà nhà văn phòng tại Hà Nội
 */

/**
 * Tạo toàn bộ dữ liệu mẫu
 */
function taoDuLieuMau() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    "📊 Tạo dữ liệu mẫu",
    "Bạn có chắc muốn tạo dữ liệu mẫu cho ESG Sale?\n\nHành động này sẽ thêm dữ liệu demo:\n- 10 nhân viên\n- ~100 địa điểm (5 toà nhà tại Hà Nội)\n- 50 khách hàng\n- 40 cơ hội\n- 15 hợp đồng",
    ui.ButtonSet.YES_NO,
  );

  if (response !== ui.Button.YES) return;

  try {
    const ss = getSpreadsheet();

    // Tạo dữ liệu theo thứ tự
    taoDuLieuNhanVien(ss);
    taoDuLieuDiaDiem(ss);
    taoDuLieuKhachHang(ss);
    taoDuLieuCoHoi(ss);
    taoDuLieuHopDong(ss);

    ui.alert(
      "✅ Thành công",
      "Đã tạo dữ liệu mẫu cho ESG Sale thành công!",
      ui.ButtonSet.OK,
    );
  } catch (error) {
    ui.alert("❌ Lỗi", "Có lỗi xảy ra: " + error.message, ui.ButtonSet.OK);
  }
}

/**
 * Tạo dữ liệu mẫu Nhân viên
 */
function taoDuLieuNhanVien(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.NHAN_VIEN);
  if (!sheet) return;

  const nhanVien = [
    [
      "NV001",
      "admin@esgsale.vn",
      "Nguyễn Văn Admin",
      "Admin",
      "Hoạt động",
      new Date("2024-01-01"),
    ],
    [
      "NV002",
      "sale1@esgsale.vn",
      "Trần Thị An",
      "Sale",
      "Hoạt động",
      new Date("2024-01-15"),
    ],
    [
      "NV003",
      "sale2@esgsale.vn",
      "Lê Văn Bình",
      "Sale",
      "Hoạt động",
      new Date("2024-02-01"),
    ],
    [
      "NV004",
      "sale3@esgsale.vn",
      "Phạm Thị Chi",
      "Sale",
      "Hoạt động",
      new Date("2024-02-15"),
    ],
    [
      "NV005",
      "sale4@esgsale.vn",
      "Hoàng Văn Dũng",
      "Sale",
      "Hoạt động",
      new Date("2024-03-01"),
    ],
    [
      "NV006",
      "sale5@esgsale.vn",
      "Vũ Thị Em",
      "Sale",
      "Hoạt động",
      new Date("2024-03-15"),
    ],
    [
      "NV007",
      "sale6@esgsale.vn",
      "Đặng Văn Phúc",
      "Sale",
      "Hoạt động",
      new Date("2024-04-01"),
    ],
    [
      "NV008",
      "sale7@esgsale.vn",
      "Bùi Thị Giang",
      "Sale",
      "Hoạt động",
      new Date("2024-04-15"),
    ],
    [
      "NV009",
      "sale8@esgsale.vn",
      "Ngô Văn Hùng",
      "Sale",
      "Nghỉ việc",
      new Date("2024-05-01"),
    ],
    [
      "NV010",
      "manager@esgsale.vn",
      "Đinh Thị Lan",
      "Admin",
      "Hoạt động",
      new Date("2024-01-01"),
    ],
  ];

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).clear();
  }

  sheet.getRange(2, 1, nhanVien.length, 6).setValues(nhanVien);
}

/**
 * Tạo dữ liệu mẫu Địa điểm - Các toà nhà tại Hà Nội
 */
function taoDuLieuDiaDiem(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.DIA_DIEM);
  if (!sheet) return;

  // Các toà nhà văn phòng tại Hà Nội
  const toaNha = [
    {
      ten: "Keangnam Landmark",
      diaChi: "E6 Phạm Hùng, Nam Từ Liêm, Hà Nội",
      tang: 5,
      phongMoiTang: 4,
    },
    {
      ten: "Lotte Center",
      diaChi: "54 Liễu Giai, Ba Đình, Hà Nội",
      tang: 6,
      phongMoiTang: 5,
    },
    {
      ten: "Capital Tower",
      diaChi: "109 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội",
      tang: 4,
      phongMoiTang: 4,
    },
    {
      ten: "Eurowindow",
      diaChi: "2 Tôn Thất Tùng, Đống Đa, Hà Nội",
      tang: 5,
      phongMoiTang: 3,
    },
    {
      ten: "Grand Plaza",
      diaChi: "117 Trần Duy Hưng, Cầu Giấy, Hà Nội",
      tang: 4,
      phongMoiTang: 4,
    },
  ];

  const trangThai = ["Trống", "Đang thuê", "Đang thuê", "Đang thuê", "Giữ chỗ"]; // Tỷ lệ
  const dienTich = [30, 35, 40, 45, 50, 55, 60, 70, 80];
  const giaThueCoBan = [
    12000000, 15000000, 18000000, 20000000, 25000000, 30000000,
  ];

  let diaDiem = [];
  let maDD = 1;

  toaNha.forEach((toa, toaIndex) => {
    for (let tang = 1; tang <= toa.tang; tang++) {
      for (let phong = 1; phong <= toa.phongMoiTang; phong++) {
        const maPhong = String(tang) + String(phong).padStart(2, "0");
        const dt = dienTich[Math.floor(Math.random() * dienTich.length)];
        const gia =
          giaThueCoBan[Math.floor(Math.random() * giaThueCoBan.length)];
        const phiDV = Math.round(gia * 0.15); // 15% phí dịch vụ
        const tt = trangThai[Math.floor(Math.random() * trangThai.length)];

        diaDiem.push([
          "DD" + String(maDD).padStart(3, "0"),
          toa.ten,
          toa.diaChi,
          tang,
          maPhong,
          `${toa.ten} - T${tang} - P${maPhong}`,
          dt,
          gia,
          phiDV,
          tt,
          dt >= 50
            ? "Phòng lớn, phù hợp team 10+ người"
            : "Phòng vừa, phù hợp team 5-8 người",
          new Date("2024-01-01"),
          new Date(),
        ]);
        maDD++;
      }
    }
  });

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 13).clear();
  }

  sheet.getRange(2, 1, diaDiem.length, 13).setValues(diaDiem);
}

/**
 * Tạo dữ liệu mẫu Khách hàng
 */
function taoDuLieuKhachHang(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.KHACH_HANG);
  if (!sheet) return;

  const ho = [
    "Nguyễn",
    "Trần",
    "Lê",
    "Phạm",
    "Hoàng",
    "Vũ",
    "Đặng",
    "Bùi",
    "Ngô",
    "Đinh",
  ];
  const tenDem = [
    "Văn",
    "Thị",
    "Hữu",
    "Minh",
    "Đức",
    "Quang",
    "Thanh",
    "Hoàng",
  ];
  const ten = [
    "An",
    "Bình",
    "Chi",
    "Dũng",
    "Em",
    "Phúc",
    "Giang",
    "Hùng",
    "Lan",
    "Mai",
    "Nam",
    "Oanh",
    "Phong",
    "Quân",
    "Sơn",
    "Tâm",
    "Uyên",
    "Vinh",
    "Xuân",
    "Yến",
  ];
  const nguon = CONFIG.OPTIONS.NGUON_KHACH;
  const nhanVien = [
    "NV002",
    "NV003",
    "NV004",
    "NV005",
    "NV006",
    "NV007",
    "NV008",
  ];

  let khachHang = [];

  for (let i = 1; i <= 50; i++) {
    const hoTen =
      ho[Math.floor(Math.random() * ho.length)] +
      " " +
      tenDem[Math.floor(Math.random() * tenDem.length)] +
      " " +
      ten[Math.floor(Math.random() * ten.length)];
    const sdt = "09" + Math.floor(Math.random() * 90000000 + 10000000);
    const email =
      hoTen
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .replace(/\s+/g, ".") + "@gmail.com";

    const ngayTao = new Date("2024-01-01");
    ngayTao.setDate(ngayTao.getDate() + Math.floor(Math.random() * 365));

    khachHang.push([
      "KH" + String(i).padStart(3, "0"),
      sdt,
      hoTen,
      email,
      nguon[Math.floor(Math.random() * nguon.length)],
      nhanVien[Math.floor(Math.random() * nhanVien.length)],
      ngayTao,
      "",
    ]);
  }

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).clear();
  }

  sheet.getRange(2, 1, khachHang.length, 8).setValues(khachHang);
}

/**
 * Tạo dữ liệu mẫu Cơ hội
 */
function taoDuLieuCoHoi(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.CO_HOI);
  const khSheet = ss.getSheetByName(CONFIG.SHEETS.KHACH_HANG);
  if (!sheet || !khSheet) return;

  // Lấy danh sách khách hàng
  const khachHangData = khSheet
    .getRange(2, 1, khSheet.getLastRow() - 1, 4)
    .getValues();

  const congTy = [
    "Công ty TNHH ABC Tech",
    "Công ty CP XYZ Media",
    "Công ty 123 Consulting",
    "Doanh nghiệp DEF Solutions",
    "Start-up GHI Innovation",
    "Công ty Tech JKL",
    "Agency MNO Creative",
    "Studio PQR Design",
    "",
    "",
    "",
  ];
  const dienTich = ["20-30m²", "30-40m²", "40-50m²", "50-70m²", "70-100m²"];
  const nganSach = [
    12000000, 15000000, 18000000, 20000000, 25000000, 30000000, 35000000,
  ];
  const khuVuc = [
    "Nam Từ Liêm",
    "Ba Đình",
    "Hoàn Kiếm",
    "Đống Đa",
    "Cầu Giấy",
    "Thanh Xuân",
  ];
  const giaiDoan = CONFIG.OPTIONS.GIAI_DOAN;
  const danhGia = CONFIG.OPTIONS.DANH_GIA;
  const nhanVien = [
    "NV002",
    "NV003",
    "NV004",
    "NV005",
    "NV006",
    "NV007",
    "NV008",
  ];
  const diaDiem = [
    "DD001",
    "DD002",
    "DD005",
    "DD010",
    "DD015",
    "DD020",
    "DD025",
  ];

  let coHoi = [];

  for (let i = 0; i < 40; i++) {
    const kh = khachHangData[i];
    const ct = congTy[Math.floor(Math.random() * congTy.length)];
    const gd = giaiDoan[Math.floor(Math.random() * giaiDoan.length)];

    const ngayTao = new Date("2024-06-01");
    ngayTao.setDate(ngayTao.getDate() + Math.floor(Math.random() * 180));

    // Tạo lịch sử tư vấn mẫu
    let lichSu = "";
    const soLanTuVan = Math.floor(Math.random() * 4) + 1;

    for (let j = 0; j < soLanTuVan; j++) {
      const ngayTV = new Date(ngayTao);
      ngayTV.setDate(ngayTV.getDate() + j * 3);
      const loaiTV =
        CONFIG.OPTIONS.LOAI_TUONG_TAC[
          Math.floor(Math.random() * CONFIG.OPTIONS.LOAI_TUONG_TAC.length)
        ];
      const nv = nhanVien[Math.floor(Math.random() * nhanVien.length)];

      lichSu += `[${ngayTV.toLocaleDateString("vi-VN")} - ${loaiTV} - ${nv}]\n`;
      lichSu += `Nội dung trao đổi lần ${j + 1}. Khách hàng quan tâm đến vị trí và giá thuê tại Hà Nội.\n`;
      if (j < soLanTuVan - 1) lichSu += "---\n";
    }

    let lyDoThatBai = "";
    let ngayThanhCong = "";
    let ngayThatBai = "";

    if (gd === "Thất bại") {
      lyDoThatBai =
        CONFIG.OPTIONS.LY_DO_THAT_BAI[
          Math.floor(Math.random() * CONFIG.OPTIONS.LY_DO_THAT_BAI.length)
        ];
      const d = new Date(ngayTao);
      d.setDate(d.getDate() + 14);
      ngayThatBai = d;
    } else if (gd === "Thành công") {
      const d = new Date(ngayTao);
      d.setDate(d.getDate() + 14);
      ngayThanhCong = d;
    }

    coHoi.push([
      "CH" + String(i + 1).padStart(3, "0"),
      kh[0], // Mã KH
      kh[2], // Tên KH
      kh[1], // SĐT
      ct,
      ct ? "0" + Math.floor(Math.random() * 900000000 + 100000000) : "",
      dienTich[Math.floor(Math.random() * dienTich.length)],
      nganSach[Math.floor(Math.random() * nganSach.length)],
      khuVuc[Math.floor(Math.random() * khuVuc.length)],
      diaDiem.slice(0, Math.floor(Math.random() * 3) + 1).join(", "),
      gd,
      danhGia[Math.floor(Math.random() * danhGia.length)],
      nhanVien[Math.floor(Math.random() * nhanVien.length)],
      lichSu,
      lyDoThatBai,
      ngayTao,
      new Date(),
      ngayThanhCong,
      ngayThatBai,
    ]);
  }

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 19).clear();
  }

  sheet.getRange(2, 1, coHoi.length, 19).setValues(coHoi);
}

/**
 * Tạo dữ liệu mẫu Hợp đồng
 */
function taoDuLieuHopDong(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.HOP_DONG);
  const coHoiSheet = ss.getSheetByName(CONFIG.SHEETS.CO_HOI);
  const diadiemSheet = ss.getSheetByName(CONFIG.SHEETS.DIA_DIEM);

  if (!sheet || !coHoiSheet || !diadiemSheet) return;

  // Lấy các cơ hội thành công
  const coHoiData = coHoiSheet
    .getRange(2, 1, coHoiSheet.getLastRow() - 1, 19)
    .getValues();
  const coHoiThanhCong = coHoiData.filter((row) => row[10] === "Thành công");

  // Lấy địa điểm đang thuê
  const diadiemData = diadiemSheet
    .getRange(2, 1, diadiemSheet.getLastRow() - 1, 13)
    .getValues();
  const diaDiemDangThue = diadiemData.filter((row) => row[9] === "Đang thuê");

  let hopDong = [];
  const soHD = Math.min(coHoiThanhCong.length, diaDiemDangThue.length, 15);

  for (let i = 0; i < soHD; i++) {
    const ch = coHoiThanhCong[i];
    const dd = diaDiemDangThue[i];

    const ngayBD = new Date("2024-01-01");
    ngayBD.setMonth(ngayBD.getMonth() + Math.floor(Math.random() * 12));

    const ngayKT = new Date(ngayBD);
    ngayKT.setFullYear(ngayKT.getFullYear() + 1);

    const giaThu = dd[7];
    const phiDV = dd[8];

    // Tính số ngày còn lại
    const today = new Date();
    const soNgayConLai = Math.ceil((ngayKT - today) / (1000 * 60 * 60 * 24));

    let trangThai = "Đang hiệu lực";
    if (soNgayConLai <= 0) {
      trangThai = "Đã kết thúc";
    } else if (soNgayConLai <= 30) {
      trangThai = "Sắp hết hạn";
    }

    hopDong.push([
      "HD" + String(i + 1).padStart(3, "0"),
      "HD-2024-" + String(i + 1).padStart(3, "0"),
      ch[0], // Mã CH
      dd[0], // Mã ĐĐ
      dd[5], // Tên địa điểm
      ch[4] ? "Doanh nghiệp" : "Cá nhân",
      ch[4] || ch[2], // Tên bên thuê
      "123 Đường ABC, Quận XYZ, Hà Nội",
      ch[5], // MST
      ch[2], // Người đại diện
      ch[3], // SĐT
      ngayBD,
      ngayKT,
      giaThu,
      phiDV,
      giaThu + phiDV, // Tổng/tháng
      giaThu * 2, // Tiền cọc
      "Tháng",
      5, // Ngày thanh toán
      trangThai,
      soNgayConLai,
      new Date(),
    ]);
  }

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 22).clear();
  }

  if (hopDong.length > 0) {
    sheet.getRange(2, 1, hopDong.length, 22).setValues(hopDong);
  }
}

/**
 * Reset toàn bộ dữ liệu
 */
function resetDuLieu() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    "⚠️ Cảnh báo",
    "Bạn có chắc muốn XÓA TOÀN BỘ dữ liệu ESG Sale?\n\nHành động này KHÔNG THỂ hoàn tác!",
    ui.ButtonSet.YES_NO,
  );

  if (response !== ui.Button.YES) return;

  // Xác nhận lần 2
  const response2 = ui.alert(
    "⚠️ Xác nhận lần cuối",
    "Đây là cảnh báo cuối cùng!\n\nNhấn YES để xóa tất cả dữ liệu.",
    ui.ButtonSet.YES_NO,
  );

  if (response2 !== ui.Button.YES) return;

  try {
    const ss = getSpreadsheet();

    Object.values(CONFIG.SHEETS).forEach((sheetName) => {
      const sheet = ss.getSheetByName(sheetName);
      if (sheet && sheet.getLastRow() > 1) {
        sheet
          .getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn())
          .clear();
      }
    });

    ui.alert(
      "✅ Thành công",
      "Đã xóa toàn bộ dữ liệu ESG Sale!",
      ui.ButtonSet.OK,
    );
  } catch (error) {
    ui.alert("❌ Lỗi", "Có lỗi xảy ra: " + error.message, ui.ButtonSet.OK);
  }
}

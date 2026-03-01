-- =============================================
-- CRM SCHEMA FOR ecosmart_db
-- Run inside: ecosmart-postgres container
-- DB: ecosmart_db, User: ecosmart
-- =============================================

-- 1. EMPLOYEES
CREATE TABLE IF NOT EXISTS nhan_vien (
    ma_nv       VARCHAR(10) PRIMARY KEY,
    email       VARCHAR(255) UNIQUE NOT NULL,
    ho_ten      VARCHAR(255) NOT NULL,
    quyen       VARCHAR(20) CHECK (quyen IN ('Admin', 'Sale')) DEFAULT 'Sale',
    trang_thai  VARCHAR(50) DEFAULT 'Hoat dong',
    ngay_tao    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CUSTOMERS
CREATE TABLE IF NOT EXISTS khach_hang (
    ma_kh       VARCHAR(10) PRIMARY KEY,
    sdt         VARCHAR(20) UNIQUE,
    ho_ten      VARCHAR(255) NOT NULL,
    email       VARCHAR(255),
    cong_ty     VARCHAR(255),
    nguon       VARCHAR(50),
    nguoi_tao   VARCHAR(10) REFERENCES nhan_vien(ma_nv),
    ghi_chu     TEXT,
    ngay_tao    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_khach_hang_nguon ON khach_hang(nguon);
CREATE INDEX IF NOT EXISTS idx_khach_hang_nguoi_tao ON khach_hang(nguoi_tao);

-- 3. LOCATIONS (rooms/offices)
CREATE TABLE IF NOT EXISTS dia_diem (
    ma_dd           VARCHAR(10) PRIMARY KEY,
    toa_nha         VARCHAR(255) NOT NULL,
    dia_chi         VARCHAR(500),
    tang            INTEGER,
    phong           INTEGER,
    ten_hien_thi    VARCHAR(255),
    dien_tich       NUMERIC(10,2),
    gia_thue        NUMERIC(15,0),
    phi_dich_vu     NUMERIC(15,0),
    trang_thai      VARCHAR(50) DEFAULT 'Trong',
    ghi_chu         TEXT,
    ngay_tao        TIMESTAMPTZ DEFAULT NOW(),
    ngay_cap_nhat   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dia_diem_toa_nha ON dia_diem(toa_nha);
CREATE INDEX IF NOT EXISTS idx_dia_diem_trang_thai ON dia_diem(trang_thai);

-- 4. OPPORTUNITIES
CREATE TABLE IF NOT EXISTS co_hoi (
    ma_ch           VARCHAR(10) PRIMARY KEY,
    ma_kh           VARCHAR(255),
    ten_kh          VARCHAR(255),
    sdt             VARCHAR(20),
    ten_cong_ty     VARCHAR(255),
    mst             VARCHAR(20),
    nhu_cau_dt      VARCHAR(255),
    ngan_sach       TEXT,
    khu_vuc         VARCHAR(100),
    dd_quan_tam     VARCHAR(255),
    giai_doan       VARCHAR(50) DEFAULT 'Moi',
    danh_gia        VARCHAR(50),
    phu_trach       VARCHAR(255),
    lich_su_tu_van  TEXT,
    ly_do_that_bai  TEXT,
    ngay_tao        TIMESTAMPTZ DEFAULT NOW(),
    ngay_cap_nhat   TIMESTAMPTZ DEFAULT NOW(),
    ngay_thanh_cong TIMESTAMPTZ,
    ngay_that_bai   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_co_hoi_giai_doan ON co_hoi(giai_doan);
CREATE INDEX IF NOT EXISTS idx_co_hoi_phu_trach ON co_hoi(phu_trach);
CREATE INDEX IF NOT EXISTS idx_co_hoi_ma_kh ON co_hoi(ma_kh);

-- 5. CONTRACTS
CREATE TABLE IF NOT EXISTS hop_dong (
    ma_hd           VARCHAR(10) PRIMARY KEY,
    so_hd           VARCHAR(50),
    ma_ch           VARCHAR(10) REFERENCES co_hoi(ma_ch),
    ma_dia_diem     VARCHAR(10) REFERENCES dia_diem(ma_dd),
    dia_diem        VARCHAR(255),
    loai_kh         VARCHAR(50),
    ten_ben_thue    VARCHAR(255),
    dia_chi_ben_thue VARCHAR(500),
    mst             VARCHAR(20),
    nguoi_dai_dien  VARCHAR(255),
    sdt_dai_dien    VARCHAR(20),
    ngay_bat_dau    DATE,
    ngay_ket_thuc   DATE,
    gia_thue        NUMERIC(15,0),
    phi_dich_vu     NUMERIC(15,0),
    tong_thang      NUMERIC(15,0),
    tien_coc        NUMERIC(15,0),
    ky_thanh_toan   VARCHAR(50),
    ngay_thanh_toan INTEGER,
    trang_thai      VARCHAR(50) DEFAULT 'Dang hieu luc',
    ghi_chu         TEXT,
    ngay_tao        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hop_dong_trang_thai ON hop_dong(trang_thai);
CREATE INDEX IF NOT EXISTS idx_hop_dong_ma_dia_diem ON hop_dong(ma_dia_diem);
CREATE INDEX IF NOT EXISTS idx_hop_dong_ngay_ket_thuc ON hop_dong(ngay_ket_thuc);

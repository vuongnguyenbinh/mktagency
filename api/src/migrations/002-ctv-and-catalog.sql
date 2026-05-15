-- =============================================
-- MIGRATION 002: CTV (Collaborators) + Public Catalog
-- Run inside: ecosmart-postgres container
-- DB: ecosmart_db, User: ecosmart
-- Idempotent: safe to re-run.
-- =============================================

-- 1. COLLABORATORS (CTV) — registration submissions
CREATE TABLE IF NOT EXISTS cong_tac_vien (
    ma_ctv          VARCHAR(10) PRIMARY KEY,
    ho_ten          VARCHAR(255) NOT NULL,
    sdt             VARCHAR(20) UNIQUE NOT NULL,
    email           VARCHAR(255),
    cccd            VARCHAR(20),
    dia_chi         VARCHAR(500),
    ngan_hang       VARCHAR(100),
    so_tk           VARCHAR(50),
    chu_tk          VARCHAR(255),
    ghi_chu         TEXT,
    trang_thai      VARCHAR(50) DEFAULT 'Moi',
    ngay_dang_ky    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ctv_trang_thai ON cong_tac_vien(trang_thai);

-- 2. EXTEND dia_diem — public catalog fields
ALTER TABLE dia_diem ADD COLUMN IF NOT EXISTS mo_ta TEXT;
ALTER TABLE dia_diem ADD COLUMN IF NOT EXISTS tien_ich TEXT;
ALTER TABLE dia_diem ADD COLUMN IF NOT EXISTS hien_thi_public BOOLEAN DEFAULT true;

-- =============================================
-- ROLLBACK (do not execute unless rolling back)
-- =============================================
-- DROP TABLE IF EXISTS cong_tac_vien;
-- ALTER TABLE dia_diem DROP COLUMN IF EXISTS mo_ta;
-- ALTER TABLE dia_diem DROP COLUMN IF EXISTS tien_ich;
-- ALTER TABLE dia_diem DROP COLUMN IF EXISTS hien_thi_public;

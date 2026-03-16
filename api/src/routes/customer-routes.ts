import { Hono } from "hono";
import sql from "../db";
import { generateId } from "../utils/generate-id";

const customers = new Hono();

// List customers with optional search and status filter
customers.get("/", async (c) => {
  const search = c.req.query("search");
  const trangThai = c.req.query("trangThai");
  let rows;

  if (search && trangThai) {
    const pattern = `%${search}%`;
    rows = await sql`
      SELECT * FROM khach_hang
      WHERE (ho_ten ILIKE ${pattern} OR sdt ILIKE ${pattern} OR cong_ty ILIKE ${pattern})
        AND trang_thai = ${trangThai}
      ORDER BY ngay_tao DESC
    `;
  } else if (search) {
    const pattern = `%${search}%`;
    rows = await sql`
      SELECT * FROM khach_hang
      WHERE ho_ten ILIKE ${pattern} OR sdt ILIKE ${pattern} OR cong_ty ILIKE ${pattern}
      ORDER BY ngay_tao DESC
    `;
  } else if (trangThai) {
    rows = await sql`SELECT * FROM khach_hang WHERE trang_thai = ${trangThai} ORDER BY ngay_tao DESC`;
  } else {
    rows = await sql`SELECT * FROM khach_hang ORDER BY ngay_tao DESC`;
  }
  return c.json({ success: true, data: rows, total: rows.length });
});

// Create customer
customers.post("/", async (c) => {
  const body = await c.req.json();
  const { sdt, hoTen, email, congTy, nguon, ghiChu } = body;

  // Check duplicate phone
  const existing = await sql`SELECT ma_kh FROM khach_hang WHERE sdt = ${sdt}`;
  if (existing.length > 0) {
    return c.json({ success: false, message: "So dien thoai da ton tai" }, 400);
  }

  const maKh = await generateId("khach_hang", "ma_kh", "KH");
  await sql`
    INSERT INTO khach_hang (ma_kh, sdt, ho_ten, email, cong_ty, nguon, ghi_chu)
    VALUES (${maKh}, ${sdt}, ${hoTen}, ${email || null}, ${congTy || null}, ${nguon || null}, ${ghiChu || null})
  `;
  return c.json({ success: true, message: "Them khach hang thanh cong", data: { maKh } });
});

// Update customer
customers.put("/:id", async (c) => {
  const maKh = c.req.param("id");
  const body = await c.req.json();

  const existing = await sql`SELECT ma_kh FROM khach_hang WHERE ma_kh = ${maKh}`;
  if (existing.length === 0) {
    return c.json({ success: false, message: "Khach hang khong ton tai" }, 404);
  }

  await sql`
    UPDATE khach_hang
    SET sdt = ${body.sdt}, ho_ten = ${body.hoTen}, email = ${body.email || null},
        cong_ty = ${body.congTy || null}, nguon = ${body.nguon || null}, ghi_chu = ${body.ghiChu || null},
        trang_thai = ${body.trangThai || 'Mới'}
    WHERE ma_kh = ${maKh}
  `;
  return c.json({ success: true, message: "Cap nhat khach hang thanh cong" });
});

// Export customers as CSV
customers.get("/export/csv", async (c) => {
  const rows = await sql`SELECT * FROM khach_hang ORDER BY ngay_tao DESC`;
  const headers = ["ma_kh", "sdt", "ho_ten", "email", "cong_ty", "nguon", "nguoi_tao", "ghi_chu", "ngay_tao"];
  const BOM = "\uFEFF";
  const csv = BOM + [headers.join(","), ...rows.map((r: any) =>
    headers.map((h) => `"${(r[h] ?? "").toString().replace(/"/g, '""')}"`).join(",")
  )].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=khach-hang-${new Date().toISOString().split("T")[0]}.csv`,
    },
  });
});

// Delete customer
customers.delete("/:id", async (c) => {
  const maKh = c.req.param("id");
  const existing = await sql`SELECT ma_kh FROM khach_hang WHERE ma_kh = ${maKh}`;
  if (existing.length === 0) {
    return c.json({ success: false, message: "Khach hang khong ton tai" }, 404);
  }
  await sql`DELETE FROM khach_hang WHERE ma_kh = ${maKh}`;
  return c.json({ success: true, message: "Xoa khach hang thanh cong" });
});

export default customers;

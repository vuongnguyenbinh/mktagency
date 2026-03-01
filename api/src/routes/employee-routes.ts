import { Hono } from "hono";
import sql from "../db";

const employees = new Hono();

// List active employees
employees.get("/", async (c) => {
  const rows = await sql`
    SELECT * FROM nhan_vien
    WHERE trang_thai = 'Hoat dong'
    ORDER BY ma_nv
  `;
  return c.json({ success: true, data: rows, total: rows.length });
});

export default employees;

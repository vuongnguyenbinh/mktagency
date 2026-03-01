import { Hono } from "hono";
import sql from "../db";

const dashboard = new Hono();

// Dashboard stats — GET /api/dashboard
dashboard.get("/", async (c) => {
  const [stats] = await sql`
    SELECT
      COUNT(*)::int as "tongCoHoi",
      SUM(CASE WHEN giai_doan = 'Thanh cong' THEN 1 ELSE 0 END)::int as "thanhCong",
      SUM(CASE WHEN giai_doan = 'That bai' THEN 1 ELSE 0 END)::int as "thatBai"
    FROM co_hoi
  `;

  const giaiDoanRows = await sql`
    SELECT giai_doan, COUNT(*)::int as count
    FROM co_hoi
    GROUP BY giai_doan
  `;
  const theoGiaiDoan: Record<string, number> = {};
  for (const row of giaiDoanRows) {
    if (row.giai_doan) theoGiaiDoan[row.giai_doan] = row.count;
  }

  const tongCoHoi = stats.tongCoHoi || 0;
  const thanhCong = stats.thanhCong || 0;
  const tyLeChuyenDoi =
    tongCoHoi > 0 ? Math.round((thanhCong / tongCoHoi) * 1000) / 10 : 0;

  return c.json({
    success: true,
    data: {
      tongCoHoi,
      thanhCong,
      thatBai: stats.thatBai || 0,
      tyLeChuyenDoi,
      theoGiaiDoan,
    },
  });
});

export default dashboard;

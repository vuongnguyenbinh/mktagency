import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import sql from "./db";

// Route modules
import auth from "./routes/auth-routes";
import dashboard from "./routes/dashboard-routes";
import customers from "./routes/customer-routes";
import opportunities from "./routes/opportunity-routes";
import contracts from "./routes/contract-routes";
import locations from "./routes/location-routes";
import employees from "./routes/employee-routes";

const app = new Hono();

// Global error handler — prevents stack trace leaks
app.onError((err, c) => {
  console.error(`[${c.req.method}] ${c.req.url} — ${err.message}`);
  return c.json({ success: false, message: "Internal server error" }, 500);
});

// CORS for external frontend
app.use("/*", cors());

// Health check with DB status
app.get("/api/health", async (c) => {
  try {
    const [row] = await sql`SELECT COUNT(*)::int as customers FROM khach_hang`;
    return c.json({ status: "ok", timestamp: new Date().toISOString(), db: row });
  } catch (e: any) {
    return c.json({ status: "ok", timestamp: new Date().toISOString(), dbError: e.message });
  }
});

// Expiring contracts — standalone endpoint
app.get("/api/expiring-contracts", async (c) => {
  const days = parseInt(c.req.query("days") || "30");
  const rows = await sql`
    SELECT
      ma_hd as "maHD",
      ten_ben_thue as "tenBenThue",
      dia_diem as "diaDiem",
      ngay_ket_thuc as "ngayKT",
      (ngay_ket_thuc - CURRENT_DATE) as "soNgayConLai"
    FROM hop_dong
    WHERE ngay_ket_thuc > CURRENT_DATE
      AND ngay_ket_thuc <= CURRENT_DATE + make_interval(days => ${days})
      AND trang_thai = 'Dang hieu luc'
    ORDER BY ngay_ket_thuc
    LIMIT 10
  `;
  return c.json({ success: true, data: rows });
});

// Mount routes
app.route("/api", auth);
app.route("/api/dashboard", dashboard);
app.route("/api/customers", customers);
app.route("/api/opportunities", opportunities);
app.route("/api/contracts", contracts);
app.route("/api/locations", locations);
app.route("/api/employees", employees);

// Serve static files (frontend)
app.use("/*", serveStatic({ root: "../" }));
app.get("*", serveStatic({ path: "../index.html" }));

const PORT = parseInt(process.env.PORT || "3007");
console.log(`ESG Sale API running on http://localhost:${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
  idleTimeout: 30, // seconds — prevent request timeout on slow DB queries
};

#!/usr/bin/env bun
/**
 * Fetch USD/VND exchange rate from exchangerate-api.com (free tier: 1500 req/month)
 * Run via systemd timer 2x/day (6:00, 18:00)
 */

const DATABASE_URL = process.env.DATABASE_URL || "postgres://ecosmart:EcoSmart2024%40PgSecure@172.18.0.4:5432/ecosmart_db";
const API_URL = "https://open.er-api.com/v6/latest/USD";

async function fetchAndSaveRate() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    const data = await res.json();

    const vndRate = data.rates?.VND;
    if (!vndRate || typeof vndRate !== "number") {
      throw new Error(`Invalid VND rate: ${vndRate}`);
    }

    const sql = new Bun.SQL(DATABASE_URL);
    await sql`INSERT INTO ty_gia (dong_tien, ty_gia, nguon) VALUES ('USD', ${vndRate}, 'exchangerate-api')`;
    await sql.close();

    console.log(`[${new Date().toISOString()}] Saved USD/VND rate: ${vndRate}`);
  } catch (err: any) {
    console.error(`[${new Date().toISOString()}] Error: ${err.message}`);
    process.exit(1);
  }
}

fetchAndSaveRate();

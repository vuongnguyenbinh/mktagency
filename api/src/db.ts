// PostgreSQL connection via Bun.sql (built-in driver)
const sql = new Bun.SQL(process.env.DATABASE_URL!, {
  max: 10,
  idleTimeout: 60,
  connectionTimeout: 30,
});

export default sql;

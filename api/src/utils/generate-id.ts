import sql from "../db";

// Generate next sequential ID for a table (e.g., KH0001, CH0001, HD0001)
// Uses advisory lock to prevent race conditions on concurrent inserts
// sql.unsafe is safe here — all inputs are hardcoded constants, not user input
export async function generateId(
  table: string,
  column: string,
  prefix: string,
  padLen = 4,
): Promise<string> {
  // Use table name hash as advisory lock key to serialize ID generation per table
  const lockKey = hashCode(table);
  const rows = await sql.unsafe(
    `SELECT pg_advisory_xact_lock(${lockKey}), ${column} as id FROM ${table} ORDER BY ${column} DESC LIMIT 1`,
  );
  const last = rows[0];
  const num = last ? parseInt(last.id.replace(prefix, "")) + 1 : 1;
  return `${prefix}${String(num).padStart(padLen, "0")}`;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

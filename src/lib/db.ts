import { Pool } from "pg";

/**
 * Tagged-template wrapper compatible avec l'API neon() :
 *   sql\`SELECT \${id}\` → pg.Pool.query avec $1, $2...
 */

const globalForDb = globalThis as unknown as { __pgPool?: Pool };

let cachedPool: Pool | null = null;

function getPool(): Pool {
  if (cachedPool) return cachedPool;
  if (globalForDb.__pgPool) {
    cachedPool = globalForDb.__pgPool;
    return cachedPool;
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL requis");
  cachedPool = new Pool({
    connectionString: url,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  if (process.env.NODE_ENV !== "production") globalForDb.__pgPool = cachedPool;
  return cachedPool;
}

export async function sql(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<Record<string, unknown>[]> {
  let text = "";
  const params: unknown[] = [];
  strings.forEach((s, i) => {
    text += s;
    if (i < values.length) {
      params.push(values[i]);
      text += "$" + params.length;
    }
  });
  const res = await getPool().query(text, params);
  return res.rows as Record<string, unknown>[];
}

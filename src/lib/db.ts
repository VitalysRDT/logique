import { neon } from "@neondatabase/serverless";

let _sql: ReturnType<typeof neon> | null = null;

function getSql(): ReturnType<typeof neon> {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL requis");
    _sql = neon(url);
  }
  return _sql;
}

export async function sql(strings: TemplateStringsArray, ...values: unknown[]): Promise<Record<string, unknown>[]> {
  const fn = getSql();
  const result = await fn(strings, ...values);
  return result as Record<string, unknown>[];
}

import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

export interface Queryable {
  query<Row extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<Row>>;
}

const globalDatabase = globalThis as typeof globalThis & { hisChoirPool?: Pool };

function databaseUrl() {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) throw new Error("The HisChoir database is unavailable. Set DATABASE_URL.");
  return value;
}

export function getDatabase(): Pool {
  globalDatabase.hisChoirPool ??= new Pool({
    connectionString: databaseUrl(),
    max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
  });
  return globalDatabase.hisChoirPool;
}

export async function withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getDatabase().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

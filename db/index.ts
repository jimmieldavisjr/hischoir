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
  if (!globalDatabase.hisChoirPool) {
    const pool = new Pool({
      connectionString: databaseUrl(),
      max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
      connectionTimeoutMillis: Number(process.env.DATABASE_CONNECT_TIMEOUT_MS ?? 5_000),
      idleTimeoutMillis: Number(process.env.DATABASE_IDLE_TIMEOUT_MS ?? 30_000),
    });
    // Idle clients dropped by the database emit an error on the pool. Without a
    // listener Node treats it as unhandled and stops the whole server.
    pool.on("error", (error) => {
      console.error("HisChoir database pool error:", error);
    });
    globalDatabase.hisChoirPool = pool;
  }
  return globalDatabase.hisChoirPool;
}

export async function checkDatabase(timeoutMs = Number(process.env.DATABASE_CHECK_TIMEOUT_MS ?? 5_000)) {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`The database did not answer within ${timeoutMs}ms.`)), timeoutMs).unref();
  });
  await Promise.race([getDatabase().query("SELECT 1"), timeout]);
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

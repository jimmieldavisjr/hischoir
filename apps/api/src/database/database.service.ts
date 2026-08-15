import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Pool, types, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { APP_ENV, type AppEnv } from "../config/env";

/**
 * `pg` turns DATE columns into JS Date objects at local midnight, which then
 * serialize as full ISO timestamps. Service dates are calendar days with no
 * time or zone, so hand them back as the raw `YYYY-MM-DD` string the row types
 * and API contract already promise. Timestamps (OID 1184) keep their Date
 * parsing.
 */
types.setTypeParser(types.builtins.DATE, (value) => value);

export interface Queryable {
  query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<Row>>;
}

/**
 * One pool for the lifetime of the service. Railway runs a single long-lived
 * process, so connections are reused across every request rather than being
 * re-established per invocation.
 */
@Injectable()
export class DatabaseService implements Queryable, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool: Pool;

  constructor(@Inject(APP_ENV) env: AppEnv) {
    this.pool = new Pool({
      connectionString: env.databaseUrl,
      max: env.databasePoolSize,
    });
    this.pool.on("error", (error) => this.logger.error(`Idle client error: ${error.message}`));
  }

  query<Row extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]) {
    return this.pool.query<Row>(text, values);
  }

  async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
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

  async onModuleDestroy() {
    await this.pool.end();
  }
}

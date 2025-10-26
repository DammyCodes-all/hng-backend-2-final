import { sql } from "drizzle-orm";
import {
  mysqlTable,
  int,
  varchar,
  bigint,
  decimal,
  datetime,
} from "drizzle-orm/mysql-core";

export const countries = mysqlTable("countries", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  capital: varchar("capital", { length: 100 }),
  region: varchar("region", { length: 100 }),
  population: bigint("population", { mode: "number" }).notNull(),
  currencyCode: varchar("currency_code", { length: 10 }),
  exchangeRate: decimal("exchange_rate", { precision: 15, scale: 4 }),
  estimatedGdp: decimal("estimated_gdp", { precision: 20, scale: 2 }),
  flagUrl: varchar("flag_url", { length: 255 }),
  lastRefreshedAt: datetime("last_refreshed_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const metadata = mysqlTable("metadata", {
  id: int("id").primaryKey().default(1),
  totalCountries: int("total_countries"),
  lastRefreshedAt: datetime("last_refreshed_at"),
  summaryImagePath: varchar("summary_image_path", { length: 255 }),
});

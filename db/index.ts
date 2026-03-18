import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const globalForDb = global as unknown as {
  conn: mysql.Pool | undefined;
};

const connection =
  globalForDb.conn ??
  mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "my_auth_db",
    charset: "utf8mb4",
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60000,
    queueLimit: 0,
  });

if (process.env.NODE_ENV !== "production") globalForDb.conn = connection;

export const db = drizzle(connection, { schema, mode: "default" });

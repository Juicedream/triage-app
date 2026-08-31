import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is missing.");
}

const sql = neon(DATABASE_URL!);

export const db = drizzle(sql, { schema });

async function connectToDb() {
  const result = await sql`SELECT version()`;

  if (result.length === 0) {
    console.log("Database couldn't not at the moment, Try again later");
  } else {
    console.log("Database connected successfully 🚀");
  }
}

export default connectToDb;

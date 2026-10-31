import mysql2 from 'mysql2/promise';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const sql = readFileSync('./drizzle/0032_serious_sally_floyd.sql', 'utf8');
const hash = createHash('sha256').update(sql).digest('hex');

const conn = await mysql2.createConnection(process.env.DATABASE_URL);
const [existing] = await conn.execute('SELECT id FROM `__drizzle_migrations` WHERE hash = ?', [hash]);
if (existing.length === 0) {
  await conn.execute(
    'INSERT INTO `__drizzle_migrations` (hash, created_at) VALUES (?, ?)',
    [hash, Date.now()]
  );
  console.log('Migration 0032 recorded with hash:', hash);
} else {
  console.log('Migration 0032 already recorded');
}
await conn.end();

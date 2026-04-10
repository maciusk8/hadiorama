import { Database } from "bun:sqlite";
import path from 'node:path';
import { mkdirSync } from 'node:fs';

const DB_PATH = process.env.DB_PATH || path.resolve(import.meta.dir, '../../data/ha_dashboard.sqlite');
mkdirSync(path.dirname(DB_PATH), { recursive: true });
export const db = new Database(DB_PATH);
db.query("PRAGMA foreign_keys = ON;").run();

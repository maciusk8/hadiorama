import { Database } from "bun:sqlite";
import path from 'node:path';

const DB_PATH = process.env.DB_PATH || path.resolve(import.meta.dir, '../../data/ha_dashboard.sqlite');
export const db = new Database(DB_PATH);
db.query("PRAGMA foreign_keys = ON;").run();

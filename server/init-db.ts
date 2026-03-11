import { Database } from "bun:sqlite";
import path from 'node:path';

const DB_PATH = process.env.DB_PATH || path.resolve(import.meta.dir, '../data/ha_dashboard.sqlite');
const db = new Database(DB_PATH);

db.query("PRAGMA foreign_keys = ON;").run();

console.log("Initializing database...");

const initScript = db.transaction(() => {

  //rooms
  db.query(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      image TEXT,
      nightImage TEXT,
      bgColor TEXT DEFAULT 'transparent'
    );
  `).run();

  //pin types (entity, sensor, etc.)
  db.query(`
    CREATE TABLE IF NOT EXISTS pinTypes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
  `).run();

  const existingEntityPin = db.query(`SELECT id FROM pinTypes WHERE name = 'entity' LIMIT 1`).get();
  if (!existingEntityPin) {
    db.query(`INSERT INTO pinTypes (id, name) VALUES ($id, 'entity')`)
      .run({ $id: crypto.randomUUID() });
  }

  //room pins
  db.query(`
    CREATE TABLE IF NOT EXISTS roomPins (
      id TEXT PRIMARY KEY,
      roomId TEXT NOT NULL,
      typeId TEXT NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      customName TEXT,
      FOREIGN KEY(roomId) REFERENCES rooms(id) ON DELETE CASCADE,
      FOREIGN KEY(typeId) REFERENCES pinTypes(id) ON DELETE CASCADE
    );
  `).run();

  //light types (point, directional, etc.)
  db.query(`
    CREATE TABLE IF NOT EXISTS lightTypes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
  `).run();

  const existingPointLight = db.query(`SELECT id FROM lightTypes WHERE name = 'Point Light' LIMIT 1`).get();
  if (!existingPointLight) {
    db.query(`INSERT INTO lightTypes (id, name) VALUES ($id, 'Point Light')`)
      .run({ $id: crypto.randomUUID() });
  }

  const existingDirLight = db.query(`SELECT id FROM lightTypes WHERE name = 'Directional Light' LIMIT 1`).get();
  if (!existingDirLight) {
    db.query(`INSERT INTO lightTypes (id, name) VALUES ($id, 'Directional Light')`)
      .run({ $id: crypto.randomUUID() });
  }

  //entity lights — tied to a specific pin in a room
  db.query(`
    CREATE TABLE IF NOT EXISTS entityLights (
      id TEXT PRIMARY KEY,
      pinId TEXT NOT NULL,
      typeId TEXT NOT NULL, 
      maxBrightness REAL NOT NULL,
      radius REAL NOT NULL,
      angle REAL NOT NULL,
      spread REAL NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      FOREIGN KEY(pinId) REFERENCES roomPins(id) ON DELETE CASCADE,
      FOREIGN KEY(typeId) REFERENCES lightTypes(id)
    );
  `).run();

  //clickable areas
  db.query(`
    CREATE TABLE IF NOT EXISTS pinAreas (
      id TEXT PRIMARY KEY,
      roomPinId TEXT NOT NULL,
      points TEXT NOT NULL, 
      FOREIGN KEY(roomPinId) REFERENCES roomPins(id) ON DELETE CASCADE
    );
  `).run();

});

try {
  initScript();
  console.log("database initialized successfully");
} catch (error) {
  console.error("error while initializing database:", error);
}

db.close();

import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, "data.db"));

db.pragma("journal_mode = WAL");

db.exec(`CREATE TABLE IF NOT EXISTS user_sync (
  phone TEXT PRIMARY KEY,
  data TEXT,
  updatedAt TEXT
)`);

db.exec(`CREATE TABLE IF NOT EXISTS owners (
  phone TEXT PRIMARY KEY, name TEXT, email TEXT, address TEXT, createdAt TEXT
)`);

db.exec(`CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY, ownerPhone TEXT, regNo TEXT, brand TEXT, model TEXT, year TEXT, createdAt TEXT
)`);

db.exec(`CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY, ownerPhone TEXT, name TEXT, phone TEXT, driverCode TEXT, vehicleId TEXT, createdAt TEXT
)`);

db.exec(`CREATE TABLE IF NOT EXISTS fills (
  id TEXT PRIMARY KEY, ownerPhone TEXT, vehicleId TEXT, regNo TEXT, driver TEXT,
  kg REAL, rate REAL, rs REAL, date TEXT, time TEXT, station TEXT, odometer TEXT,
  photos TEXT, stationCoords TEXT, odometerCoords TEXT, locationStatus TEXT,
  stationPhotoTimestamp TEXT, odometerPhotoTimestamp TEXT, timeGapMin REAL, createdAt TEXT
)`);

db.exec(`CREATE TABLE IF NOT EXISTS auth (
  phone TEXT PRIMARY KEY, role TEXT, name TEXT, otp TEXT, createdAt TEXT
)`);

export default db;

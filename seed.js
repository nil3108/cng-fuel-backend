// Auto-seed: on startup, restore data from data-seed.json if DB is empty
import { readFileSync, existsSync } from "fs";
import db from "./db.js";

const count = db.prepare("SELECT COUNT(*) as c FROM user_sync").get().c;
if (count === 0 && existsSync("data-seed.json")) {
  const seed = JSON.parse(readFileSync("data-seed.json", "utf-8"));
  for (const [phone, data] of Object.entries(seed)) {
    db.prepare("INSERT OR REPLACE INTO user_sync (phone, data, updatedAt) VALUES (?,?,?)").run(
      phone, JSON.stringify(data), new Date().toISOString()
    );
  }
  console.log(`[seed] Restored ${Object.keys(seed).length} records from data-seed.json`);
}

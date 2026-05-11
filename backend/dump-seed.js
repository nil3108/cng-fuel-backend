// Run before deploy: node dump-seed.js → creates data-seed.json
import { writeFileSync } from "fs";
import db from "./db.js";
const rows = db.prepare("SELECT phone, data, updatedAt FROM user_sync").all();
const seed = {};
for (const r of rows) seed[r.phone] = JSON.parse(r.data);
writeFileSync("data-seed.json", JSON.stringify(seed));
console.log(`[dump] Saved ${Object.keys(seed).length} records to data-seed.json`);

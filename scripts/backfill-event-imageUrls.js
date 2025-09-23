#!/usr/bin/env node
// Usage:
//  node scripts/backfill-event-imageUrls.js [--event <eventId>] [--apply]
// Without --apply the script runs in dry-run mode and only prints what it would change.

const Database = require('better-sqlite3');
const path = require('path');

const argv = process.argv.slice(2);
let eventId = null;
let apply = false;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--event' && argv[i+1]) { eventId = argv[i+1]; i++; }
  if (a === '--apply') apply = true;
}

const dbPath = path.join(process.cwd(), 'amwhub.db');
const db = new Database(dbPath);

const events = eventId ? [db.prepare('SELECT id, title, imageUrls, image FROM events WHERE id = ?').get(eventId)] : db.prepare('SELECT id, title, imageUrls, image FROM events').all();

let changed = 0;
for (const ev of events) {
  if (!ev) continue;
  const rows = db.prepare('SELECT filename, createdAt FROM events_images WHERE eventId = ? ORDER BY createdAt DESC').all(ev.id);
  const filenames = rows.map(r => `/images/${r.filename}`);
  const existing = (() => { try { return ev.imageUrls ? JSON.parse(ev.imageUrls) : []; } catch (e) { return []; } })();

  // If there are no events_images rows, skip
  if (filenames.length === 0) {
    continue;
  }

  // If existing already matches filenames (order and content), skip
  const same = (() => {
    if (!Array.isArray(existing)) return false;
    if (existing.length !== filenames.length) return false;
    for (let i = 0; i < filenames.length; i++) {
      if (existing[i] !== filenames[i]) return false;
    }
    return true;
  })();

  if (same) continue;

  console.log(`Event ${ev.id} (${ev.title}) - will update imageUrls from [${existing.join(', ')}] -> [${filenames.join(', ')}]`);
  if (apply) {
    const newImageJson = JSON.stringify(filenames);
    const primary = filenames[0];
    db.prepare('UPDATE events SET imageUrls = ?, image = ? WHERE id = ?').run(newImageJson, primary, ev.id);
    console.log(`  Applied: updated event ${ev.id}`);
    changed++;
  }
}

console.log(`Done. ${changed} event(s) updated.${apply ? '' : ' (dry-run, use --apply to persist)'}`);

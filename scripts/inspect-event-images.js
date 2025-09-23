const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'amwhub.db');
const db = new Database(dbPath, { readonly: true });

const id = process.argv[2];
if (!id) {
  console.error('Usage: node scripts/inspect-event-images.js <eventId>');
  process.exit(2);
}

try {
  const evt = db.prepare('SELECT id, title, imageUrls, image, media FROM events WHERE id = ?').get(id);
  console.log('Event:', evt);
  const images = db.prepare('SELECT * FROM events_images WHERE eventId = ? ORDER BY createdAt DESC').all(id);
  console.log('events_images rows:', images);
} catch (e) {
  console.error('Error reading DB', e);
  process.exit(1);
}

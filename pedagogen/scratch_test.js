const Database = require('better-sqlite3');
const db = new Database('./data/pedagogen.db');

try {
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='settings'").get();
  console.log('SETTINGS SCHEMA:', schema);
  const rows = db.prepare("SELECT * FROM settings").all();
  console.log('SETTINGS ROWS:', rows);
} catch(e) {
  console.error('ERROR:', e.message);
}
process.exit(0);

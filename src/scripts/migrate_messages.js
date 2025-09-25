const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'whatsapp.db');
const db = new Database(dbPath);

try {
  const cols = db.prepare("PRAGMA table_info(messages)").all();
  const colNames = cols.map(c => c.name);
  console.log('messages columns:', colNames);

  if (colNames.includes('to')) {
    console.log("Found 'to' column — running migration to 'recipient'");
    db.exec('BEGIN');

    // Rename old table
    db.exec("ALTER TABLE messages RENAME TO messages_old;");

    // Recreate table with recipient column
    db.exec(`CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chatId TEXT,
      body TEXT,
      sender TEXT,
      recipient TEXT,
      timestamp INTEGER,
      type TEXT,
      isForwarded BOOLEAN,
      isStatus BOOLEAN,
      isStarred BOOLEAN,
      fromMe BOOLEAN,
      hasMedia BOOLEAN,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chatId) REFERENCES chats (id)
    );`);

    // Copy data from old table, mapping 'to' -> 'recipient'
    db.exec(`INSERT INTO messages (id, chatId, body, sender, recipient, timestamp, type, isForwarded, isStatus, isStarred, fromMe, hasMedia, createdAt)
      SELECT id, chatId, body, sender, \"to\", timestamp, type, isForwarded, isStatus, isStarred, fromMe, hasMedia, createdAt FROM messages_old;`);

    // Drop old table
    db.exec('DROP TABLE messages_old;');

    db.exec('COMMIT');
    console.log('Migration completed successfully');
  } else {
    console.log('No migration needed');
  }
} catch (err) {
  try { db.exec('ROLLBACK'); } catch (e) {}
  console.error('Migration failed:', err);
  process.exit(1);
} finally {
  db.close();
}

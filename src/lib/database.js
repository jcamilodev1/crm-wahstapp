const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Use process.cwd() so the path resolves reliably whether the code
// is executed from the project root or from a build output folder.
const dataDir = path.join(process.cwd(), 'data');
// Ensure the data directory exists to avoid better-sqlite3 "directory does not exist" errors
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'whatsapp.db');
const db = new Database(dbPath);

// Crear tablas
db.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    name TEXT,
    number TEXT,
    isBusiness BOOLEAN,
    isEnterprise BOOLEAN,
    isMe BOOLEAN,
    isUser BOOLEAN,
    isGroup BOOLEAN,
    isWAContact BOOLEAN,
    isMyContact BOOLEAN,
    isBlocked BOOLEAN,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    name TEXT,
    isGroup BOOLEAN,
    isReadOnly BOOLEAN,
    unreadCount INTEGER,
    timestamp INTEGER,
    archived BOOLEAN,
    pinned BOOLEAN,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
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
    mediaFilename TEXT,
    mediaMime TEXT,
    mediaSize INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chatId) REFERENCES chats (id)
  );

  CREATE INDEX IF NOT EXISTS idx_messages_chatId_timestamp ON messages (chatId, timestamp);
  CREATE INDEX IF NOT EXISTS idx_chats_timestamp ON chats (timestamp);
  CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts (name);
`);
// Tabla para recordatorios: programar envíos a uno o varios chats
db.exec(`
  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    body TEXT,
    recipients TEXT, -- JSON array of chat ids
    scheduledAt INTEGER, -- epoch ms
    repeatRule TEXT, -- opcional, e.g. cron or human readable
    status TEXT DEFAULT 'pending', -- pending | processing | sent | failed | cancelled
    attempts INTEGER DEFAULT 0,
    lastError TEXT,
    sentAt INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_reminders_status_scheduledAt ON reminders (status, scheduledAt);
`);
// Backwards-compatible migration: ensure media columns exist on older DBs
try {
  const cols = db.prepare("PRAGMA table_info('messages')").all();
  const colNames = cols.map(c => c.name);
  if (!colNames.includes('mediaFilename')) {
    db.prepare("ALTER TABLE messages ADD COLUMN mediaFilename TEXT").run();
  }
  if (!colNames.includes('mediaMime')) {
    db.prepare("ALTER TABLE messages ADD COLUMN mediaMime TEXT").run();
  }
  if (!colNames.includes('mediaSize')) {
    db.prepare("ALTER TABLE messages ADD COLUMN mediaSize INTEGER").run();
  }
} catch (e) {
  console.warn('DB migration check for media columns failed:', e && e.message ? e.message : e);
}

// Preparar statements
const insertContact = db.prepare(`
  INSERT OR REPLACE INTO contacts (id, name, number, isBusiness, isEnterprise, isMe, isUser, isGroup, isWAContact, isMyContact, isBlocked)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertChat = db.prepare(`
  INSERT OR REPLACE INTO chats (id, name, isGroup, isReadOnly, unreadCount, timestamp, archived, pinned)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertMessage = db.prepare(`
  INSERT OR REPLACE INTO messages (id, chatId, body, sender, recipient, timestamp, type, isForwarded, isStatus, isStarred, fromMe, hasMedia, mediaFilename, mediaMime, mediaSize)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const getContacts = db.prepare('SELECT * FROM contacts ORDER BY name');
const getChats = db.prepare('SELECT * FROM chats ORDER BY timestamp DESC');
const getMessages = db.prepare('SELECT * FROM messages WHERE chatId = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?');
const deleteOldMessages = db.prepare(`
  DELETE FROM messages 
  WHERE chatId = ? AND id NOT IN (
    SELECT id FROM messages 
    WHERE chatId = ? 
    ORDER BY timestamp DESC 
    LIMIT 500
  )
`);

// Prepared statements para recordatorios
const insertReminder = db.prepare(`
  INSERT INTO reminders (body, recipients, scheduledAt, repeatRule, status)
  VALUES (?, ?, ?, ?, ?)
`);

const getDueReminders = db.prepare(`
  SELECT * FROM reminders
  WHERE status = 'pending' AND scheduledAt <= ?
  ORDER BY scheduledAt ASC
  LIMIT ?
`);

const markReminderProcessing = db.prepare(`
  UPDATE reminders SET status = 'processing', attempts = attempts + 1 WHERE id = ?
`);

const markReminderSent = db.prepare(`
  UPDATE reminders SET status = 'sent', sentAt = ?, lastError = NULL WHERE id = ?
`);

const markReminderFailed = db.prepare(`
  UPDATE reminders SET status = 'failed', lastError = ?, attempts = ? WHERE id = ?
`);

const rescheduleReminder = db.prepare(`
  UPDATE reminders SET scheduledAt = ?, status = 'pending', lastError = NULL WHERE id = ?
`);

const listReminders = db.prepare(`
  SELECT * FROM reminders ORDER BY scheduledAt DESC LIMIT ? OFFSET ?
`);

const getReminderById = db.prepare(`
  SELECT * FROM reminders WHERE id = ?
`);

const deleteReminder = db.prepare(`
  DELETE FROM reminders WHERE id = ?
`);

// Normalization helpers to ensure only allowed types are passed to better-sqlite3
function normalizeValue(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'bigint') return value;
  if (Buffer.isBuffer(value)) return value;
  if (typeof value === 'object') {
    try { return JSON.stringify(value); } catch (e) { return String(value); }
  }
  return String(value);
}

function normalizeArray(arr) {
  return arr.map(normalizeValue);
}

// Wrap statements so callers can keep using .run(...) but values are normalized
const insertContactWrapped = {
  run: (...args) => insertContact.run(...normalizeArray(args))
};

const insertChatWrapped = {
  run: (...args) => insertChat.run(...normalizeArray(args))
};

const insertMessageWrapped = {
  run: (...args) => insertMessage.run(...normalizeArray(args))
};

const deleteOldMessagesWrapped = {
  run: (...args) => deleteOldMessages.run(...normalizeArray(args))
};

module.exports = {
  insertContact: insertContactWrapped,
  insertChat: insertChatWrapped,
  insertMessage: insertMessageWrapped,
  deleteOldMessages: deleteOldMessagesWrapped,
  getContacts,
  getChats,
  getMessages,
  db,
  // reminders
  insertReminder: {
    run: (...args) => insertReminder.run(...normalizeArray(args))
  },
  getDueReminders: {
    all: (...args) => getDueReminders.all(...normalizeArray(args))
  },
  markReminderProcessing: {
    run: (...args) => markReminderProcessing.run(...normalizeArray(args))
  },
  markReminderSent: {
    run: (...args) => markReminderSent.run(...normalizeArray(args))
  },
  markReminderFailed: {
    run: (...args) => markReminderFailed.run(...normalizeArray(args))
  },
  listReminders: {
    all: (...args) => listReminders.all(...normalizeArray(args))
  },
  getReminderById: {
    get: (...args) => getReminderById.get(...normalizeArray(args))
  },
  deleteReminder: {
    run: (...args) => deleteReminder.run(...normalizeArray(args))
  }
  ,
  rescheduleReminder: {
    run: (...args) => rescheduleReminder.run(...normalizeArray(args))
  }
};

// Backwards-compatible migration: ensure media columns exist on older DBs
try {
  const cols = db.prepare("PRAGMA table_info('messages')").all();
  const colNames = cols.map(c => c.name);
  if (!colNames.includes('mediaFilename')) {
    db.prepare("ALTER TABLE messages ADD COLUMN mediaFilename TEXT").run();
  }
  if (!colNames.includes('mediaMime')) {
    db.prepare("ALTER TABLE messages ADD COLUMN mediaMime TEXT").run();
  }
  if (!colNames.includes('mediaSize')) {
    db.prepare("ALTER TABLE messages ADD COLUMN mediaSize INTEGER").run();
  }
} catch (e) {
  console.warn('DB migration check for media columns failed:', e && e.message ? e.message : e);
}
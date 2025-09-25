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
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chatId) REFERENCES chats (id)
  );

  CREATE INDEX IF NOT EXISTS idx_messages_chatId_timestamp ON messages (chatId, timestamp);
  CREATE INDEX IF NOT EXISTS idx_chats_timestamp ON chats (timestamp);
  CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts (name);
`);

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
  INSERT OR REPLACE INTO messages (id, chatId, body, sender, recipient, timestamp, type, isForwarded, isStatus, isStarred, fromMe, hasMedia)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
  db
};
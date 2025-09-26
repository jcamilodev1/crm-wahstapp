const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const { Server } = require('socket.io');
const http = require('http');
const { insertContact, insertChat, insertMessage, deleteOldMessages, getContacts, getChats, getMessages } = require('../lib/database');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

// Normalize values before binding to SQLite
function normalize(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'bigint') return value;
  if (Buffer.isBuffer(value)) return value;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (e) {
      return String(value);
    }
  }
  return String(value);
}

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Simple REST endpoint to trigger sync of a specific chat on demand.
// POST /api/sync-chat { chatId, limit }
// Auth: header `x-api-key` must match process.env.SYNC_API_KEY
server.on('request', async (req, res) => {
  // Serve media files saved under data/media safely
  if (req.method === 'GET' && req.url && req.url.startsWith('/media/')) {
    try {
      const requested = decodeURIComponent(req.url.replace(/^\/media\//, ''));
      const mediaRoot = path.join(process.cwd(), 'data', 'media');
      const fullPath = path.join(mediaRoot, requested);
      if (!fullPath.startsWith(mediaRoot)) {
        res.writeHead(403);
        res.end('forbidden');
        return;
      }
      if (!fs.existsSync(fullPath)) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      const stat = fs.statSync(fullPath);
      const contentType = mime.lookup(fullPath) || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': stat.size });
      const stream = fs.createReadStream(fullPath);
      stream.pipe(res);
      return;
    } catch (e) {
      res.writeHead(500);
      res.end('error');
      return;
    }
  }
  // Basic CORS headers used by our endpoints
  const corsBase = {
    'Access-Control-Allow-Origin': 'http://localhost:3000',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
  };

  // Simple health endpoint to check server availability
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { ...corsBase, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  // Only handle /api/sync-chat here; respond to OPTIONS for CORS preflight
  if (req.url === '/api/sync-chat') {
    // Basic CORS headers
    const corsHeaders = corsBase;

    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders);
      res.end();
      return;
    }

    if (req.method !== 'POST') {
      res.writeHead(405, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'method_not_allowed' }));
      return;
    }

    try {
      const apiKeyHeader = req.headers['x-api-key'] || req.headers['authorization'];
      const expected = process.env.SYNC_API_KEY;
      if (!expected) {
        console.warn('SYNC_API_KEY not set; rejecting sync request for safety');
        res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'server misconfigured' }));
        return;
      }
      if (!apiKeyHeader || String(apiKeyHeader) !== expected) {
        res.writeHead(401, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'unauthorized' }));
        return;
      }

      // collect body
      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }
      let payload = {};
      try { payload = body ? JSON.parse(body) : {}; } catch (e) {
        res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid json' }));
        return;
      }

      const { chatId, limit = 200 } = payload;
      if (!chatId) {
        res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'chatId required' }));
        return;
      }

      // Ensure client is ready
      if (!isReady) {
        res.writeHead(409, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'whatsapp client not ready' }));
        return;
      }

      try {
        console.log(`Sync request received for chat ${chatId} (limit=${limit})`);
        const chat = await client.getChatById(chatId);
        if (!chat) {
          res.writeHead(404, { ...corsHeaders, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'chat not found' }));
          return;
        }
        const messages = await chat.fetchMessages({ limit });
        let saved = 0;
        for (const m of messages) {
          try {
            // If message has media, attempt to download and store
            let mediaFilename = null;
            let mediaMime = null;
            let mediaSize = null;
            if (m.hasMedia) {
              try {
                const media = await m.downloadMedia();
                if (media && media.data) {
                  mediaMime = media.mimetype || null;
                  mediaSize = media.filesize || null;
                  const ext = media.filename ? path.extname(media.filename) : (mediaMime ? '.' + mediaMime.split('/').pop() : '');
                  const mediaDir = path.join(process.cwd(), 'data', 'media', chatId);
                  fs.mkdirSync(mediaDir, { recursive: true });
                  mediaFilename = `${(m.id && (m.id._serialized || m.id.id)) ? (m.id._serialized || m.id.id) : Date.now()}${ext}`;
                  const filePath = path.join(mediaDir, mediaFilename);
                  fs.writeFileSync(filePath, Buffer.from(media.data, 'base64'));
                }
              } catch (e) {
                console.warn('Failed to download media during sync for message', m && m.id ? (m.id._serialized || m.id.id) : '<no-id>', e && e.message ? e.message : e);
              }
            }

            insertMessage.run(
              normalize(m && m.id && (m.id._serialized || m.id.id) ? (m.id._serialized || m.id.id) : null),
              normalize(chatId),
              normalize(m && m.body ? m.body : (m && m.content ? m.content : null)),
              normalize(m && m.from ? m.from : null),
              normalize(m && m.to ? m.to : null),
              normalize(m && m.timestamp ? m.timestamp : null),
              normalize(m && m.type ? m.type : null),
              normalize(m && m.isForwarded),
              normalize(m && m.isStatus),
              normalize(m && m.isStarred),
              normalize(m && m.fromMe),
              normalize(m && m.hasMedia),
              normalize(mediaFilename),
              normalize(mediaMime),
              normalize(mediaSize)
            );
            saved++;
          } catch (err) {
            console.warn('Failed to save message during sync:', err && err.message ? err.message : err);
          }
        }

        io.emit('sync_completed', { chatId, saved, total: messages.length });
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ chatId, saved, total: messages.length }));
        return;
      } catch (err) {
        console.error('Error during sync:', err && err.message ? err.message : err);
        res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'sync_failed', details: err && err.message ? err.message : String(err) }));
        return;
      }
    } catch (err) {
      res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'internal' }));
      return;
    }
  }
});

const client = new Client({
  authStrategy: new LocalAuth()
});

let lastQr = null;
let isReady = false;

client.on('qr', (qr) => {
  console.log('QR RECEIVED');
  qrcode.toDataURL(qr, (err, url) => {
    if (err) throw err;
    lastQr = url;
    io.emit('qr', url);
  });
});

// Authentication lifecycle events
client.on('authenticated', (auth) => {
  console.log('Client authenticated');
  io.emit('authenticated', auth);
});

client.on('auth_failure', (msg) => {
  console.error('Authentication failure:', msg);
  io.emit('auth_failure', msg);
});

client.on('disconnected', (reason) => {
  console.log('Client disconnected:', reason);
  isReady = false;
  io.emit('disconnected', reason);
});

client.on('ready', async () => {
  console.log('Client is ready!');
  try {
    // Wait for initial data to be saved before notifying frontend
    await saveInitialData();
    isReady = true;
    io.emit('ready');
    console.log('Initial data saved and ready emitted');
  } catch (err) {
    console.error('Error during initial data save:', err);
    // Even if saving fails, still mark ready so UI can connect; frontend will show empty lists but we log the error
    isReady = true;
    io.emit('ready');
  }
});

client.on('message', async (message) => {
  console.log('New message:', message && message.body ? message.body : '<no-body>');
  let mediaFilename = null;
  let mediaMime = null;
  let mediaSize = null;

  // If message contains media, try to download and save it
  if (message.hasMedia) {
    try {
      const media = await message.downloadMedia();
      if (media && media.data) {
        mediaMime = media.mimetype || null;
        mediaSize = media.filesize || null;
        const ext = media.filename ? path.extname(media.filename) : (mediaMime ? '.' + mediaMime.split('/').pop() : '');
        const chatIdSafe = message.chat && message.chat.id ? (message.chat.id._serialized || message.chat.id) : 'unknown';
        const mediaDir = path.join(process.cwd(), 'data', 'media', chatIdSafe);
        fs.mkdirSync(mediaDir, { recursive: true });
        mediaFilename = `${(message.id && (message.id._serialized || message.id.id)) ? (message.id._serialized || message.id.id) : Date.now()}${ext}`;
        const filePath = path.join(mediaDir, mediaFilename);
        fs.writeFileSync(filePath, Buffer.from(media.data, 'base64'));
      }
    } catch (e) {
      console.warn('Failed to download/save media for message:', e && e.message ? e.message : e);
    }
  }

  // Guardar mensaje (incluyendo metadata de media si existe)
  try {
    insertMessage.run(
      normalize(message && message.id && (message.id._serialized || message.id.id) ? (message.id._serialized || message.id.id) : null),
      normalize(message && message.chat && message.chat.id ? (message.chat.id._serialized || message.chat.id) : null),
      normalize(message.body),
      normalize(message.from),
      normalize(message.to),
      normalize(message.timestamp),
      normalize(message.type),
      normalize(message.isForwarded),
      normalize(message.isStatus),
      normalize(message.isStarred),
      normalize(message.fromMe),
      normalize(message.hasMedia),
      normalize(mediaFilename),
      normalize(mediaMime),
      normalize(mediaSize)
    );
  } catch (e) {
    console.warn('Failed to save message to DB:', e && e.message ? e.message : e);
  }

  // Limpiar mensajes antiguos si > 500
  try { deleteOldMessages.run(message.chat.id, message.chat.id); } catch (e) { /* ignore */ }

  // Update chats table so that the chat timestamp reflects the new message
  try {
    const chatIdStr = message.chat && message.chat.id ? (message.chat.id._serialized || message.chat.id) : null;
    const chatName = message.chat && (message.chat.name || (message.chat.contact && message.chat.contact.name)) ? (message.chat.name || (message.chat.contact && message.chat.contact.name)) : null;
    if (chatIdStr) {
      insertChat.run(
        chatIdStr,
        normalize(chatName),
        normalize(message.chat && message.chat.isGroup),
        normalize(message.chat && message.chat.isReadOnly),
        normalize(message.chat && message.chat.unreadCount),
        normalize(message.timestamp),
        normalize(message.chat && message.chat.archived),
        normalize(message.chat && message.chat.pinned)
      );
      // Emit updated chat list to clients so UI can refresh order
      try {
        const chatsRows = getChats.all();
        const chatsForClient = chatsRows.map(c => ({ ...c, id: { _serialized: c.id } }));
        io.emit('chats', { chats: chatsForClient, total: chatsRows.length, page: 1, limit: 10 });
      } catch (e) {
        /* ignore */
      }
    }
  } catch (e) {
    console.warn('Failed to update chat record:', e && e.message ? e.message : e);
  }

  // Emit new message to frontend, include mediaUrl if we saved a file
  const chatIdForEmit = message.chat && message.chat.id ? (message.chat.id._serialized || message.chat.id) : null;
  const emitMsg = {
    id: (message.id && (message.id._serialized || message.id.id)) ? (message.id._serialized || message.id.id) : null,
    body: message.body,
    from: message.from,
    timestamp: message.timestamp,
    type: message.type,
    hasMedia: !!message.hasMedia
  };
  if (mediaFilename && chatIdForEmit) {
    emitMsg.mediaUrl = `http://localhost:3001/media/${encodeURIComponent(chatIdForEmit)}/${encodeURIComponent(mediaFilename)}`;
    emitMsg.mediaMime = mediaMime;
    emitMsg.mediaFilename = mediaFilename;
  }

  io.emit('new_message', { chatId: chatIdForEmit, message: emitMsg });
});

async function saveInitialData() {
  try {
    // retry helper for transient errors
    async function retryAsync(fn, attempts = 3, delay = 1000) {
      let lastErr;
      for (let i = 0; i < attempts; i++) {
        try {
          return await fn();
        } catch (err) {
          lastErr = err;
          console.warn(`Retry ${i + 1}/${attempts} failed:`, err && err.message ? err.message : err);
          await new Promise(r => setTimeout(r, delay));
        }
      }
      throw lastErr;
    }

    const contacts = await retryAsync(() => client.getContacts(), 3, 1000);
    console.log('saveInitialData: contacts fetched count =', Array.isArray(contacts) ? contacts.length : 'not-array');
    if (Array.isArray(contacts) && contacts.length > 0) {
      contacts.forEach(contact => {
        const id = contact && contact.id && contact.id._serialized ? contact.id._serialized : (contact && contact._serialized ? contact._serialized : null);
        const name = contact && (contact.name || contact.pushname || contact.push_name) ? (contact.name || contact.pushname || contact.push_name) : null;
        const number = contact && (contact.number || contact.id && contact.id.user) ? (contact.number || (contact.id && contact.id.user)) : null;
        insertContact.run(
          id,
          normalize(name),
          normalize(number),
          normalize(contact && contact.isBusiness),
          normalize(contact && contact.isEnterprise),
          normalize(contact && contact.isMe),
          normalize(contact && contact.isUser),
          normalize(contact && contact.isGroup),
          normalize(contact && contact.isWAContact),
          normalize(contact && contact.isMyContact),
          normalize(contact && contact.isBlocked)
        );
      });
      console.log('Contacts saved to DB');
    } else {
      console.log('No contacts returned from client.getContacts()');
    }

  const chats = await retryAsync(() => client.getChats(), 3, 1000);
    console.log('saveInitialData: chats fetched count =', Array.isArray(chats) ? chats.length : 'not-array');
    if (Array.isArray(chats) && chats.length > 0) {
      // Save chats first
      chats.forEach(chat => {
        const id = chat && chat.id && chat.id._serialized ? chat.id._serialized : (chat && chat._serialized ? chat._serialized : null);
        const name = chat && (chat.name || chat.contact && chat.contact.name) ? (chat.name || (chat.contact && chat.contact.name)) : null;
        insertChat.run(
          id,
          normalize(name),
          normalize(chat && chat.isGroup),
          normalize(chat && chat.isReadOnly),
          normalize(chat && chat.unreadCount),
          normalize(chat && chat.timestamp),
          normalize(chat && chat.archived),
          normalize(chat && chat.pinned)
        );
      });
      console.log('Chats saved to DB');

      // Optionally fetch and save recent messages for each chat.
      // Default: disabled to avoid heavy startup work. Set PREFETCH_MESSAGES=true to enable.
      if (process.env.PREFETCH_MESSAGES && String(process.env.PREFETCH_MESSAGES).toLowerCase() === 'true') {
        // Fetch and save recent messages for each chat (sequential to avoid overloading the session)
        for (const chat of chats) {
          const chatId = chat && chat.id && chat.id._serialized ? chat.id._serialized : (chat && chat._serialized ? chat._serialized : null);
          if (!chatId) continue;
          try {
            console.log(`Fetching messages for chat ${chatId}`);
            // get chat model from client
            const chatModel = await retryAsync(() => client.getChatById(chatId), 3, 1000);
            // fetch recent messages (adjust limit as needed)
            const messages = await retryAsync(() => chatModel.fetchMessages({ limit: 50 }), 3, 1000);
            if (Array.isArray(messages) && messages.length) {
              let saved = 0;
              for (const m of messages) {
                try {
                  insertMessage.run(
                    normalize(m && m.id && (m.id._serialized || m.id.id) ? (m.id._serialized || m.id.id) : null),
                    normalize(chatId),
                    normalize(m && m.body ? m.body : (m && m.content ? m.content : null)),
                    normalize(m && m.from ? m.from : null),
                    normalize(m && m.to ? m.to : null),
                    normalize(m && m.timestamp ? m.timestamp : null),
                    normalize(m && m.type ? m.type : null),
                    normalize(m && m.isForwarded),
                    normalize(m && m.isStatus),
                    normalize(m && m.isStarred),
                    normalize(m && m.fromMe),
                    normalize(m && m.hasMedia)
                  );
                  saved++;
                } catch (err) {
                  console.warn(`Failed to save message for chat ${chatId}:`, err && err.message ? err.message : err);
                }
              }
              console.log(`Saved ${saved}/${messages.length} messages for chat ${chatId}`);
            }
            // small delay between chats
            await new Promise(r => setTimeout(r, 150));
          } catch (err) {
            console.warn(`Failed to fetch messages for chat ${chatId}:`, err && err.message ? err.message : err);
          }
        }
      } else {
        console.log('PREFETCH_MESSAGES not enabled; skipping messages prefetch at startup');
      }
    } else {
      console.log('No chats returned from client.getChats()');
    }
  } catch (error) {
    console.error('Error saving initial data:', error);
  }
}

io.on('connection', (socket) => {
  console.log('User connected');

  // Send current state to new client
  if (lastQr) {
    socket.emit('qr', lastQr);
  }
  if (isReady) {
    socket.emit('ready');
  }

  socket.on('get_contacts', () => {
    try {
      const contacts = getContacts.all();
      // Normalize shape expected by frontend (flat rows are fine)
      const contactsForClient = contacts.map(c => ({
        id: c.id,
        name: c.name,
        number: c.number,
        createdAt: c.createdAt
      }));
      socket.emit('contacts', contactsForClient);
    } catch (error) {
      socket.emit('error', error.message);
    }
  });

  socket.on('get_chats', (data) => {
    try {
      const { page = 1, limit = 10 } = data;
      const chats = getChats.all();
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedChats = chats.slice(start, end);
      // Transform each chat so frontend can use chat.id._serialized like whatsapp-web.js
      const chatsForClient = paginatedChats.map(c => ({
        ...c,
        id: { _serialized: c.id }
      }));
      socket.emit('chats', { chats: chatsForClient, total: chats.length, page, limit });
    } catch (error) {
      socket.emit('error', error.message);
    }
  });

  socket.on('get_messages', (data) => {
    try {
      const { chatId, page = 1, limit = 20 } = data;
      const offset = (page - 1) * limit;
      const messages = getMessages.all(chatId, limit, offset);
      socket.emit('messages', { messages, total: messages.length, page, limit });
    } catch (error) {
      socket.emit('error', error.message);
    }
  });

  socket.on('send_message', async (data) => {
    try {
      const { chatId, message } = data;
      const chat = await client.getChatById(chatId);
      const sentMessage = await chat.sendMessage(message);
      // Guardar mensaje enviado
      insertMessage.run(
        normalize(sentMessage && sentMessage.id && (sentMessage.id._serialized || sentMessage.id.id) ? (sentMessage.id._serialized || sentMessage.id.id) : null),
        normalize(chatId),
        normalize(message),
        normalize('me'),
        normalize(chatId),
        normalize(sentMessage && sentMessage.timestamp ? sentMessage.timestamp : null),
        normalize(sentMessage && sentMessage.type ? sentMessage.type : null),
        normalize(false),
        normalize(false),
        normalize(false),
        normalize(true),
        normalize(false),
        normalize(null),
        normalize(null),
        normalize(null)
      );
      // Limpiar mensajes antiguos
      deleteOldMessages.run(chatId, chatId);
      socket.emit('message_sent', { chatId, message });
    } catch (error) {
      socket.emit('error', error.message);
    }
  });
});

client.initialize();

server.listen(3001, () => {
  console.log('Server running on port 3001');
});
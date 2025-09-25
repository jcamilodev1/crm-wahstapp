const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const { Server } = require('socket.io');
const http = require('http');
const { insertContact, insertChat, insertMessage, deleteOldMessages, getContacts, getChats, getMessages } = require('../lib/database');

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

client.on('ready', () => {
  console.log('Client is ready!');
  isReady = true;
  io.emit('ready');
  // Guardar contactos y chats iniciales
  saveInitialData();
});

client.on('message', (message) => {
  console.log('New message:', message.body);
  // Guardar mensaje
  insertMessage.run(
    normalize(message && message.id && message.id.id ? message.id.id : null),
    normalize(message && message.chat && message.chat.id ? message.chat.id : null),
    normalize(message.body),
    normalize(message.from),
    normalize(message.to),
    normalize(message.timestamp),
    normalize(message.type),
    normalize(message.isForwarded),
    normalize(message.isStatus),
    normalize(message.isStarred),
    normalize(message.fromMe),
    normalize(message.hasMedia)
  );
  // Limpiar mensajes antiguos si > 500
  deleteOldMessages.run(message.chat.id, message.chat.id);
  // Emit new message to frontend
  io.emit('new_message', {
    chatId: message.chat.id,
    message: {
      id: message.id.id,
      body: message.body,
      from: message.from,
      timestamp: message.timestamp,
      type: message.type
    }
  });
});

async function saveInitialData() {
  try {
    const contacts = await client.getContacts();
    contacts.forEach(contact => {
      insertContact.run(
        (contact && contact.id && contact.id._serialized) ? contact.id._serialized : null,
        normalize(contact.name),
        normalize(contact.number),
        normalize(contact.isBusiness),
        normalize(contact.isEnterprise),
        normalize(contact.isMe),
        normalize(contact.isUser),
        normalize(contact.isGroup),
        normalize(contact.isWAContact),
        normalize(contact.isMyContact),
        normalize(contact.isBlocked)
      );
    });
    console.log('Contacts saved');

    const chats = await client.getChats();
    chats.forEach(chat => {
      insertChat.run(
        (chat && chat.id && chat.id._serialized) ? chat.id._serialized : null,
        normalize(chat.name),
        normalize(chat.isGroup),
        normalize(chat.isReadOnly),
        normalize(chat.unreadCount),
        normalize(chat.timestamp),
        normalize(chat.archived),
        normalize(chat.pinned)
      );
    });
    console.log('Chats saved');
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
      socket.emit('contacts', contacts);
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
      socket.emit('chats', { chats: paginatedChats, total: chats.length, page, limit });
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
        normalize(sentMessage && sentMessage.id && sentMessage.id.id ? sentMessage.id.id : null),
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
        normalize(false)
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
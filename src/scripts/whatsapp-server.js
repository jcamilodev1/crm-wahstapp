const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const { Server } = require('socket.io');
const http = require('http');
const { insertContact, insertChat, insertMessage, deleteOldMessages, getContacts, getChats, getMessages } = require('../lib/database');

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
    message.id.id,
    message.chat.id,
    message.body,
    message.from,
    message.to || message.to === undefined ? message.to : null,
    message.timestamp,
    message.type,
    message.isForwarded,
    message.isStatus,
    message.isStarred,
    message.fromMe,
    message.hasMedia
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
        contact.id._serialized,
        contact.name,
        contact.number,
        contact.isBusiness,
        contact.isEnterprise,
        contact.isMe,
        contact.isUser,
        contact.isGroup,
        contact.isWAContact,
        contact.isMyContact,
        contact.isBlocked
      );
    });
    console.log('Contacts saved');

    const chats = await client.getChats();
    chats.forEach(chat => {
      insertChat.run(
        chat.id._serialized,
        chat.name,
        chat.isGroup,
        chat.isReadOnly,
        chat.unreadCount,
        chat.timestamp,
        chat.archived,
        chat.pinned
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
        sentMessage.id.id,
        chatId,
        message,
        'me',
        chatId,
        sentMessage.timestamp,
        sentMessage.type,
        false,
        false,
        false,
        true,
        false
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
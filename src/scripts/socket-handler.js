// socket-handler.js - Módulo para manejar eventos de Socket.IO

const {
  getContacts,
  getChats,
  getMessages,
  insertMessage,
  insertContact,
  insertChat,
  deleteOldMessages,
} = require("../lib/database");
const { client, qrState, readyState, normalize } = require("./whatsapp-client");

function setupSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log("User connected");

    // Send current state to new client
    if (qrState.lastQr) {
      socket.emit("qr", qrState.lastQr);
    }
    socket.emit("ready", readyState.isReady);

    // Emitir chats y contacts desde DB, incluso si no ready
    const chats = getChats.all();
    socket.emit("chats", chats.slice(0, 10));
    const contacts = getContacts.all();
    socket.emit("contacts", contacts.slice(0, 10));

  socket.on("get_contacts", async () => {
    try {
      let contacts = getContacts.all();
      if (contacts.length === 0 && readyState.isReady) {
        // Lazy loading: cargar desde WhatsApp
        console.log("Loading contacts from WhatsApp...");
        const waContacts = await client.getContacts();
        for (const contact of waContacts) {
          const id = contact.id._serialized;
          const name = contact.name || contact.pushname || contact.push_name || null;
          const number = contact.number || (contact.id && contact.id.user) || null;
          insertContact.run(
            id,
            normalize(name),
            normalize(number),
            normalize(contact.isBusiness),
            normalize(contact.isEnterprise),
            normalize(contact.isMe),
            normalize(contact.isUser),
            normalize(contact.isGroup),
            normalize(contact.isWAContact),
            normalize(contact.isMyContact),
            normalize(contact.isBlocked)
          );
        }
        contacts = getContacts.all();
        console.log(`Loaded ${contacts.length} contacts`);
      }
      // Normalize shape expected by frontend
      const contactsForClient = contacts.map((c) => ({
        id: c.id,
        name: c.name,
        number: c.number,
        createdAt: c.createdAt,
      }));
      socket.emit("contacts", contactsForClient);
    } catch (error) {
      socket.emit("error", error.message);
    }
  });    socket.on("get_chats", async (data) => {
      try {
        const { page = 1, limit = 10 } = data;
        let chats = getChats.all();
        // Lazy loading: cargar desde WhatsApp si no hay chats en DB y cliente está listo
        if (chats.length === 0 && readyState.isReady) {
          console.log("Loading chats from WhatsApp...");
          const waChats = await client.getChats();
          for (const chat of waChats) {
            const id = chat.id._serialized;
            const name = chat.name || null;
            const isGroup = chat.isGroup;
            const isReadOnly = chat.isReadOnly;
            const unreadCount = chat.unreadCount;
            const timestamp = chat.timestamp;
            const archived = chat.archived;
            const pinned = chat.pinned;
            insertChat.run(
              id,
              normalize(name),
              normalize(isGroup),
              normalize(isReadOnly),
              normalize(unreadCount),
              normalize(timestamp),
              normalize(archived),
              normalize(pinned)
            );
          }
          chats = getChats.all();
          console.log(`Loaded ${chats.length} chats`);
        }
        // Filtrar duplicados por id
        chats = chats.filter((chat, index, self) =>
          index === self.findIndex(c => c.id === chat.id)
        );
        const start = (page - 1) * limit;
        const end = start + limit;
        const paginatedChats = chats.slice(start, end);

        console.log(
          `get_chats - Page: ${page}, Limit: ${limit}, Total: ${chats.length}, Start: ${start}, End: ${end}, Returning: ${paginatedChats.length}`
        );

        // Transform each chat so frontend can use chat.id._serialized like whatsapp-web.js
        const chatsForClient = paginatedChats.map((c) => ({
          ...c,
          id: { _serialized: c.id },
        }));
        socket.emit("chats", {
          chats: chatsForClient,
          total: chats.length,
          page,
          limit,
        });
      } catch (error) {
        console.error("Error in get_chats:", error);
        socket.emit("error", error.message);
      }
    });

    socket.on("get_messages", (data) => {
      try {
        const { chatId, page = 1, limit = 20 } = data;
        const offset = (page - 1) * limit;
        const messages = getMessages.all(chatId, limit, offset);
        socket.emit("messages", {
          messages,
          total: messages.length,
          page,
          limit,
        });
      } catch (error) {
        socket.emit("error", error.message);
      }
    });

    socket.on("send_message", async (data) => {
      try {
        const { chatId, message } = data;
        const chat = await client.getChatById(chatId);
        const sentMessage = await chat.sendMessage(message);
        // Guardar mensaje enviado
        insertMessage.run(
          normalize(
            sentMessage &&
              sentMessage.id &&
              (sentMessage.id._serialized || sentMessage.id.id)
              ? sentMessage.id._serialized || sentMessage.id.id
              : null
          ),
          normalize(chatId),
          normalize(message),
          normalize("me"),
          normalize(chatId),
          normalize(
            sentMessage && sentMessage.timestamp ? sentMessage.timestamp : null
          ),
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
        socket.emit("message_sent", { chatId, message });
      } catch (error) {
        socket.emit("error", error.message);
      }
    });
  });
}

module.exports = { setupSocketHandlers };
// server.js - Punto de entrada principal del servidor WhatsApp CRM

const { Server } = require("socket.io");
const http = require("http");
const { SERVER_PORT, CORS_ORIGIN } = require("./config");
const { setupRoutes } = require("./routes");
const { setupSocketHandlers } = require("./socket-handler");
const { startReminderWorker } = require("./reminder-worker");
const {
  client,
  qrState,
  readyState,
  saveInitialData,
  getChatDisplayName,
  normalize,
  normalizeChatIdInput,
} = require("./whatsapp-client");
const {
  insertChat,
  insertMessage,
  deleteOldMessages,
  getChats,
  getContacts,
} = require("../lib/database");
const { downloadAndSaveMedia } = require("./media-handler");

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
  },
});

// Configurar rutas REST
setupRoutes(server, io);

// Configurar manejadores de Socket.IO
setupSocketHandlers(io);

// Eventos del cliente WhatsApp con emisiones a Socket.IO
client.on("qr", (qr) => {
  console.log("QR RECEIVED");
  require("qrcode").toDataURL(qr, (err, url) => {
    if (err) throw err;
    qrState.lastQr = url;
    io.emit("qr", url);
  });
});

client.on("authenticated", (auth) => {
  console.log("Client authenticated");
  io.emit("authenticated", auth);
});

client.on("auth_failure", (msg) => {
  console.error("Authentication failure:", msg);
  io.emit("auth_failure", msg);
});

client.on("disconnected", (reason) => {
  console.log("Client disconnected:", reason);
  readyState.isReady = false;
  io.emit("disconnected", reason);
});

client.on("ready", async () => {
  console.log("Client is ready!");
  // Emitir "ready" inmediatamente para ocultar el QR y mostrar la UI
  readyState.isReady = true;
  qrState.lastQr = null; // Limpiar el último QR
  io.emit("ready");
  io.emit("qr", null); // Limpiar el QR para mostrar la UI principal
  console.log("Ready emitted immediately, qr cleared");

  // No cargar datos iniciales, usar lazy loading
});

client.on("message", async (message) => {
  console.log(
    "New message:",
    message && message.body ? message.body : "<no-body>"
  );

  // Descargar y guardar multimedia
  const { mediaFilename, mediaMime, mediaSize } = await downloadAndSaveMedia(
    message,
    message.chat && message.chat.id
      ? message.chat.id._serialized || message.chat.id
      : "unknown"
  );

  // Guardar mensaje
  try {
    insertMessage.run(
      normalize(
        message && message.id && (message.id._serialized || message.id.id)
          ? message.id._serialized || message.id.id
          : null
      ),
      normalize(
        message && message.chat && message.chat.id
          ? message.chat.id._serialized || message.chat.id
          : null
      ),
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
    console.warn(
      "Failed to save message to DB:",
      e && e.message ? e.message : e
    );
  }

  // Limpiar mensajes antiguos
  try {
    const chatId =
      message.chat && message.chat.id
        ? message.chat.id._serialized || message.chat.id
        : null;
    if (chatId) {
      deleteOldMessages.run(chatId, chatId);
    }
  } catch (e) {
    /* ignore */
  }

  // Update chats table
  try {
    const chatIdStr =
      message.chat && message.chat.id
        ? message.chat.id._serialized || message.chat.id
        : null;
    const existingChatName =
      message.chat &&
      (message.chat.name || (message.chat.contact && message.chat.contact.name))
        ? message.chat.name ||
          (message.chat.contact && message.chat.contact.name)
        : null;
    const isGroup = message.chat && message.chat.isGroup;

    const resolvedChatName = getChatDisplayName(
      chatIdStr,
      isGroup,
      existingChatName
    );

    if (chatIdStr) {
      insertChat.run(
        chatIdStr,
        normalize(resolvedChatName),
        normalize(isGroup),
        normalize(message.chat && message.chat.isReadOnly),
        normalize(message.chat && message.chat.unreadCount),
        normalize(message.timestamp),
        normalize(message.chat && message.chat.archived),
        normalize(message.chat && message.chat.pinned)
      );
      // Emit updated chat list
      try {
        const chatsRows = getChats.all();
        let chatsForClient = chatsRows.map((c) => ({
          ...c,
          id: { _serialized: c.id },
        }));
        // Filtrar duplicados por id._serialized
        chatsForClient = chatsForClient.filter((chat, index, self) =>
          index === self.findIndex(c => c.id._serialized === chat.id._serialized)
        );
        io.emit("chats", {
          chats: chatsForClient,
          total: chatsRows.length,
          page: 1,
          limit: 10,
        });
      } catch (e) {
        /* ignore */
      }
    }
  } catch (e) {
    console.warn(
      "Failed to update chat record:",
      e && e.message ? e.message : e
    );
  }

  // Emit new message
  const chatIdForEmit =
    message.chat && message.chat.id
      ? message.chat.id._serialized || message.chat.id
      : null;
  const emitMsg = {
    id:
      message.id && (message.id._serialized || message.id.id)
        ? message.id._serialized || message.id.id
        : null,
    body: message.body,
    from: message.from,
    timestamp: message.timestamp,
    type: message.type,
    hasMedia: !!message.hasMedia,
  };
  if (mediaFilename && chatIdForEmit) {
    emitMsg.mediaUrl = `http://localhost:3001/media/${encodeURIComponent(
      chatIdForEmit
    )}/${encodeURIComponent(mediaFilename)}`;
    emitMsg.mediaMime = mediaMime;
    emitMsg.mediaFilename = mediaFilename;
  }

  io.emit("new_message", { chatId: chatIdForEmit, message: emitMsg });
});

// Inicializar cliente WhatsApp
client.initialize();

// Iniciar el worker de recordatorios
startReminderWorker();

server.listen(SERVER_PORT, () => {
  console.log("Server running on port", SERVER_PORT);
});
// whatsapp-client.js - Módulo para el cliente WhatsApp y sus eventos

const path = require("path");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode");
const {
  insertContact,
  insertChat,
  insertMessage,
  deleteOldMessages,
  getContacts,
  getChats,
  getMessages,
} = require("../lib/database");
const { PREFETCH_MESSAGES } = require("./config");

const client = new Client({
  authStrategy: new LocalAuth(),
});

let qrState = { lastQr: null };
let readyState = { isReady: false };

// Normalize values before binding to SQLite
function normalize(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (
    typeof value === "number" ||
    typeof value === "string" ||
    typeof value === "bigint"
  )
    return value;
  if (Buffer.isBuffer(value)) return value;
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch (e) {
      return String(value);
    }
  }
  return String(value);
}

// Normalize a chatId that may be a string or an object coming from the frontend
function normalizeChatIdInput(raw) {
  if (!raw) return null;
  if (typeof raw === "string") return raw;
  if (typeof raw === "object") {
    // common shapes: { _serialized: '...', id: '...' } or { id: { _serialized: '...' } }
    if (raw._serialized) return raw._serialized;
    if (raw.id && (raw.id._serialized || typeof raw.id === "string"))
      return raw.id._serialized || raw.id;
    // sometimes frontend sends a full chat object with an `id` property that's also an object
    try {
      // fallback: try toString
      return String(raw);
    } catch (e) {
      return null;
    }
  }
  return null;
}

// Función para obtener el nombre del chat resolviendo desde contactos si es necesario
function getChatDisplayName(chatId, isGroup, existingName) {
  // Si es un grupo y tiene nombre, usarlo
  if (isGroup && existingName) {
    return existingName;
  }

  // Si no es grupo y ya tiene nombre, usarlo
  if (!isGroup && existingName) {
    return existingName;
  }

  // Si no es grupo y no tiene nombre, buscar en contactos
  if (!isGroup) {
    try {
      const contact = getContacts.all().find((c) => c.id === chatId);
      if (contact && contact.name && contact.name !== "null") {
        return contact.name;
      }
      // Si no hay contacto con nombre, usar el número
      if (contact && contact.number) {
        return contact.number;
      }
    } catch (e) {
      console.warn(
        "Error looking up contact for chat:",
        e && e.message ? e.message : e
      );
    }
  }

  // Fallback al nombre existente o null
  return existingName;
}

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
          console.warn(
            `Retry ${i + 1}/${attempts} failed:`,
            err && err.message ? err.message : err
          );
          await new Promise((r) => setTimeout(r, delay));
        }
      }
      throw lastErr;
    }

    const contacts = await retryAsync(() => client.getContacts(), 3, 1000);
    console.log(
      "saveInitialData: contacts fetched count =",
      Array.isArray(contacts) ? contacts.length : "not-array"
    );
    if (Array.isArray(contacts) && contacts.length > 0) {
      contacts.forEach((contact) => {
        const id =
          contact && contact.id && contact.id._serialized
            ? contact.id._serialized
            : contact && contact._serialized
            ? contact._serialized
            : null;
        const name =
          contact && (contact.name || contact.pushname || contact.push_name)
            ? contact.name || contact.pushname || contact.push_name
            : null;
        const number =
          contact && (contact.number || (contact.id && contact.id.user))
            ? contact.number || (contact.id && contact.id.user)
            : null;
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
      console.log("Contacts saved to DB");
    } else {
      console.log("No contacts returned from client.getContacts()");
    }

    const chats = await retryAsync(() => client.getChats(), 3, 1000);
    console.log(
      "saveInitialData: chats fetched count =",
      Array.isArray(chats) ? chats.length : "not-array"
    );
    if (Array.isArray(chats) && chats.length > 0) {
      // Save chats first
      chats.forEach((chat) => {
        const id =
          chat && chat.id && chat.id._serialized
            ? chat.id._serialized
            : chat && chat._serialized
            ? chat._serialized
            : null;
        const existingName =
          chat && (chat.name || (chat.contact && chat.contact.name))
            ? chat.name || (chat.contact && chat.contact.name)
            : null;
        const isGroup = chat && chat.isGroup;

        // Usar la función mejorada para resolver el nombre del chat
        const resolvedName = getChatDisplayName(id, isGroup, existingName);

        insertChat.run(
          id,
          normalize(resolvedName),
          normalize(isGroup),
          normalize(chat && chat.isReadOnly),
          normalize(chat && chat.unreadCount),
          normalize(chat && chat.timestamp),
          normalize(chat && chat.archived),
          normalize(chat && chat.pinned)
        );
      });
      console.log("Chats saved to DB");

      // Optionally fetch and save recent messages for each chat.
      // Default: disabled to avoid heavy startup work. Set PREFETCH_MESSAGES=true to enable.
      if (PREFETCH_MESSAGES) {
        // Fetch and save recent messages for each chat (sequential to avoid overloading the session)
        for (const chat of chats) {
          const chatId =
            chat && chat.id && chat.id._serialized
              ? chat.id._serialized
              : chat && chat._serialized
              ? chat._serialized
              : null;
          if (!chatId) continue;
          try {
            console.log(`Fetching messages for chat ${chatId}`);
            // get chat model from client
            const chatModel = await retryAsync(
              () => client.getChatById(chatId),
              3,
              1000
            );
            // fetch recent messages (adjust limit as needed)
            const messages = await retryAsync(
              () => chatModel.fetchMessages({ limit: 50 }),
              3,
              1000
            );
            if (Array.isArray(messages) && messages.length) {
              let saved = 0;
              for (const m of messages) {
                try {
                  insertMessage.run(
                    normalize(
                      m && m.id && (m.id._serialized || m.id.id)
                        ? m.id._serialized || m.id.id
                        : null
                    ),
                    normalize(chatId),
                    normalize(
                      m && m.body ? m.body : m && m.content ? m.content : null
                    ),
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
                  console.warn(
                    `Failed to save message for chat ${chatId}:`,
                    err && err.message ? err.message : err
                  );
                }
              }
              console.log(
                `Saved ${saved}/${messages.length} messages for chat ${chatId}`
              );
            }
            // small delay between chats
            await new Promise((r) => setTimeout(r, 150));
          } catch (err) {
            console.warn(
              `Failed to fetch messages for chat ${chatId}:`,
              err && err.message ? err.message : err
            );
          }
        }
      } else {
        console.log(
          "PREFETCH_MESSAGES not enabled; skipping messages prefetch at startup"
        );
      }
    } else {
      console.log("No chats returned from client.getChats()");
    }
  } catch (error) {
    console.error("Error saving initial data:", error);
  }
}

// Eventos del cliente (ahora manejados en server.js)


module.exports = {
  client,
  qrState,
  readyState,
  saveInitialData,
  getChatDisplayName,
  normalize,
  normalizeChatIdInput,
};
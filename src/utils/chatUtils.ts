import { Chat, Contact } from '../types';

/**
 * Función para obtener el nombre del chat resolviendo desde contactos si es necesario
 * Esta función maneja la correlación entre chats y contactos para mostrar nombres correctos
 */
export const getChatDisplayName = (chat: Chat, contacts: Contact[]): string => {
  // Si el chat tiene un nombre definido y no está vacío, usarlo
  if (chat.name && chat.name.trim()) {
    return chat.name;
  }

  // Obtener el ID del chat
  const chatId = chat?.id?._serialized ?? chat?.id;
  
  // Buscar contacto por ID exacto
  let contact = contacts.find(contact => contact.id === chatId);
  
  // Si no se encuentra por ID exacto, intentar buscar por número de teléfono
  if (!contact && chat.id.user) {
    contact = contacts.find(contact => contact.number === chat.id.user);
  }
  
  // Si se encuentra el contacto con nombre
  if (contact && contact.name && contact.name.trim()) {
    return contact.name;
  }

  // Si no hay contacto con nombre, usar el número de teléfono
  if (contact && contact.number) {
    return contact.number;
  }

  // Fallback al ID del usuario del chat o al chatId completo
  return chat.id.user || chatId;
};

/**
 * Función para obtener el avatar del chat resolviendo desde contactos si es necesario
 */
export const getChatAvatar = (chat: Chat, contacts: Contact[]): string | undefined => {
  // Si el chat tiene un avatar definido, usarlo
  if (chat.avatar) {
    return chat.avatar;
  }

  // Obtener el ID del chat
  const chatId = chat?.id?._serialized ?? chat?.id;
  
  // Buscar contacto por ID exacto
  let contact = contacts.find(contact => contact.id === chatId);
  
  // Si no se encuentra por ID exacto, intentar buscar por número de teléfono
  if (!contact && chat.id.user) {
    contact = contacts.find(contact => contact.number === chat.id.user);
  }
  
  // Retornar el avatar del contacto si existe
  return contact?.avatar;
};

/**
 * Función para debug - muestra información sobre la correlación chat-contacto
 */
export const debugChatContactMapping = (chat: Chat, contacts: Contact[]) => {
  const chatId = chat?.id?._serialized ?? chat?.id;
  const contact = contacts.find(contact => contact.id === chatId);
  
  console.log('Chat Debug:', {
    chatId,
    chatName: chat.name,
    chatUserId: chat.id.user,
    contactFound: !!contact,
    contactName: contact?.name,
    contactNumber: contact?.number,
    resolvedName: getChatDisplayName(chat, contacts)
  });
};

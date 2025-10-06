import React, { useState, useEffect } from "react";
import { Chat, Contact } from "../types";
import { getChatDisplayName } from "../utils/chatUtils";

// Tipo unificado para resultados de búsqueda
type SearchResult = Chat & {
  type: "chat" | "contact";
  contactData?: Contact;
};

interface ChatSearchProps {
  chats: Chat[];
  contacts: Contact[];
  onSearchResults: (filteredResults: SearchResult[]) => void;
  onClearSearch: () => void;
}

export const ChatSearch: React.FC<ChatSearchProps> = ({
  chats,
  contacts,
  onSearchResults,
  onClearSearch,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Función para buscar chats y contactos
  const searchChatsAndContacts = (query: string) => {
    if (!query.trim()) {
      onClearSearch();
      return;
    }

    setIsSearching(true);

    const searchTerm = query.toLowerCase();
    const results: SearchResult[] = [];

    // Contactos de prueba para desarrollo
    const testContacts = [
      {
        id: "test1",
        name: "Juan Pérez",
        number: "+573001234567",
        avatar: undefined,
      },
      {
        id: "test2",
        name: "María García",
        number: "+573007654321",
        avatar: undefined,
      },
      {
        id: "test3",
        name: "Carlos López",
        number: "+573009876543",
        avatar: undefined,
      },
    ];

    // Agregar contactos de prueba si la búsqueda coincide
    testContacts.forEach((contact) => {
      const contactName = contact.name.toLowerCase();
      if (contactName.includes(searchTerm)) {
        results.push({
          id: { _serialized: contact.id },
          name: contact.name,
          avatar: contact.avatar,
          type: "contact",
          contactData: contact,
        } as SearchResult);
      }
    });

    // Buscar en chats
    const filteredChats = chats.filter((chat) => {
      const chatName = getChatDisplayName(chat, contacts);
      const lastMessage = chat.lastMessage || "";

      return (
        chatName.toLowerCase().includes(searchTerm) ||
        lastMessage.toLowerCase().includes(searchTerm)
      );
    });

    // Agregar chats a resultados
    filteredChats.forEach((chat) => {
      results.push({
        ...chat,
        type: "chat",
      });
    });

    // Buscar en contactos que no tienen chat
    const filteredContacts = contacts.filter((contact) => {
      const contactName = contact.name || contact.number;
      const hasExistingChat = chats.some((chat) => {
        const chatName = getChatDisplayName(chat, contacts);
        return chatName.toLowerCase() === contactName.toLowerCase();
      });

      return !hasExistingChat && contactName.toLowerCase().includes(searchTerm);
    });

    // Agregar contactos a resultados (crear un objeto tipo Chat para compatibilidad)
    filteredContacts.forEach((contact) => {
      results.push({
        id: { _serialized: contact.id },
        name: contact.name,
        avatar: contact.avatar,
        type: "contact",
        contactData: contact,
      } as SearchResult);
    });

    onSearchResults(results);
    setIsSearching(false);
  };

  // Debounce para evitar búsquedas excesivas
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchChatsAndContacts(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, chats, contacts]);

  const handleClearSearch = () => {
    setSearchQuery("");
    onClearSearch();
  };

  return (
    <div className="p-4 border-b border-gray-100 flex-shrink-0">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-4 w-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <input
          type="text"
          placeholder="Buscar chats, contactos o mensajes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        {searchQuery && (
          <button
            onClick={handleClearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}

        {isSearching && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <svg
              className="animate-spin h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

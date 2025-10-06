import React, { useRef, useEffect, useState } from "react";
import { Chat, Contact } from "../types";
import { Avatar, Badge, Spinner } from "./ui";
import { ChatSearch } from "./ChatSearch";
import { getChatDisplayName } from "../utils/chatUtils";

// Tipo unificado para resultados de búsqueda
type SearchResult = Chat & {
  type: "chat" | "contact";
  contactData?: Contact;
};

interface ChatSidebarProps {
  contacts: Contact[];
  chats: Chat[];
  selectedChat: Chat | null;
  onChatClick: (chat: Chat) => void;
  onContactClick: (contact: Contact) => void;
  hasMoreChats: boolean;
  loadingMoreChats: boolean;
  onLoadMoreChats: () => void;
  syncingChatId: string | null;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  contacts,
  chats,
  selectedChat,
  onChatClick,
  onContactClick,
  hasMoreChats,
  loadingMoreChats,
  onLoadMoreChats,
  syncingChatId,
}) => {
  const chatsContainerRef = useRef<HTMLDivElement>(null);
  const chatsSentinelRef = useRef<HTMLLIElement>(null);
  const [displayedResults, setDisplayedResults] = useState<SearchResult[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);

  // IntersectionObserver para cargar más chats
  useEffect(() => {
    const sentinel = chatsSentinelRef.current;
    if (!sentinel) {
      console.log("No sentinel element found for infinite scroll");
      return;
    }

    const rootEl = chatsContainerRef.current || null;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          console.log(
            `Sentinel intersection: ${entry.isIntersecting}, hasMoreChats: ${hasMoreChats}`
          );
          if (entry.isIntersecting && hasMoreChats) {
            console.log("Triggering loadMoreChats from intersection observer");
            onLoadMoreChats();
          }
        }
      },
      { root: rootEl, rootMargin: "100px", threshold: 0.1 }
    );

    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [hasMoreChats, chats.length, onLoadMoreChats]);

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return date.toLocaleDateString();
  };

  // Sincronizar displayedResults con chats cuando no hay búsqueda activa
  useEffect(() => {
    if (!isSearchActive) {
      const chatResults: SearchResult[] = chats.map((chat) => ({
        ...chat,
        type: "chat",
      }));
      setDisplayedResults(chatResults);
    }
  }, [chats, isSearchActive]);

  const getChatId = (chat: Chat) => chat?.id?._serialized ?? chat?.id;

  // Función para obtener la etiqueta del contacto (igual que en MessageArea)
  const getChatTag = (chat: Chat) => {
    // Etiquetas mock para algunos chats existentes (para demostración)
    const chatNameTags: { [key: string]: string } = {
      "DEV SENIOR CODE LLC": "Proveedor",
      "Juan Camilo Dev": "Empleado",
      "Alejandro Dev": "Empleado",
      "Emanuel Web": "Empleado",
      "Alicia Magis TV pro": "Cliente",
      Revendedores: "Cliente",
      Amor: "Familia",
    };

    // Buscar en contactos reales si existe
    const contact = contacts.find(
      (c) =>
        c.id === chat.id._serialized ||
        c.number === chat.id.user ||
        c.name === chat.name
    );

    if (contact && contact.tag) {
      return contact.tag;
    }

    // Retornar etiqueta por nombre del chat
    const chatName = chat.name || chat.id.user;
    if (chatName && chatNameTags[chatName]) {
      return chatNameTags[chatName];
    }

    // Retornar etiqueta por defecto
    return "Sin etiqueta";
  };

  const handleSearchResults = (filteredResults: SearchResult[]) => {
    setDisplayedResults(filteredResults);
    setIsSearchActive(true);
  };

  const handleClearSearch = () => {
    const chatResults: SearchResult[] = chats.map((chat) => ({
      ...chat,
      type: "chat",
    }));
    setDisplayedResults(chatResults);
    setIsSearchActive(false);
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <h1 className="text-xl font-semibold text-gray-900">TolkToc CRM</h1>
      </div>

      {/* Chats */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-sm font-medium text-gray-700">Chats</h2>
        </div>

        {/* Buscador de chats */}
        <ChatSearch
          chats={chats}
          contacts={contacts}
          onSearchResults={handleSearchResults}
          onClearSearch={handleClearSearch}
        />

        {/* Filtro por etiquetas */}
        <div className="p-3 border-b border-gray-100">
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Filtrar por etiqueta
          </label>
          <select
            onChange={(e) => {
              const selectedTag = e.target.value;
              if (selectedTag === "") {
                // Mostrar todos los chats
                const allChatResults: SearchResult[] = chats.map((chat) => ({
                  ...chat,
                  type: "chat" as const,
                }));
                setDisplayedResults(allChatResults);
                setIsSearchActive(false);
              } else {
                // Filtrar por etiqueta
                const filteredChats = chats.filter((chat) => {
                  const chatTag = getChatTag(chat);
                  return chatTag === selectedTag;
                });
                const filteredResults: SearchResult[] = filteredChats.map(
                  (chat) => ({
                    ...chat,
                    type: "chat" as const,
                  })
                );
                setDisplayedResults(filteredResults);
                setIsSearchActive(true);
              }
            }}
            className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="">Todas las etiquetas</option>
            <option value="Cliente">Cliente</option>
            <option value="Proveedor">Proveedor</option>
            <option value="Empleado">Empleado</option>
            <option value="Familia">Familia</option>
            <option value="Amigo">Amigo</option>
            <option value="Negocio">Negocio</option>
            <option value="Servicio">Servicio</option>
            <option value="Otro">Otro</option>
            <option value="Sin etiqueta">Sin etiqueta</option>
          </select>
        </div>

        <div ref={chatsContainerRef} className="flex-1 overflow-y-auto min-h-0">
          {displayedResults.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p>
                {isSearchActive
                  ? "No se encontraron chats o contactos"
                  : "No hay chats disponibles"}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {displayedResults.map((result) => {
                const resultId = getChatId(result);
                const isSelected =
                  selectedChat && getChatId(selectedChat) === resultId;
                const isSyncing = syncingChatId === resultId;
                const isContact = result.type === "contact";

                return (
                  <li key={resultId}>
                    <button
                      onClick={() => {
                        if (isContact) {
                          onContactClick(result.contactData!);
                        } else {
                          onChatClick(result);
                        }
                      }}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                        isSelected
                          ? "bg-blue-50 border-r-2 border-blue-500"
                          : ""
                      } ${isContact ? "opacity-80" : ""}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <Avatar
                            src={result.avatar}
                            name={
                              isContact
                                ? result.contactData?.name ||
                                  result.contactData?.number
                                : getChatDisplayName(result, contacts)
                            }
                            size="md"
                          />
                          {isSyncing && (
                            <div className="absolute -top-1 -right-1">
                              <Spinner size="sm" />
                            </div>
                          )}
                          {isContact && (
                            <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                              <span className="text-xs">👤</span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h3 className="font-medium text-gray-900 truncate">
                              {isContact
                                ? result.contactData?.name ||
                                  result.contactData?.number
                                : getChatDisplayName(result, contacts)}
                            </h3>
                            <div className="flex flex-col items-end space-y-1">
                              {!isContact && result.timestamp && (
                                <span className="text-xs text-gray-500">
                                  {formatTimestamp(result.timestamp)}
                                </span>
                              )}
                              {!isContact &&
                                result.unreadCount &&
                                result.unreadCount > 0 && (
                                  <Badge variant="error" size="sm">
                                    {result.unreadCount > 99
                                      ? "99+"
                                      : result.unreadCount}
                                  </Badge>
                                )}
                              {isContact && (
                                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                                  Contacto
                                </span>
                              )}
                            </div>
                          </div>

                          {!isContact && result.lastMessage && (
                            <p className="text-sm text-gray-600 truncate mt-1">
                              {result.lastMessage}
                            </p>
                          )}
                          {isContact && result.contactData?.number && (
                            <p className="text-sm text-gray-500 truncate mt-1">
                              {result.contactData.number}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}

              {/* Sentinel para infinite scroll - solo mostrar cuando no hay búsqueda activa */}
              {!isSearchActive && hasMoreChats && (
                <li ref={chatsSentinelRef} aria-hidden className="h-1" />
              )}
            </ul>
          )}

          {loadingMoreChats && !isSearchActive && (
            <div className="p-4 text-center">
              <Spinner size="sm" className="mx-auto" />
              <p className="text-sm text-gray-500 mt-2">
                Cargando más chats...
              </p>
            </div>
          )}

          {!isSearchActive && hasMoreChats && !loadingMoreChats && (
            <div className="p-4 text-center">
              <button
                onClick={onLoadMoreChats}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                Cargar más chats ({chats.length} de {chats.length + 10}+)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

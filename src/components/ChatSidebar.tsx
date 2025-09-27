import React, { useRef, useEffect } from 'react';
import { Chat, Contact } from '../types';
import { Avatar, Badge, Spinner } from './ui';

interface ChatSidebarProps {
  contacts: Contact[];
  chats: Chat[];
  selectedChat: Chat | null;
  onChatClick: (chat: Chat) => void;
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
  hasMoreChats,
  loadingMoreChats,
  onLoadMoreChats,
  syncingChatId
}) => {
  const chatsContainerRef = useRef<HTMLDivElement>(null);
  const chatsSentinelRef = useRef<HTMLLIElement>(null);

  // IntersectionObserver para cargar más chats
  useEffect(() => {
    const sentinel = chatsSentinelRef.current;
    if (!sentinel) return;
    
    const rootEl = chatsContainerRef.current || null;
    const obs = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && hasMoreChats) {
          onLoadMoreChats();
        }
      }
    }, { root: rootEl, rootMargin: '100px', threshold: 0.1 });
    
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [hasMoreChats, chats.length, onLoadMoreChats]);

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString();
  };

  const getChatId = (chat: Chat) => chat?.id?._serialized ?? chat?.id;

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <h1 className="text-xl font-semibold text-gray-900">WhatsApp CRM</h1>
      </div>

      {/* Contactos */}
      {contacts.length > 0 && (
        <div className="p-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Contactos</h2>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {contacts.slice(0, 5).map((contact) => (
              <div key={contact.id} className="flex items-center space-x-3 text-sm">
                <Avatar
                  src={contact.avatar}
                  name={contact.name || contact.number}
                  size="sm"
                />
                <span className="text-gray-600 truncate">
                  {contact.name || contact.number}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chats */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-sm font-medium text-gray-700">Chats</h2>
        </div>
        
        <div 
          ref={chatsContainerRef}
          className="flex-1 overflow-y-auto min-h-0"
        >
          {chats.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p>No hay chats disponibles</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {chats.map((chat) => {
                const chatId = getChatId(chat);
                const isSelected = selectedChat && getChatId(selectedChat) === chatId;
                const isSyncing = syncingChatId === chatId;
                
                return (
                  <li key={chatId}>
                    <button
                      onClick={() => onChatClick(chat)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                        isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <Avatar
                            src={chat.avatar}
                            name={chat.name || chat.id.user}
                            size="md"
                          />
                          {isSyncing && (
                            <div className="absolute -top-1 -right-1">
                              <Spinner size="sm" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h3 className="font-medium text-gray-900 truncate">
                              {chat.name || chat.id.user}
                            </h3>
                            <div className="flex flex-col items-end space-y-1">
                              {chat.timestamp && (
                                <span className="text-xs text-gray-500">
                                  {formatTimestamp(chat.timestamp)}
                                </span>
                              )}
                              {chat.unreadCount && chat.unreadCount > 0 && (
                                <Badge variant="error" size="sm">
                                  {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {chat.lastMessage && (
                            <p className="text-sm text-gray-600 truncate mt-1">
                              {chat.lastMessage}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
              
              {/* Sentinel para infinite scroll */}
              <li ref={chatsSentinelRef} aria-hidden className="h-1" />
            </ul>
          )}
          
          {loadingMoreChats && (
            <div className="p-4 text-center">
              <Spinner size="sm" className="mx-auto" />
              <p className="text-sm text-gray-500 mt-2">Cargando más chats...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
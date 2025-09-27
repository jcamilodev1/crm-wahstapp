import React, { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import { Chat, Message } from '../types';
import { Avatar, Button, Input, Spinner } from './ui';
import { MessageStatus } from './MessageStatus';
import ReminderModal from './ReminderModal';

interface MessageAreaProps {
  selectedChat: Chat | null;
  messages: Message[];
  onSendMessage: (message: string) => void;
  hasMoreMessages: boolean;
  loadingMoreMessages: boolean;
  onLoadMoreMessages: () => void;
  syncError: string | null;
  chats?: any[];
  onMarkAsRead?: (chatId: string) => void;
}

export const MessageArea: React.FC<MessageAreaProps> = ({
  selectedChat,
  messages,
  onSendMessage,
  hasMoreMessages,
  loadingMoreMessages,
  onLoadMoreMessages,
  syncError,
  chats = [],
  onMarkAsRead
}) => {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [messageInput, setMessageInput] = useState('');
  const [showReminderModal, setShowReminderModal] = useState(false);

  // Marcar mensajes como leídos cuando se selecciona un chat
  useEffect(() => {
    if (selectedChat && onMarkAsRead) {
      const timer = setTimeout(() => {
        onMarkAsRead(selectedChat.id._serialized);
      }, 1000); // Marcar como leído después de 1 segundo

      return () => clearTimeout(timer);
    }
  }, [selectedChat, onMarkAsRead]);

  // Scroll al final cuando se reciben nuevos mensajes
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages.length]);

  // Scroll infinito para cargar mensajes anteriores
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (container.scrollTop < Math.max(50, container.clientHeight * 0.2)) {
        onLoadMoreMessages();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMoreMessages, onLoadMoreMessages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    
    onSendMessage(messageInput.trim());
    setMessageInput('');
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMediaContent = (message: Message) => {
    if (!message.hasMedia || !message.mediaUrl) return null;

    const { mediaMime, mediaUrl, mediaFilename } = message;

    if (mediaMime?.startsWith('image/')) {
      return (
        <div className="mt-2 max-w-xs">
          <div className="relative rounded-lg overflow-hidden">
            <Image
              src={mediaUrl}
              alt={mediaFilename || 'Imagen'}
              width={300}
              height={200}
              className="object-cover"
              unoptimized
            />
          </div>
        </div>
      );
    }

    if (mediaMime?.startsWith('audio/')) {
      return (
        <div className="mt-2">
          <audio controls className="max-w-xs">
            <source src={mediaUrl} type={mediaMime} />
            <track kind="captions" src="" label="No captions available" />
            Tu navegador no soporta el elemento de audio.
          </audio>
        </div>
      );
    }

    if (mediaMime?.startsWith('video/')) {
      return (
        <div className="mt-2 max-w-xs">
          <video controls className="rounded-lg max-h-64 w-full">
            <source src={mediaUrl} type={mediaMime} />
            <track kind="captions" src="" label="No captions available" />
            Tu navegador no soporta el elemento de video.
          </video>
        </div>
      );
    }

    // Archivo genérico
    return (
      <div className="mt-2">
        <a
          href={mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-sm text-gray-700">
            {mediaFilename || 'Descargar archivo'}
          </span>
        </a>
      </div>
    );
  };

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 ">
        <div className="text-center">
          <div className="mx-auto w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Selecciona un chat
          </h3>
          <p className="text-gray-600">
            Elige una conversación del panel izquierdo para comenzar a chatear
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header del chat */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <Avatar
            src={selectedChat.avatar}
            name={selectedChat.name || selectedChat.id.user}
            size="md"
          />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedChat.name || selectedChat.id.user}
            </h2>
            {syncError && (
              <p className="text-sm text-red-600 mt-1">
                Error de sincronización: {syncError}
              </p>
            )}
          </div>
          <Button
            onClick={() => setShowReminderModal(true)}
            className="bg-yellow-400 hover:bg-yellow-500 text-black px-3 py-2 text-sm"
            title="Programar recordatorio"
          >
            Recordar
          </Button>
        </div>
      </div>

      {/* Área de mensajes */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
      >
        {loadingMoreMessages && (
          <div className="text-center py-2">
            <Spinner size="sm" className="mx-auto" />
            <p className="text-sm text-gray-500 mt-2">Cargando mensajes anteriores...</p>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No hay mensajes en esta conversación</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`flex ${message.fromMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg relative ${
                message.fromMe 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-900 shadow-sm border'
              } ${!message.fromMe && message.isRead === false ? 'ring-2 ring-blue-200' : ''}`}>
                {/* Indicador de mensaje no leído */}
                {!message.fromMe && message.isRead === false && (
                  <div className="absolute -left-2 top-2 w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
                {!message.fromMe && (
                  <p className="text-xs opacity-75 mb-1">
                    {message.from}
                  </p>
                )}
                
                {message.body && (
                  <p className="break-words">{message.body}</p>
                )}
                
                {renderMediaContent(message)}
                
                <div className={`flex items-center justify-between mt-2 ${
                  message.fromMe ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  <p className="text-xs">
                    {formatTimestamp(message.timestamp)}
                  </p>
                  <MessageStatus 
                    ack={message.ack} 
                    fromMe={message.fromMe}
                    className={message.fromMe ? 'text-blue-100' : 'text-gray-500'}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Área de entrada de mensajes */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1"
          />
          <Button 
            type="submit" 
            disabled={!messageInput.trim()}
            className="px-6"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </Button>
        </form>
      </div>

      <ReminderModal
        open={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        chatId={selectedChat?.id?._serialized ?? selectedChat?.id}
        chats={chats}
        hideRecipients={true}
      />
    </div>
  );
};
import React from 'react';
import { ChatSidebar } from './ChatSidebar';
import { MessageArea } from './MessageArea';
import { useWhatsAppSocket } from '../hooks/useWhatsAppSocket';

export const ChatsSection: React.FC = () => {
  const {
    contacts,
    chats,
    messages,
    hasMoreChats,
    hasMoreMessages,
    loadingMoreChats,
    loadingMoreMessages,
    syncingChatId,
    syncError,
    selectedChat,
    handleChatClick,
    handleSendMessage,
    loadMoreChats,
    loadMoreMessages
  } = useWhatsAppSocket();

  return (
    <div className="flex flex-1 h-screen">
      <ChatSidebar
        contacts={contacts}
        chats={chats}
        selectedChat={selectedChat}
        onChatClick={handleChatClick}
        hasMoreChats={hasMoreChats}
        loadingMoreChats={loadingMoreChats}
        onLoadMoreChats={loadMoreChats}
        syncingChatId={syncingChatId}
      />
      <MessageArea
        selectedChat={selectedChat}
        messages={messages}
        onSendMessage={handleSendMessage}
        hasMoreMessages={hasMoreMessages}
        loadingMoreMessages={loadingMoreMessages}
        onLoadMoreMessages={loadMoreMessages}
        syncError={syncError}
        chats={chats}
      />
    </div>
  );
};
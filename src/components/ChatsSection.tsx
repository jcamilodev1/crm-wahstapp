import React, { useState } from "react";
import { ChatSidebar } from "./ChatSidebar";
import { MessageArea } from "./MessageArea";
import { ContactForm } from "./ContactForm";
import { useWhatsAppSocket } from "../hooks/useWhatsAppSocket";
import { Contact } from "../types";

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
    loadMoreMessages,
    markMessagesAsRead,
  } = useWhatsAppSocket();

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isEditingContact, setIsEditingContact] = useState(false);

  const handleContactClick = (contact: Contact) => {
    setSelectedContact(contact);
    setIsEditingContact(false);
  };

  const handleContactSave = (contactData: any) => {
    // Aquí implementarías la lógica para guardar/actualizar el contacto
    console.log("Saving contact:", contactData);

    // Por ahora, solo cerramos el formulario
    setSelectedContact(null);
    setIsEditingContact(false);

    // Aquí podrías emitir un evento al socket o hacer una llamada al backend
    // Por ejemplo: socket.emit('save_contact', contactData);
  };

  const handleContactCancel = () => {
    setSelectedContact(null);
    setIsEditingContact(false);
  };

  const handleAssignToChat = (contactData: any) => {
    console.log("Assigning contact to chat:", contactData);

    // Aquí implementarías la lógica para asignar el contacto a un chat
    // Por ejemplo, crear un nuevo chat o asignar a uno existente

    // Por ahora, simulamos la asignación
    alert(
      `¡Contacto "${contactData.name}" asignado a chat con etiqueta "${contactData.tag}"!`
    );

    // Cerrar el formulario después de asignar
    setSelectedContact(null);
    setIsEditingContact(false);
  };

  const handleEditContact = (chat: Chat) => {
    // Convertir el chat a un contacto para edición
    const contactToEdit = {
      id: chat.id._serialized || chat.id,
      name: chat.name || "",
      number: chat.id.user || "",
      avatar: chat.avatar,
    };

    setSelectedContact(contactToEdit);
    setIsEditingContact(true);
  };

  const renderMainContent = () => {
    if (selectedContact) {
      return (
        <ContactForm
          contact={selectedContact}
          isEditing={isEditingContact}
          onSave={handleContactSave}
          onCancel={handleContactCancel}
          onAssignToChat={handleAssignToChat}
        />
      );
    }

    return (
      <MessageArea
        selectedChat={selectedChat}
        messages={messages}
        onSendMessage={handleSendMessage}
        hasMoreMessages={hasMoreMessages}
        loadingMoreMessages={loadingMoreMessages}
        onLoadMoreMessages={loadMoreMessages}
        syncError={syncError}
        chats={chats}
        onMarkAsRead={markMessagesAsRead}
        onEditContact={handleEditContact}
        contacts={contacts}
      />
    );
  };

  return (
    <div className="flex flex-1 h-screen">
      <ChatSidebar
        contacts={contacts}
        chats={chats}
        selectedChat={selectedChat}
        onChatClick={handleChatClick}
        onContactClick={handleContactClick}
        hasMoreChats={hasMoreChats}
        loadingMoreChats={loadingMoreChats}
        onLoadMoreChats={loadMoreChats}
        syncingChatId={syncingChatId}
      />
      {renderMainContent()}
    </div>
  );
};

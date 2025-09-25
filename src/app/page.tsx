'use client';

import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

export default function Home() {
  const [qr, setQr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatPage, setChatPage] = useState(1);
  const [messagePage, setMessagePage] = useState(1);
  const [messageInput, setMessageInput] = useState('');

  useEffect(() => {
    console.log('Connecting to socket...');
    socket.on('connect', () => console.log('Connected to socket'));
    socket.on('disconnect', () => console.log('Disconnected from socket'));

    socket.on('qr', (qrUrl: string) => {
      console.log('QR received:', qrUrl);
      setQr(qrUrl);
    });

    socket.on('ready', () => {
      console.log('WhatsApp ready');
      setReady(true);
      setQr(null);
      socket.emit('get_contacts');
      socket.emit('get_chats', { page: chatPage, limit: 10 });
    });

    socket.on('contacts', (data: any[]) => {
      console.log('Contacts received:', data);
      setContacts(data);
    });

    socket.on('chats', (data: any) => {
      console.log('Chats received:', data);
      setChats(data.chats);
    });

    socket.on('messages', (data: any) => {
      console.log('Messages received:', data);
      setMessages(data.messages);
    });

    socket.on('new_message', (data: any) => {
      console.log('New message:', data);
      if (selectedChat && data.chatId === selectedChat.id._serialized) {
        setMessages(prev => [...prev, data.message]);
      }
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('qr');
      socket.off('ready');
      socket.off('contacts');
      socket.off('chats');
      socket.off('messages');
      socket.off('new_message');
    };
  }, [selectedChat, chatPage, messagePage]);

  const handleChatClick = (chat: any) => {
    setSelectedChat(chat);
    socket.emit('get_messages', { chatId: chat.id._serialized, page: messagePage, limit: 20 });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedChat) return;

    const messageData = {
      chatId: selectedChat.id._serialized,
      message: messageInput.trim()
    };

    // Agregar mensaje localmente para UX inmediata
    const tempMessage = {
      id: `temp-${Date.now()}`,
      body: messageInput.trim(),
      from: 'me',
      timestamp: Math.floor(Date.now() / 1000),
      type: 'chat',
      fromMe: true
    };
    setMessages(prev => [...prev, tempMessage]);

    socket.emit('send_message', messageData);
    setMessageInput('');
  };

  const loadMoreChats = () => {
    setChatPage(prev => prev + 1);
    socket.emit('get_chats', { page: chatPage + 1, limit: 10 });
  };

  const loadMoreMessages = () => {
    setMessagePage(prev => prev + 1);
    socket.emit('get_messages', { chatId: selectedChat.id._serialized, page: messagePage + 1, limit: 20 });
  };

  if (qr) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl mb-4">Escanea el código QR con WhatsApp</h1>
        <img src={qr} alt="QR Code" />
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Conectando...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <div className="w-1/3 border-r p-4">
        <h2 className="text-xl mb-4">Contactos</h2>
        <ul>
          {contacts.slice(0, 10).map((contact) => (
            <li key={contact.id} className="mb-2">
              {contact.name || contact.number}
            </li>
          ))}
        </ul>
        <h2 className="text-xl mb-4 mt-8">Chats</h2>
        <ul>
          {chats.map((chat) => (
            <li
              key={chat.id}
              className="mb-2 cursor-pointer p-2 hover:bg-gray-200"
              onClick={() => handleChatClick(chat)}
            >
              {chat.name || chat.id.user}
            </li>
          ))}
        </ul>
        <button onClick={loadMoreChats} className="mt-4 bg-blue-500 text-white px-4 py-2">
          Cargar más chats
        </button>
      </div>
      <div className="w-2/3 p-4">
        {selectedChat ? (
          <div>
            <h2 className="text-xl mb-4">{selectedChat.name || selectedChat.id.user}</h2>
            <div className="h-96 overflow-y-scroll border p-2">
              {messages.map((msg) => (
                <div key={msg.id} className="mb-2">
                  <strong>{msg.from === 'me' ? 'Yo' : msg.from}:</strong> {msg.body}
                </div>
              ))}
            </div>
            <form onSubmit={handleSendMessage} className="mt-4 flex">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="flex-1 border p-2"
              />
              <button type="submit" className="bg-blue-500 text-white px-4 py-2 ml-2">
                Enviar
              </button>
            </form>
            <button onClick={loadMoreMessages} className="mt-4 bg-blue-500 text-white px-4 py-2">
              Cargar más mensajes
            </button>
          </div>
        ) : (
          <p>Selecciona un chat para ver los mensajes</p>
        )}
      </div>
    </div>
  );
}

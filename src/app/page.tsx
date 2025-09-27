"use client";

import React, { useEffect, useState, useRef } from 'react';
import ReminderModal from '../components/ReminderModal';
import io from 'socket.io-client';

export default function Home() {
  const [qr, setQr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const socketRef = useRef<any | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showReminderModalHideRecipients, setShowReminderModalHideRecipients] = useState(false);

  useEffect(() => {
    const socket = io('http://localhost:3001', { transports: ['polling', 'websocket'] });
    socketRef.current = socket;
    socket.on('qr', (url: string) => setQr(url));
    socket.on('ready', () => {
      setReady(true);
      setQr(null);
      socket.emit('get_chats', { page: 1, limit: 50 });
    });
    socket.on('chats', (payload: any) => { setChats(Array.isArray(payload.chats) ? payload.chats : []); });
    socket.on('messages', (payload: any) => { setMessages(Array.isArray(payload.messages) ? payload.messages.slice().reverse() : []); });
    socket.on('new_message', (d: any) => { setMessages(prev => [...prev, d.message]); });
    return () => { try { socket.disconnect(); } catch (e) { /* ignore */ } };
  }, []);

  const handleChatClick = (chat: any) => {
    setSelectedChat(chat);
    setMessages([]);
    socketRef.current?.emit('get_messages', { chatId: chat?.id?._serialized ?? chat?.id, page: 1, limit: 50 });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedChat) return;
    socketRef.current?.emit('send_message', { chatId: selectedChat.id?._serialized ?? selectedChat.id, message: messageInput.trim() });
    setMessageInput('');
  };

  if (qr) return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl mb-4">Escanea el código QR con WhatsApp</h1>
      <img src={qr} alt="QR Code" />
    </div>
  );

  if (!ready) return (
    <div className="flex items-center justify-center min-h-screen">Conectando...</div>
  );

  return (
    <div className="app-root">
      <div className="w-full border-b p-2 flex justify-end">
        <button onClick={() => { setShowReminderModal(true); setShowReminderModalHideRecipients(false); }} className="bg-green-500 text-white px-3 py-1 rounded">Programar (Global)</button>
      </div>

      <div className="flex h-screen">
        <div className="w-1/3 border-r p-4">
          <h2 className="text-xl mb-4">Chats</h2>
          <ul>
            {chats.map((c: any) => (
              <li key={c?.id?._serialized ?? c?.id} className="mb-2 cursor-pointer p-2 hover:bg-gray-200" onClick={() => handleChatClick(c)}>
                {c.name || (c.id && c.id.user)}
              </li>
            ))}
          </ul>
        </div>

        <div className="w-2/3 p-4">
          {selectedChat ? (
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-xl">{selectedChat.name || (selectedChat.id && selectedChat.id.user)}</h2>
                <button title="Programar recordatorio" onClick={() => { setShowReminderModal(true); setShowReminderModalHideRecipients(true); }} className="px-2 py-1 rounded bg-yellow-400 text-black">Recordar</button>
              </div>

              <div ref={messagesContainerRef} className="h-96 overflow-y-auto border p-2 mt-4">
                {messages.map((m: any, idx: number) => (
                  <div key={m.id ?? idx} className="mb-2"><strong>{m.from === 'me' ? 'Yo' : m.from}:</strong> {m.body}</div>
                ))}
              </div>

              <form onSubmit={handleSendMessage} className="mt-4 flex">
                <input value={messageInput} onChange={(e) => setMessageInput(e.target.value)} className="flex-1 border p-2" placeholder="Escribe un mensaje..." />
                <button type="submit" className="bg-blue-500 text-white px-4 py-2 ml-2">Enviar</button>
              </form>

              <ReminderModal
                open={showReminderModal}
                onClose={() => { setShowReminderModal(false); setShowReminderModalHideRecipients(false); }}
                chatId={showReminderModalHideRecipients ? (selectedChat?.id?._serialized ?? selectedChat?.id) : undefined}
                chats={chats}
                hideRecipients={showReminderModalHideRecipients}
              />
            </div>
          ) : (
            <p>Selecciona un chat para ver los mensajes</p>
          )}
        </div>
      </div>
    </div>
  );
}

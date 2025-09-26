'use client';

import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

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
  const socketRefOuter = useRef<any | null>(null);
  const selectedChatRef = useRef<any | null>(null);
  const [syncingChatId, setSyncingChatId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    console.log('Connecting to socket...');
    // prefer polling first then upgrade to websocket; increase timeout to avoid early failures
    const socket = io('http://localhost:3001', { transports: ['polling', 'websocket'], timeout: 20000, reconnectionAttempts: 5 });
    socketRefOuter.current = socket;

    socket.on('connect', () => console.log('Connected to socket'));
    socket.on('disconnect', () => console.log('Disconnected from socket'));
    socket.on('connect_error', (err: any) => {
      console.error('Socket connect_error:', err);
      setSyncError(`Socket connect_error: ${String(err)}`);
    });
    socket.on('connect_timeout', (err: any) => {
      console.error('Socket connect_timeout:', err);
      setSyncError(`Socket connect_timeout: ${String(err)}`);
    });

    socket.on('qr', (qrUrl: string) => {
      console.log('QR received:', qrUrl);
      setQr(qrUrl);
    });

    socket.on('ready', () => {
      console.log('WhatsApp ready');
      setReady(true);
      setQr(null);
      socketRefOuter.current?.emit('get_contacts');
      socketRefOuter.current?.emit('get_chats', { page: chatPage, limit: 10 });
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
      // Attach mediaUrl for messages that have saved mediaFilename in DB
      const msgs = (data.messages || []).map((m: any) => {
        try {
          if (!m.mediaUrl && m.mediaFilename && m.chatId) {
            m.mediaUrl = `http://localhost:3001/media/${encodeURIComponent(m.chatId)}/${encodeURIComponent(m.mediaFilename)}`;
          }
        } catch (e) { /* ignore */ }
        return m;
      });
      setMessages(msgs);
    });

    socket.on('new_message', (data: any) => {
      console.log('New message:', data);
      const incomingChatId = data.chatId;
      const incomingMsg = data.message;

      // helpers to normalize and compare IDs (digits-only)
      const digitsOnly = (s: any) => {
        if (!s && s !== 0) return '';
        try { return String(s).replace(/\D+/g, ''); } catch (e) { return String(s); }
      };
      const compareIds = (a: any, b: any) => {
        if (a === b) return true;
        const da = digitsOnly(a);
        const db = digitsOnly(b);
        if (da && db && da === db) return true;
        return false;
      };

      // Debug: log current chats and selectedChatRef
      console.log('Before chats (ids):', chats.map(c => (c?.id?._serialized ?? c?.id)));
      console.log('incomingChatId:', incomingChatId, 'digits:', digitsOnly(incomingChatId));
      console.log('selectedChatRef.current id:', selectedChatRef.current && (selectedChatRef.current?.id?._serialized ?? selectedChatRef.current?.id));

      // Ensure the chat appears in the list and is moved to the top
      setChats(prev => {
        const idOf = (c: any) => (c?.id?._serialized ?? c?.id);
        const idx = prev.findIndex(c => compareIds(idOf(c), incomingChatId));
        const newChats = [...prev];
        if (idx !== -1) {
          const existing = newChats[idx];
          const updated = { ...existing, timestamp: incomingMsg.timestamp, lastMessage: incomingMsg.body || '' };
          // remove existing and put updated at front
          newChats.splice(idx, 1);
          // increment unread if not currently selected
          if (!(selectedChatRef.current && compareIds((selectedChatRef.current?.id?._serialized ?? selectedChatRef.current?.id), incomingChatId))) {
            updated.unreadCount = (existing.unreadCount || 0) + 1;
          } else {
            updated.unreadCount = 0;
          }
          return [updated, ...newChats];
        } else {
          // chat not present: prepend a minimal chat object
          const isSelected = selectedChatRef.current && compareIds((selectedChatRef.current?.id?._serialized ?? selectedChatRef.current?.id), incomingChatId);
          const newChat = { id: { _serialized: incomingChatId }, name: incomingMsg.from || incomingChatId, timestamp: incomingMsg.timestamp, unreadCount: isSelected ? 0 : 1 };
          return [newChat, ...newChats];
        }
      });

      // If the currently open chat is the one that received the message, append it to messages
      if (selectedChatRef.current && compareIds((selectedChatRef.current?.id?._serialized ?? selectedChatRef.current?.id), incomingChatId)) {
        setMessages(prev => [...prev, incomingMsg]);
        // reset unread for the chat in the list
        setChats(prev => prev.map(c => (compareIds((c?.id?._serialized ?? c?.id), incomingChatId) ? { ...c, unreadCount: 0 } : c)));
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
      socket.off('connect_error');
      socket.off('connect_timeout');
      try { socket.disconnect(); } catch (e) { /* ignore */ }
    };
  }, []);

  // keep a ref in sync with selectedChat so handlers can read latest value
  useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);

  const handleChatClick = async (chat: any) => {
    setSelectedChat(chat);
    selectedChatRef.current = chat;
  // reset unread count for this chat in UI
  const chatId = chat?.id?._serialized ?? chat?.id;
  setChats(prev => prev.map(c => ((c?.id?._serialized ?? c?.id) === chatId) ? { ...c, unreadCount: 0 } : c));
    if (!chatId) {
      socketRefOuter.current?.emit('get_messages', { chatId: chat.id, page: messagePage, limit: 20 });
      return;
    }

    // First, ask the server to sync this chat (authorized request).
    // NOTE: For local/dev you can expose NEXT_PUBLIC_SYNC_API_KEY, but do not do this in production.
    const apiKey = process.env.NEXT_PUBLIC_SYNC_API_KEY || '';
    try {
      setSyncingChatId(chatId);
      setSyncError(null);
      const headers: any = { 'Content-Type': 'application/json' };
      if (apiKey) headers['x-api-key'] = apiKey;
      const resp = await fetch('http://localhost:3001/api/sync-chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ chatId, limit: 200 })
      });
      if (!resp.ok) {
        console.warn('Sync API returned', resp.status);
        const txt = await resp.text().catch(() => null);
        setSyncError(`Sync failed: ${resp.status} ${txt ? '- ' + txt : ''}`);
      } else {
        const json = await resp.json();
        console.log('Sync result', json);
      }
    } catch (err: any) {
      console.warn('Failed to call sync API:', err);
      setSyncError(String(err));
    } finally {
      // Request messages via socket (will return whatever is in the DB)
      socketRefOuter.current?.emit('get_messages', { chatId, page: messagePage, limit: 20 });
      setSyncingChatId(null);
    }
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

    socketRefOuter.current?.emit('send_message', messageData);
    setMessageInput('');
  };

  const loadMoreChats = () => {
    setChatPage(prev => prev + 1);
    socketRefOuter.current?.emit('get_chats', { page: chatPage + 1, limit: 10 });
  };

  const loadMoreMessages = () => {
    setMessagePage(prev => prev + 1);
    socketRefOuter.current?.emit('get_messages', { chatId: selectedChat.id._serialized, page: messagePage + 1, limit: 20 });
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
              key={chat?.id?._serialized ?? chat?.id}
              className="mb-2 cursor-pointer p-2 hover:bg-gray-200 flex justify-between items-center"
              onClick={() => handleChatClick(chat)}
            >
              <span>{chat.name || chat.id.user}</span>
              {chat.unreadCount ? (
                <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">{chat.unreadCount}</span>
              ) : null}
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
            <h2 className="text-xl mb-4">{selectedChat.name || selectedChat.id.user} {syncingChatId === (selectedChat?.id?._serialized ?? selectedChat?.id) ? '(Sincronizando...)' : ''}</h2>
            {syncError ? <p className="text-sm text-red-600">{syncError}</p> : null}
            <div className="h-96 overflow-y-scroll border p-2">
              {messages.map((msg) => (
                <div key={msg.id} className="mb-2">
                  <strong>{msg.from === 'me' ? 'Yo' : msg.from}:</strong>
                  {msg.body ? <span> {msg.body}</span> : null}
                  {msg.hasMedia && msg.mediaUrl ? (
                    msg.mediaMime && msg.mediaMime.startsWith('image/') ? (
                      <div className="mt-2">
                        <img src={msg.mediaUrl} alt={msg.mediaFilename || 'imagen'} className="max-h-64" />
                      </div>
                    ) : msg.mediaMime && msg.mediaMime.startsWith('audio/') ? (
                      <div className="mt-2">
                        <audio controls src={msg.mediaUrl} />
                      </div>
                    ) : msg.mediaMime && msg.mediaMime.startsWith('video/') ? (
                      <div className="mt-2">
                        <video controls src={msg.mediaUrl} className="max-h-96" />
                      </div>
                    ) : (
                      <div className="mt-2">
                        <a href={msg.mediaUrl} target="_blank" rel="noreferrer">Descargar {msg.mediaFilename || 'archivo'}</a>
                      </div>
                    )
                  ) : null}
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

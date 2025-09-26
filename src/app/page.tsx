'use client';

import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

export default function Home() {
  const [qr, setQr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [hasMoreChats, setHasMoreChats] = useState(true);
  const [loadingMoreChats, setLoadingMoreChats] = useState(false);
  const chatsContainerRef = useRef<HTMLDivElement | null>(null);
  const isFetchingChatsRef = useRef(false);
  const chatsSentinelRef = useRef<HTMLLIElement | null>(null);
  const chatsScrollDebounceRef = useRef<number | null>(null);
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatPage, setChatPage] = useState(1);
  const [messagePage, setMessagePage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const socketRefOuter = useRef<any | null>(null);
  const selectedChatRef = useRef<any | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const isFetchingRef = useRef(false);
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
      try {
        console.log('Chats received:', data);
        const page = Number(data.page || 1);
        const limit = Number(data.limit || (data.chats && data.chats.length) || 10);
        const chunk: any[] = Array.isArray(data.chats) ? data.chats : [];
        console.log(`chats handler page=${page} chunk=${chunk.length} limit=${limit}`);

        if (page <= 1) {
          setChats(chunk);
          setHasMoreChats(chunk.length === limit);
          // scroll to top of chats container (keep at top by default)
          setTimeout(() => {
            const el = chatsContainerRef.current;
            if (el) el.scrollTop = 0;
          }, 0);
        } else {
          // append older pages to the end of the list, avoiding duplicates
          setChats(prev => {
            const existingIds = new Set(prev.map((c: any) => (c?.id?._serialized ?? c?.id)));
            const toAppend = chunk.filter(c => !existingIds.has(c?.id?._serialized ?? c?.id));
            return [...prev, ...toAppend];
          });
          setHasMoreChats(chunk.length === limit);
          setLoadingMoreChats(false);
          isFetchingChatsRef.current = false;
        }
      } catch (err) {
        console.warn('Error handling chats event', err);
        setLoadingMoreChats(false);
        isFetchingChatsRef.current = false;
      }
    });

    socket.on('messages', (data: any) => {
      try {
        console.log('Messages received:', data);
        const chunk: any[] = (data.messages || []).map((m: any) => {
          try {
            if (!m.mediaUrl && m.mediaFilename && m.chatId) {
              m.mediaUrl = `http://localhost:3001/media/${encodeURIComponent(m.chatId)}/${encodeURIComponent(m.mediaFilename)}`;
            }
          } catch (e) { /* ignore */ }
          return m;
        });

        const page = Number(data.page || 1);
        const limit = Number(data.limit || (chunk.length || 20));

        // Server returns messages ordered DESC (newest first). For UI we want oldest -> newest.
        const ordered = chunk.slice().reverse();

        if (page <= 1) {
          // initial load / reset: replace and scroll to bottom
          setMessages(ordered);
          setHasMoreMessages(chunk.length === limit);
          // small timeout to allow DOM to render then scroll to bottom
          setTimeout(() => {
            const el = messagesContainerRef.current;
            if (el) el.scrollTop = el.scrollHeight;
          }, 0);
        } else {
          // loading older messages: prepend and preserve scroll position
          setMessages(prev => {
            // avoid duplicate ids
            const existingIds = new Set(prev.map((m: any) => m.id));
            const toPrepend = ordered.filter(m => !existingIds.has(m.id));
            return [...toPrepend, ...prev];
          });
          setHasMoreMessages(chunk.length === limit);
          // adjust scroll after render in next tick
          setTimeout(() => {
            const el = messagesContainerRef.current;
            if (el) {
              // preserve viewport roughly: add the delta height
              el.scrollTop = (el.scrollTop || 0) + (el.scrollHeight - (prevScrollHeightRef.current || 0));
            }
            setLoadingMoreMessages(false);
            isFetchingRef.current = false;
          }, 0);
        }
      } catch (err) {
        console.warn('Error handling messages event', err);
      }
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
    // reset messages pagination/state for the newly selected chat
    setMessages([]);
    setMessagePage(1);
    setHasMoreMessages(true);
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
      socketRefOuter.current?.emit('get_messages', { chatId, page: 1, limit: 20 });
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
    console.log('loadMoreChats called', { isFetching: isFetchingChatsRef.current, hasMoreChats, chatPage });
    if (isFetchingChatsRef.current || !hasMoreChats) {
      console.log('loadMoreChats aborted (fetching or no more)');
      return;
    }
    // Use functional update to avoid stale closure
    setChatPage(prev => {
      const next = prev + 1;
      console.log('loadMoreChats -> requesting page', next);
      isFetchingChatsRef.current = true;
      setLoadingMoreChats(true);
      socketRefOuter.current?.emit('get_chats', { page: next, limit: 10 });
      return next;
    });
  };

  const loadMoreMessages = () => {
    if (!selectedChat || isFetchingRef.current || !hasMoreMessages) return;
    const next = messagePage + 1;
    // mark fetching and record previous scrollHeight to preserve viewport
    isFetchingRef.current = true;
    setLoadingMoreMessages(true);
    prevScrollHeightRef.current = messagesContainerRef.current ? messagesContainerRef.current.scrollHeight : 0;
    setMessagePage(next);
    socketRefOuter.current?.emit('get_messages', { chatId: selectedChat.id._serialized, page: next, limit: 20 });
  };

  // Attach scroll listener to messages container to implement infinite scroll when near top
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      // if user scrolled near top (20% from top) request older messages
      if (el.scrollTop < Math.max(50, el.clientHeight * 0.2)) {
        loadMoreMessages();
      }
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [selectedChat, messagePage, hasMoreMessages]);

  // Attach scroll listener to chats container to implement infinite scroll when near bottom
  useEffect(() => {
    const el = chatsContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      // debounce rapid scroll events
      if (chatsScrollDebounceRef.current) window.clearTimeout(chatsScrollDebounceRef.current);
      chatsScrollDebounceRef.current = window.setTimeout(() => {
        // if user scrolled near bottom (80% from top) request next page of chats
        const nearBottom = (el.scrollTop + el.clientHeight) >= (el.scrollHeight - Math.max(50, el.clientHeight * 0.2));
        // only attempt if we have more
        if (nearBottom && hasMoreChats) {
          console.log('chats container near bottom -> requesting next page', { chatPage, hasMoreChats });
          loadMoreChats();
        }
      }, 150);
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [chatPage, hasMoreChats]);

  // IntersectionObserver sentinel to load more chats when sentinel enters view
  useEffect(() => {
    const sentinel = chatsSentinelRef.current;
    if (!sentinel) return;
    const rootEl = chatsContainerRef.current || null;
    const obs = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && hasMoreChats) {
          console.log('chats sentinel intersecting -> loadMoreChats', { chatsCount: chats.length });
          loadMoreChats();
        }
      }
    }, { root: rootEl, rootMargin: '100px', threshold: 0.1 });
    obs.observe(sentinel);
    return () => { obs.disconnect(); };
  }, [hasMoreChats, chats.length]);

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
        <div ref={chatsContainerRef} className="max-h-[70vh] overflow-y-auto">
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
            {/* sentinel como último elemento de la lista para que esté en el flujo del <ul> */}
            <li ref={chatsSentinelRef} aria-hidden className="w-full h-6" />
          </ul>
          {loadingMoreChats ? (
            <div className="text-center text-sm text-gray-500 mt-2">Cargando más chats...</div>
          ) : null}
        </div>
      </div>
      <div className="w-2/3 p-4">
        {selectedChat ? (
          <div>
            <h2 className="text-xl mb-4">{selectedChat.name || selectedChat.id.user} {syncingChatId === (selectedChat?.id?._serialized ?? selectedChat?.id) ? '(Sincronizando...)' : ''}</h2>
            {syncError ? <p className="text-sm text-red-600">{syncError}</p> : null}
            <div ref={messagesContainerRef} className="h-96 overflow-y-scroll border p-2">
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
              {loadingMoreMessages ? (
                <div className="text-center text-sm text-gray-500 mt-2">Cargando mensajes anteriores...</div>
              ) : null}
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
            {/* botón eliminado: ahora la carga es por scroll infinito */}
          </div>
        ) : (
          <p>Selecciona un chat para ver los mensajes</p>
        )}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from "react";
import io, { Socket } from "socket.io-client";
import { Chat, Contact, Message } from "../types";

export const useWhatsAppSocket = () => {
  const [qr, setQr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMoreChats, setHasMoreChats] = useState(true);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMoreChats, setLoadingMoreChats] = useState(false);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chatPage, setChatPage] = useState(1);
  const [messagePage, setMessagePage] = useState(1);
  const [syncingChatId, setSyncingChatId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const selectedChatRef = useRef<Chat | null>(null);
  const isFetchingChatsRef = useRef(false);
  const isFetchingMessagesRef = useRef(false);

  const loadContacts = useCallback(() => {
    socketRef.current?.emit("get_contacts");
  }, []);

  const loadChats = useCallback((page = 1, limit = 10) => {
    socketRef.current?.emit("get_chats", { page, limit });
  }, []);

  // Sincronizar selectedChatRef con selectedChat
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    const socket = io("http://localhost:3001");
    socketRef.current = socket;

    socket.on("qr", (qrData: string | null) => {
      console.log("Received qr event:", qrData);
      setQr(qrData);
    });
    socket.on("ready", () => {
      console.log("Received ready event");
      setReady(true);
    });
    socket.on("contacts", setContacts);

    socket.on("chats", (data: any) => {
      const page = Number(data.page || 1);
      const chunk: Chat[] = Array.isArray(data.chats) ? data.chats : [];

      if (page <= 1) {
        // Filtrar duplicados por id._serialized
        const uniqueChunk = chunk.filter((chat, index, self) =>
          index === self.findIndex(c => c.id?._serialized === chat.id?._serialized)
        );
        setChats(uniqueChunk);
      } else {
        setChats((prev) => {
          const combined = [...prev, ...chunk];
          // Filtrar duplicados
          const uniqueCombined = combined.filter((chat, index, self) =>
            index === self.findIndex(c => c.id?._serialized === chat.id?._serialized)
          );
          return uniqueCombined;
        });
      }
      setHasMoreChats(chunk.length === 10);
      setLoadingMoreChats(false);
      isFetchingChatsRef.current = false;
    });

    socket.on("messages", (data: any) => {
      const page = Number(data.page || 1);
      const chunk: Message[] = (data.messages || []).map((m: any) => ({
        ...m,
        mediaUrl:
          m.mediaFilename && m.chatId
            ? `http://localhost:3001/media/${encodeURIComponent(
                m.chatId
              )}/${encodeURIComponent(m.mediaFilename)}`
            : m.mediaUrl,
      }));

      const ordered = chunk.slice().reverse();

      if (page <= 1) {
        setMessages(ordered);
      } else {
        setMessages((prev) => [...ordered, ...prev]);
      }
      setHasMoreMessages(chunk.length === 20);
      setLoadingMoreMessages(false);
      isFetchingMessagesRef.current = false;
    });

    socket.on("new_message", (data: any) => {
      const { chatId: incomingChatId, message: incomingMsg } = data;

      // Actualizar lista de chats
      setChats((prev) => {
        const updated = prev.map((chat) => {
          const chatId = chat?.id?._serialized ?? chat?.id;
          if (chatId === incomingChatId) {
            const isSelected =
              selectedChatRef.current?.id?._serialized === incomingChatId;
            return {
              ...chat,
              timestamp: incomingMsg.timestamp,
              lastMessage: incomingMsg.body || "",
              unreadCount: isSelected ? 0 : (chat.unreadCount || 0) + 1,
            };
          }
          return chat;
        });
        return updated;
      });

      // Si el chat está seleccionado, agregar el mensaje
      if (selectedChatRef.current?.id?._serialized === incomingChatId) {
        setMessages((prev) => [...prev, incomingMsg]);
      }
    });

    socket.on("connect_error", (err: any) => {
      setSyncError(`Error de conexión: ${String(err)}`);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleChatClick = async (chat: Chat) => {
    setSelectedChat(chat);
    setMessages([]);
    setMessagePage(1);
    setHasMoreMessages(true);

    const chatId = chat?.id?._serialized ?? chat?.id;

    // Resetear contador de no leídos
    setChats((prev) =>
      prev.map((c) =>
        (c?.id?._serialized ?? c?.id) === chatId ? { ...c, unreadCount: 0 } : c
      )
    );

    if (!chatId) return;

    // Marcar mensajes como leídos después de un breve delay
    setTimeout(() => {
      markMessagesAsRead(chatId);
    }, 1000);

    // Sincronizar el chat
    try {
      setSyncingChatId(chatId);
      setSyncError(null);

      const resp = await fetch("http://localhost:3001/api/sync-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, limit: 200 }),
      });

      if (!resp.ok) {
        setSyncError(`Error de sincronización: ${resp.status}`);
      }
    } catch (err: any) {
      setSyncError(`Error de sincronización: ${err.message}`);
    } finally {
      socketRef.current?.emit("get_messages", { chatId, page: 1, limit: 20 });
      setSyncingChatId(null);
    }
  };

  const handleSendMessage = (message: string) => {
    if (!selectedChat || !message.trim()) return;

    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      body: message.trim(),
      from: "me",
      timestamp: Math.floor(Date.now() / 1000),
      type: "chat",
      fromMe: true,
    };

    setMessages((prev) => [...prev, tempMessage]);

    socketRef.current?.emit("send_message", {
      chatId: selectedChat.id._serialized,
      message: message.trim(),
    });
  };

  const loadMoreChats = () => {
    if (isFetchingChatsRef.current || !hasMoreChats) {
      return;
    }

    isFetchingChatsRef.current = true;
    setLoadingMoreChats(true);
    setChatPage((prev) => {
      const next = prev + 1;
      socketRef.current?.emit("get_chats", { page: next, limit: 10 });
      return next;
    });
  };

  const loadMoreMessages = () => {
    if (!selectedChat || isFetchingMessagesRef.current || !hasMoreMessages)
      return;

    isFetchingMessagesRef.current = true;
    setLoadingMoreMessages(true);
    setMessagePage((prev) => {
      const next = prev + 1;
      socketRef.current?.emit("get_messages", {
        chatId: selectedChat.id._serialized,
        page: next,
        limit: 20,
      });
      return next;
    });
  };

  // Marcar mensajes como leídos
  const markMessagesAsRead = (chatId: string) => {
    socketRef.current?.emit("mark_as_read", { chatId });

    // Actualizar el estado local inmediatamente
    // Solo marcar como leídos los mensajes del chat actual que no son míos
    setMessages((prev) =>
      prev.map((msg) => {
        // Solo actualizar si no es mi mensaje y pertenece al chat actual
        if (!msg.fromMe && msg.from) {
          // Comparar si el mensaje pertenece al chat actual
          const belongsToChat = msg.from.includes("@")
            ? msg.from === chatId || msg.from.includes(chatId.split("@")[0])
            : msg.from === chatId;

          if (belongsToChat) {
            return { ...msg, isRead: true };
          }
        }
        return msg;
      })
    );

    // Actualizar el conteo de no leídos en el chat
    setChats((prev) =>
      prev.map((chat) =>
        chat.id._serialized === chatId ? { ...chat, unreadCount: 0 } : chat
      )
    );
  };

  return {
    socket: socketRef.current,
    qr,
    ready,
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
    chatPage,
    messagePage,
    setSelectedChat,
    handleChatClick,
    handleSendMessage,
    loadMoreChats,
    loadMoreMessages,
    markMessagesAsRead,
    loadContacts,
    loadChats,
  };
}

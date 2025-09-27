export interface Contact {
  id: string;
  name?: string;
  number: string;
  avatar?: string;
}

export interface Chat {
  id: {
    _serialized: string;
    user?: string;
  };
  name?: string;
  timestamp?: number;
  lastMessage?: string;
  unreadCount?: number;
  avatar?: string;
}

export interface Message {
  id: string;
  body?: string;
  from: string;
  timestamp: number;
  type: string;
  fromMe: boolean;
  hasMedia?: boolean;
  mediaUrl?: string;
  mediaFilename?: string;
  mediaMime?: string;
}

export interface SocketEvents {
  qr: (qrUrl: string) => void;
  ready: () => void;
  contacts: (contacts: Contact[]) => void;
  chats: (data: { chats: Chat[]; page: number; limit: number }) => void;
  messages: (data: { messages: Message[]; page: number; limit: number }) => void;
  new_message: (data: { chatId: string; message: Message }) => void;
  connect_error: (error: any) => void;
  connect_timeout: (error: any) => void;
}
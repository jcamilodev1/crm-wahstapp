import React from 'react';

interface ChatReadStatusProps {
  unreadCount?: number;
  isActive?: boolean;
}

export const ChatReadStatus: React.FC<ChatReadStatusProps> = ({
  unreadCount = 0,
  isActive = false
}) => {
  if (unreadCount === 0) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span className="text-xs text-green-600 font-medium">Todo leído</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <div className="relative">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
        <div className="w-2 h-2 bg-red-500 rounded-full absolute top-0 animate-ping"></div>
      </div>
      <span className="text-xs text-red-600 font-bold">
        {unreadCount} sin leer
      </span>
    </div>
  );
};
import React from 'react';

interface MessageStatusProps {
  ack?: number;
  fromMe: boolean;
  className?: string;
}

export const MessageStatus: React.FC<MessageStatusProps> = ({
  ack,
  fromMe,
  className = ''
}) => {
  // Solo mostrar estado para mensajes enviados por mí
  if (!fromMe || ack === undefined) {
    return null;
  }

  const getStatusIcon = () => {
    switch (ack) {
      case 0: // Pendiente
        return (
          <svg className={`w-4 h-4 text-gray-400 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
            <circle cx="12" cy="12" r="10" strokeDasharray="5,5" />
          </svg>
        );
      case 1: // Enviado
        return (
          <svg className={`w-4 h-4 text-gray-400 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 2: // Entregado
        return (
          <div className="flex">
            <svg className={`w-4 h-4 text-gray-400 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <svg className={`w-4 h-4 text-gray-400 -ml-2 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 3: // Leído
        return (
          <div className="flex">
            <svg className={`w-4 h-4 text-blue-500 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <svg className={`w-4 h-4 text-blue-500 -ml-2 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (ack) {
      case 0:
        return 'Pendiente';
      case 1:
        return 'Enviado';
      case 2:
        return 'Entregado';
      case 3:
        return 'Leído';
      default:
        return '';
    }
  };

  return (
    <div className="flex items-center space-x-1" title={getStatusText()}>
      {getStatusIcon()}
    </div>
  );
};
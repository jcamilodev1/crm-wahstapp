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
          <div className="flex items-center space-x-1">
            <svg className={`w-4 h-4 text-gray-400 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeDasharray="3,3" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
            </svg>
          </div>
        );
      case 1: // Enviado
        return (
          <div className="flex items-center space-x-1">
            <svg className={`w-4 h-4 text-gray-500 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs text-gray-500 font-medium">Enviado</span>
          </div>
        );
      case 2: // Entregado
        return (
          <div className="flex items-center space-x-1">
            <div className="flex -space-x-1">
              <svg className={`w-4 h-4 text-gray-600 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <svg className={`w-4 h-4 text-gray-600 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-xs text-gray-600 font-medium">Entregado</span>
          </div>
        );
      case 3: // Leído
        return (
          <div className="flex items-center space-x-1">
            <div className="flex -space-x-1">
              <svg className={`w-4 h-4 text-blue-600 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <svg className={`w-4 h-4 text-blue-600 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-xs text-blue-600 font-bold">Leído</span>
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
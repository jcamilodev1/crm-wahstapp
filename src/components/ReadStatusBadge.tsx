import React from 'react';

interface ReadStatusBadgeProps {
  ack?: number;
  fromMe: boolean;
  isRead?: boolean;
}

export const ReadStatusBadge: React.FC<ReadStatusBadgeProps> = ({
  ack,
  fromMe,
  isRead
}) => {
  // Para mensajes enviados por mí, mostrar estado basado en ack
  if (fromMe && ack !== undefined) {
    switch (ack) {
      case 0:
        return (
          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 border border-yellow-200">
            <div className="w-2 h-2 bg-yellow-400 rounded-full mr-1 animate-pulse"></div>
            Enviando...
          </div>
        );
      case 1:
        return (
          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700 border border-gray-200">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Enviado
          </div>
        );
      case 2:
        return (
          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 border border-green-200">
            <div className="flex -space-x-0.5 mr-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            Entregado
          </div>
        );
      case 3:
        return (
          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 border border-blue-200">
            <div className="flex -space-x-0.5 mr-1">
              <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            ✨ Leído
          </div>
        );
      default:
        return null;
    }
  }

  // Para mensajes recibidos, mostrar si está leído o no
  if (!fromMe) {
    if (isRead === false) {
      return (
        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 border border-red-200">
          <div className="w-2 h-2 bg-red-500 rounded-full mr-1 animate-pulse"></div>
          Sin leer
        </div>
      );
    } else if (isRead === true) {
      return (
        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 border border-green-200">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
          </svg>
          Leído
        </div>
      );
    }
  }

  return null;
};
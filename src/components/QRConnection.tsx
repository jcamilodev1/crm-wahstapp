import React from 'react';
import Image from 'next/image';
import { Spinner } from './ui';

interface QRConnectionProps {
  qr: string | null;
  isConnecting?: boolean;
}

export const QRConnection: React.FC<QRConnectionProps> = ({ 
  qr, 
  isConnecting = false 
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-8">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Conectar WhatsApp
          </h1>
          <p className="text-gray-600">
            Escanea el código QR con WhatsApp para conectar tu cuenta
          </p>
        </div>

        {(() => {
          if (qr) {
            return (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl border-2 border-gray-100">
                  <Image
                    src={qr}
                    alt="Código QR de WhatsApp"
                    width={250}
                    height={250}
                    className="mx-auto"
                  />
                </div>
                <div className="text-sm text-gray-500 space-y-2">
                  <p>1. Abre WhatsApp en tu teléfono</p>
                  <p>2. Ve a Configuración → Dispositivos vinculados</p>
                  <p>3. Toca &ldquo;Vincular un dispositivo&rdquo;</p>
                  <p>4. Escanea este código QR</p>
                </div>
              </div>
            );
          }
          
          if (isConnecting) {
            return (
              <div className="space-y-4">
                <Spinner size="lg" className="mx-auto" />
                <p className="text-gray-600">Conectando...</p>
              </div>
            );
          }
          
          return (
            <div className="space-y-4">
              <div className="w-64 h-64 bg-gray-100 rounded-xl flex items-center justify-center mx-auto">
                <Spinner size="lg" />
              </div>
              <p className="text-gray-600">Generando código QR...</p>
            </div>
          );
        })()}

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Nota:</strong> Mantén esta ventana abierta hasta que se complete la conexión.
          </p>
        </div>
      </div>
    </div>
  );
};
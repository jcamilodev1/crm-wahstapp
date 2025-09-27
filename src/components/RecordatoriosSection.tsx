import React, { useState } from 'react';
import ReminderModal from './ReminderModal';
import { useWhatsAppSocket } from '../hooks/useWhatsAppSocket';

export const RecordatoriosSection: React.FC = () => {
  const [showReminderModal, setShowReminderModal] = useState(false);
  const { chats } = useWhatsAppSocket();
  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Header de la sección */}
      <div className="p-6 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Recordatorios</h2>
              <p className="text-sm text-gray-600">Gestiona tus recordatorios y tareas</p>
            </div>
          </div>
          <button
            onClick={() => setShowReminderModal(true)}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Programar Recordatorio</span>
          </button>
        </div>
      </div>

      {/* Contenido de la sección */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="mx-auto w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No hay recordatorios programados
          </h3>
          <p className="text-gray-600 mb-6">
            Comienza programando tu primer recordatorio usando el botón de arriba.
          </p>
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h4 className="text-md font-medium text-gray-900 mb-4">Próximamente:</h4>
            <ul className="text-left space-y-2 text-gray-600 text-sm">
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Lista de recordatorios programados
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Notificaciones automáticas
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Calendario integrado
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal de recordatorio */}
      <ReminderModal
        open={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        chats={chats || []}
        hideRecipients={false}
      />
    </div>
  );
};
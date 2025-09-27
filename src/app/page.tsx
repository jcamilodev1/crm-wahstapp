'use client';

import { useState } from 'react';
import { QRConnection, MainSidebar, ChatsSection, RecordatoriosSection } from '../components';
import ReminderModal from '../components/ReminderModal';
import { useWhatsAppSocket } from '../hooks/useWhatsAppSocket';

export default function Home() {
  const [activeSection, setActiveSection] = useState('chats');
  const [showGlobalReminderModal, setShowGlobalReminderModal] = useState(false);
  const { qr, ready, chats } = useWhatsAppSocket();

  if (qr) {
    return <QRConnection qr={qr} />;
  }

  if (!ready) {
    return <QRConnection qr={null} isConnecting />;
  }

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'chats':
        return <ChatsSection />;
      case 'recordatorios':
        return <RecordatoriosSection />;
      default:
        return <ChatsSection />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Barra superior con botón de recordatorio global */}
      <div className="w-full border-b border-gray-200 bg-white p-2 flex justify-end">
        <button 
          onClick={() => setShowGlobalReminderModal(true)}
          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm font-medium"
        >
          Programar (Global)
        </button>
      </div>
      
      <div className="flex flex-1">
        <MainSidebar 
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        {renderActiveSection()}
      </div>

      <ReminderModal
        open={showGlobalReminderModal}
        onClose={() => setShowGlobalReminderModal(false)}
        chats={chats || []}
        hideRecipients={false}
      />
    </div>
  );
}

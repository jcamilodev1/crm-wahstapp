'use client';

import { useState } from 'react';
import { QRConnection, MainSidebar, ChatsSection, RecordatoriosSection } from '../components';
import { useWhatsAppSocket } from '../hooks/useWhatsAppSocket';

export default function Home() {
  const [activeSection, setActiveSection] = useState('chats');
  const { qr, ready } = useWhatsAppSocket();

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
    <div className="flex h-screen bg-gray-50">
      <MainSidebar 
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      {renderActiveSection()}
    </div>
  );
}

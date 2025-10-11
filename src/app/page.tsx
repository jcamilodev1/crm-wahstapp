"use client";

import { useState, useEffect } from "react";
import {
  QRConnection,
  MainSidebar,
  ChatsSection,
  RecordatoriosSection,
  QuickRepliesSection,
} from "../components";
import { useWhatsAppSocket } from "../hooks/useWhatsAppSocket";

export default function Home() {
  const [activeSection, setActiveSection] = useState("chats");
  const { qr, ready, contacts, chats, loadContacts, loadChats } = useWhatsAppSocket();

  useEffect(() => {
    if (ready && activeSection === "chats" && chats.length === 0) {
      loadChats();
    }
    // Si hay sección de contacts, agregar aquí
  }, [ready, activeSection, chats.length, loadChats]);

  if (qr) {
    return <QRConnection qr={qr} />;
  }

  if (!ready) {
    return <QRConnection qr={null} isConnecting />;
  }

  const renderActiveSection = () => {
    switch (activeSection) {
      case "chats":
        return <ChatsSection />;
      case "recordatorios":
        return <RecordatoriosSection />;
      case "respuestas-rapidas":
        return <QuickRepliesSection />;
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

import React, { useState } from "react";

interface QuickReply {
  id: string;
  title: string;
  content: string;
  category: string;
  emoji: string;
}

interface QuickRepliesFooterProps {
  onSendMessage: (message: string) => void;
}

export const QuickRepliesFooter: React.FC<QuickRepliesFooterProps> = ({
  onSendMessage,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("populares");

  // Respuestas rápidas más usadas para el footer
  const quickReplies = {
    populares: [
      {
        id: "1",
        title: "Hola",
        content: "¡Hola! ¿En qué puedo ayudarte?",
        category: "populares",
        emoji: "👋",
      },
      {
        id: "2",
        title: "Gracias",
        content: "¡Gracias por contactarnos!",
        category: "populares",
        emoji: "😊",
      },
      {
        id: "3",
        title: "Perfecto",
        content: "¡Perfecto! Cualquier cosa me escribes.",
        category: "populares",
        emoji: "✅",
      },
      {
        id: "4",
        title: "Información",
        content: "Te envío la información que necesitas.",
        category: "populares",
        emoji: "ℹ️",
      },
    ],
    ventas: [
      {
        id: "5",
        title: "Propuesta",
        content: "Te envío una propuesta personalizada.",
        category: "ventas",
        emoji: "📋",
      },
      {
        id: "6",
        title: "Oferta",
        content: "Tenemos una oferta especial para ti.",
        category: "ventas",
        emoji: "🎯",
      },
      {
        id: "7",
        title: "Cotización",
        content: "Te preparo la cotización que solicitas.",
        category: "ventas",
        emoji: "💰",
      },
    ],
    soporte: [
      {
        id: "8",
        title: "Revisar",
        content: "Voy a revisar tu caso inmediatamente.",
        category: "soporte",
        emoji: "🔍",
      },
      {
        id: "9",
        title: "Solucionar",
        content: "Te ayudo a solucionar este problema.",
        category: "soporte",
        emoji: "🔧",
      },
      {
        id: "10",
        title: "Contacto",
        content: "Te contacto en los próximos minutos.",
        category: "soporte",
        emoji: "📞",
      },
    ],
  };

  const allReplies = Object.values(quickReplies).flat();
  const currentReplies =
    quickReplies[selectedCategory as keyof typeof quickReplies] || [];

  const handleQuickReply = (content: string) => {
    onSendMessage(content);
    setIsExpanded(false);
  };

  const categories = [
    {
      value: "populares",
      label: "Populares",
      count: quickReplies.populares.length,
    },
    { value: "ventas", label: "Ventas", count: quickReplies.ventas.length },
    { value: "soporte", label: "Soporte", count: quickReplies.soporte.length },
  ];

  return (
    <div className="bg-white border-t border-gray-200">
      {/* Barra compacta con todo en una línea */}
      <div className="p-2">
        <div className="flex items-center space-x-3">
          {/* Icono y etiqueta */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <svg
              className="w-4 h-4 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
              Respuestas:
            </span>
          </div>

          {/* Selector de categorías compacto */}
          <div className="flex space-x-1 flex-shrink-0">
            {categories.map((category) => (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={`px-2 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
                  selectedCategory === category.value
                    ? "bg-purple-100 text-purple-800"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>

          {/* Badges de respuestas rápidas con scroll horizontal */}
          <div className="flex-1 overflow-x-auto">
            <div className="flex space-x-2 pb-1">
              {currentReplies.map((reply) => (
                <button
                  key={reply.id}
                  onClick={() => handleQuickReply(reply.content)}
                  className="group flex items-center space-x-1 px-2 py-1 bg-gray-100 hover:bg-purple-100 border border-gray-200 hover:border-purple-200 rounded-md transition-all duration-200 hover:shadow-sm flex-shrink-0"
                  title={reply.content}
                >
                  <span className="text-xs">{reply.emoji}</span>
                  <span className="text-xs font-medium text-gray-700 group-hover:text-purple-700 whitespace-nowrap">
                    {reply.title}
                  </span>
                  <svg
                    className="w-2 h-2 text-gray-400 group-hover:text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          {/* Botón para ver todas */}
          <button className="flex items-center space-x-1 px-2 py-1 bg-purple-100 hover:bg-purple-200 border border-purple-200 rounded-md transition-colors flex-shrink-0">
            <span className="text-xs">⚡</span>
            <span className="text-xs font-medium text-purple-700 whitespace-nowrap">
              Ver todas
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

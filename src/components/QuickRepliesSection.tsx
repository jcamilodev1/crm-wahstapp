import React, { useState } from "react";

export const QuickRepliesSection: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todas");
  const [activeTab, setActiveTab] = useState("todas");

  // Respuestas rápidas organizadas por categorías
  const quickReplies = {
    saludos: [
      {
        id: "1",
        title: "Saludo formal",
        content:
          "Buenos días, espero que se encuentre muy bien. ¿En qué puedo ayudarle hoy?",
        category: "saludos",
        emoji: "👋",
      },
      {
        id: "2",
        title: "Saludo casual",
        content: "¡Hola! ¿Cómo estás? ¿En qué te puedo ayudar?",
        category: "saludos",
        emoji: "😊",
      },
      {
        id: "3",
        title: "Saludo profesional",
        content:
          "Buenos días, gracias por contactarnos. ¿Cómo puedo asistirle?",
        category: "saludos",
        emoji: "🤝",
      },
    ],
    despedidas: [
      {
        id: "4",
        title: "Despedida formal",
        content: "Gracias por contactarnos. Que tenga un excelente día.",
        category: "despedidas",
        emoji: "👋",
      },
      {
        id: "5",
        title: "Despedida casual",
        content: "¡Perfecto! Cualquier cosa me escribes. ¡Que estés bien!",
        category: "despedidas",
        emoji: "😊",
      },
      {
        id: "6",
        title: "Despedida profesional",
        content:
          "Ha sido un placer atenderle. Estamos a su disposición cuando lo necesite.",
        category: "despedidas",
        emoji: "🤝",
      },
    ],
    informacion: [
      {
        id: "7",
        title: "Solicitar información",
        content:
          "Me gustaría recibir más información sobre [PRODUCTO/SERVICIO]. ¿Podrían enviarme los detalles?",
        category: "informacion",
        emoji: "ℹ️",
      },
      {
        id: "8",
        title: "Horarios de atención",
        content:
          "Nuestros horarios de atención son de lunes a viernes de 8:00 AM a 6:00 PM y sábados de 9:00 AM a 2:00 PM.",
        category: "informacion",
        emoji: "🕐",
      },
      {
        id: "9",
        title: "Ubicación",
        content:
          "Nos encontramos en [DIRECCIÓN]. ¿Te gustaría que te envíe la ubicación exacta?",
        category: "informacion",
        emoji: "📍",
      },
    ],
    ventas: [
      {
        id: "10",
        title: "Seguimiento de venta",
        content:
          "Hola! 👋\n\nEspero que estés muy bien. Quería hacerte seguimiento a la propuesta que te envié.\n\n¿Te gustaría agendar una llamada para revisar los detalles?\n\nSaludos!",
        category: "ventas",
        emoji: "💼",
      },
      {
        id: "11",
        title: "Oferta especial",
        content:
          "¡Tenemos una oferta especial para ti! 🔥\n\n[DESCRIPCIÓN DE LA OFERTA]\n💰 Descuento: [PORCENTAJE]\n⏰ Válido hasta: [FECHA]\n\n¿Te interesa? ¡Responde y te doy más detalles!",
        category: "ventas",
        emoji: "🎯",
      },
      {
        id: "12",
        title: "Confirmación de pedido",
        content:
          "¡Perfecto! Tu pedido ha sido confirmado. 📦\n\n📅 Fecha estimada de entrega: [FECHA]\n🚚 Número de seguimiento: [TRACKING]\n\n¿Te gustaría agendar una hora específica de entrega?",
        category: "ventas",
        emoji: "✅",
      },
    ],
    soporte: [
      {
        id: "13",
        title: "Problema técnico",
        content:
          "Entiendo que tienes un problema técnico. Para poder ayudarte mejor, ¿podrías describir exactamente qué está pasando?",
        category: "soporte",
        emoji: "🔧",
      },
      {
        id: "14",
        title: "Reembolso",
        content:
          "Lamento las molestias. Para procesar tu reembolso, necesito algunos datos:\n\n📧 Email de la compra\n📅 Fecha de la compra\n💳 Método de pago\n\n¿Podrías proporcionarme esta información?",
        category: "soporte",
        emoji: "💰",
      },
      {
        id: "15",
        title: "Garantía",
        content:
          "Para hacer válida la garantía, necesito:\n\n📄 Número de factura\n📅 Fecha de compra\n🔍 Descripción del problema\n\n¿Tienes esta información a mano?",
        category: "soporte",
        emoji: "🛡️",
      },
    ],
  };

  // Obtener todas las respuestas
  const allReplies = Object.values(quickReplies).flat();

  // Filtrar respuestas según búsqueda y tab activo
  const filteredReplies = allReplies.filter((reply) => {
    const matchesSearch =
      reply.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reply.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === "todas" || reply.category === activeTab;
    return matchesSearch && matchesTab;
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Aquí podrías agregar una notificación de éxito
      console.log("Texto copiado al portapapeles");
    } catch (err) {
      console.error("Error al copiar: ", err);
    }
  };

  const tabs = [
    { value: "todas", label: "Todas", count: allReplies.length, emoji: "📋" },
    {
      value: "saludos",
      label: "Saludos",
      count: quickReplies.saludos.length,
      emoji: "👋",
    },
    {
      value: "despedidas",
      label: "Despedidas",
      count: quickReplies.despedidas.length,
      emoji: "👋",
    },
    {
      value: "informacion",
      label: "Información",
      count: quickReplies.informacion.length,
      emoji: "ℹ️",
    },
    {
      value: "ventas",
      label: "Ventas",
      count: quickReplies.ventas.length,
      emoji: "💼",
    },
    {
      value: "soporte",
      label: "Soporte",
      count: quickReplies.soporte.length,
      emoji: "🔧",
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-h-0">
      {/* Header de la sección */}
      <div className="p-6 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Respuestas Rápidas
              </h2>
              <p className="text-sm text-gray-600">
                Mensajes predefinidos para comunicación eficiente
              </p>
            </div>
          </div>
          <button className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>Nueva Respuesta</span>
          </button>
        </div>
      </div>

      {/* Tabs de navegación */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.value
                  ? "border-purple-500 text-purple-600 bg-purple-50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="text-base">{tab.emoji}</span>
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.5 text-xs rounded-full ${
                  activeTab === tab.value
                    ? "bg-purple-200 text-purple-800"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Búsqueda */}
      <div className="p-6 bg-white border-b border-gray-200">
        <div className="relative max-w-md">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Buscar en respuestas rápidas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Contenido con scroll */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-6">
          {filteredReplies.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No se encontraron respuestas
              </h3>
              <p className="text-gray-600">
                Intenta con otros términos de búsqueda o cambia la categoría
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredReplies.map((reply) => (
                <div
                  key={reply.id}
                  className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg">{reply.emoji}</span>
                        <h4 className="font-medium text-gray-900">
                          {reply.title}
                        </h4>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                          {reply.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 whitespace-pre-line">
                        {reply.content}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => copyToClipboard(reply.content)}
                        className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Copiar al portapapeles"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                      <button
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

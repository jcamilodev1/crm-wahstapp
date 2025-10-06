import React, { useState } from "react";
import ReminderModal from "./ReminderModal";
import { useWhatsAppSocket } from "../hooks/useWhatsAppSocket";

type InternalSection = "programados" | "plantillas";

export const RecordatoriosSection: React.FC = () => {
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [activeSection, setActiveSection] =
    useState<InternalSection>("programados");
  const { chats } = useWhatsAppSocket();

  // Datos mock para recordatorios programados
  const scheduledReminders = [
    {
      id: "1",
      message: "Seguimiento de venta - Juan Pérez",
      recipient: "Juan Pérez",
      scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 horas
      status: "pending",
    },
    {
      id: "2",
      message: "Recordatorio de pago - María García",
      recipient: "María García",
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 día
      status: "pending",
    },
    {
      id: "3",
      message: "Cita confirmada - Carlos López",
      recipient: "Carlos López",
      scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 días
      status: "pending",
    },
  ];

  // Plantillas de mensajes (las mismas del modal) - Aumentadas para forzar scroll
  const messageTemplates = [
    {
      id: "1",
      name: "Seguimiento de venta",
      content:
        "Hola! 👋\n\nEspero que estés muy bien. Quería hacerte seguimiento a la propuesta que te envié la semana pasada.\n\n¿Te gustaría agendar una llamada para revisar los detalles?\n\nSaludos!",
    },
    {
      id: "2",
      name: "Recordatorio de pago",
      content:
        "Hola! 😊\n\nTe escribo para recordarte sobre el pago pendiente del servicio contratado.\n\nFecha de vencimiento: [FECHA]\nMonto: [MONTO]\n\nPor favor confirma el pago para continuar con el servicio.\n\n¡Gracias!",
    },
    {
      id: "3",
      name: "Cita confirmada",
      content:
        "¡Hola! 🎉\n\nTe confirmo tu cita:\n📅 Fecha: [FECHA]\n🕐 Hora: [HORA]\n📍 Lugar: [DIRECCIÓN]\n\nPor favor confirma tu asistencia respondiendo este mensaje.\n\n¡Nos vemos pronto!",
    },
    {
      id: "4",
      name: "Seguimiento post-venta",
      content:
        "Hola! 😊\n\nEspero que estés disfrutando de tu compra. Quería saber cómo te está funcionando todo.\n\n¿Hay algo en lo que pueda ayudarte?\n\n¡Estoy aquí para cualquier consulta!",
    },
    {
      id: "5",
      name: "Promoción especial",
      content:
        "¡Hola! 🎯\n\nTenemos una oferta especial solo para ti:\n\n🔥 [DESCRIPCIÓN DE LA OFERTA]\n💰 Descuento: [PORCENTAJE]\n⏰ Válido hasta: [FECHA]\n\n¿Te interesa? ¡Responde y te doy más detalles!",
    },
    {
      id: "6",
      name: "Bienvenida nueva",
      content:
        "¡Bienvenido/a! 🎊\n\nEs un placer tenerte como nuevo cliente. Estamos aquí para brindarte el mejor servicio.\n\n¿Hay algo específico en lo que podamos ayudarte hoy?\n\n¡Gracias por confiar en nosotros!",
    },
    {
      id: "7",
      name: "Recordatorio de entrega",
      content:
        "Hola! 📦\n\nTe informamos que tu pedido está listo para entrega.\n\n📅 Fecha estimada: [FECHA]\n🚚 Número de seguimiento: [TRACKING]\n\n¿Te gustaría agendar una hora específica?\n\n¡Gracias!",
    },
    {
      id: "8",
      name: "Seguimiento de servicio",
      content:
        "Hola! 🔧\n\nEspero que el servicio que recibiste haya sido de tu agrado.\n\n¿Hay algo más en lo que podamos ayudarte?\n\n¡Tu satisfacción es nuestra prioridad!",
    },
    {
      id: "9",
      name: "Recordatorio de cita médica",
      content:
        "Hola! 🏥\n\nTe recordamos tu cita médica programada:\n\n📅 Fecha: [FECHA]\n🕐 Hora: [HORA]\n👨‍⚕️ Doctor: [DOCTOR]\n\nPor favor confirma tu asistencia.\n\n¡Nos vemos pronto!",
    },
    {
      id: "10",
      name: "Promoción de cumpleaños",
      content:
        "¡Feliz cumpleaños! 🎂\n\nEn tu día especial, tenemos un regalo para ti:\n\n🎁 Descuento especial del 20%\n⏰ Válido por 7 días\n\n¡Ven a celebrar con nosotros!",
    },
  ];

  const formatDateTime = (date: Date) => {
    return date.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderScheduledReminders = () => (
    <div className="space-y-4">
      {scheduledReminders.length === 0 ? (
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
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay recordatorios programados
          </h3>
          <p className="text-gray-600">
            Programa tu primer recordatorio usando el botón de arriba
          </p>
        </div>
      ) : (
        scheduledReminders.map((reminder) => (
          <div
            key={reminder.id}
            className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-1">
                  {reminder.message}
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  Para: {reminder.recipient}
                </p>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">
                    📅 {formatDateTime(reminder.scheduledAt)}
                  </span>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      reminder.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {reminder.status === "pending" ? "Pendiente" : "Enviado"}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <button
                  className="p-1 text-gray-400 hover:text-gray-600"
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
                  className="p-1 text-gray-400 hover:text-red-600"
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
        ))
      )}
    </div>
  );

  const renderMessageTemplates = () => (
    <div className="flex flex-col h-full min-h-0">
      {/* Header fijo */}
      <div className="flex justify-between items-center p-6 pb-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
        <h3 className="text-lg font-medium text-gray-900">
          Plantillas de mensajes
        </h3>
        <button className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-2">
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
          <span>Nueva plantilla</span>
        </button>
      </div>

      {/* Contenido con scroll */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-6">
          <div className="grid gap-4">
            {messageTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-2">
                      {template.name}
                    </h4>
                    <p className="text-sm text-gray-600 whitespace-pre-line">
                      {template.content}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      className="p-1 text-gray-400 hover:text-blue-600"
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
                      className="p-1 text-gray-400 hover:text-red-600"
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
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-h-0">
      {/* Header de la sección */}
      <div className="p-6 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Recordatorios
              </h2>
              <p className="text-sm text-gray-600">
                Gestiona tus recordatorios y plantillas
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowReminderModal(true)}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>Programar Recordatorio</span>
          </button>
        </div>
      </div>

      {/* Navegación interna */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveSection("programados")}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeSection === "programados"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Recordatorios Programados
          </button>
          <button
            onClick={() => setActiveSection("plantillas")}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeSection === "plantillas"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Plantillas de Mensajes
          </button>
        </div>
      </div>

      {/* Contenido de la sección activa */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeSection === "programados" ? (
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-6">{renderScheduledReminders()}</div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {renderMessageTemplates()}
          </div>
        )}
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

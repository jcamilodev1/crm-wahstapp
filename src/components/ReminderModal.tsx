import React, { useState, useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  chatId?: string | null;
  chats: any[];
  hideRecipients?: boolean;
};

export default function ReminderModal({
  open,
  onClose,
  chatId,
  chats,
  hideRecipients = false,
}: Props) {
  const [body, setBody] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [datetime, setDatetime] = useState("");
  const [repeat, setRepeat] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("");

  // Plantillas de mensajes mock
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
  ];

  useEffect(() => {
    if (chatId) setSelected([chatId]);
    if (hideRecipients && chatId) setSelected([chatId]);
  }, [chatId, hideRecipients]);

  useEffect(() => {
    if (!open) {
      setBody("");
      setSelected([]);
      setDatetime("");
      setRepeat("");
      setError(null);
      setLoading(false);
      setSelectedTemplate("");
    }
  }, [open]);

  // Función para aplicar una plantilla
  const applyTemplate = (templateId: string) => {
    const template = messageTemplates.find((t) => t.id === templateId);
    if (template) {
      setBody(template.content);
      setSelectedTemplate(templateId);
    }
  };

  if (!open) return null;

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const submit = async () => {
    setError(null);
    if (!body.trim()) {
      setError("El mensaje está vacío");
      return;
    }
    const recipientsPayload = hideRecipients && chatId ? [chatId] : selected;
    if (!recipientsPayload || recipientsPayload.length === 0) {
      setError("Selecciona al menos un destinatario");
      return;
    }
    if (!datetime && !repeat) {
      // Para testing, permitir sin fecha, se programa en 5 segundos
    }

    const scheduledAt = datetime
      ? new Date(datetime).getTime()
      : Date.now() + 5000; // Para testing, programar en 5 segundos si no hay fecha
    console.log('datetime:', datetime, 'scheduledAt:', scheduledAt, 'Date:', new Date(scheduledAt).toString());
    const payload: any = {
      body: body.trim(),
      recipients: recipientsPayload,
      scheduledAt,
    };
    if (repeat) payload.repeatRule = repeat;

    try {
      setLoading(true);
      const apiKey = process.env.NEXT_PUBLIC_SYNC_API_KEY || "";
      const headers: any = { "Content-Type": "application/json" };
      if (apiKey) headers["x-api-key"] = apiKey;
      const resp = await fetch("http://localhost:3001/api/reminders", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      onClose();
    } catch (e: any) {
      setError(String(e && e.message ? e.message : e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-xl p-4 rounded shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Programar recordatorio</h3>
          <button onClick={onClose} className="text-gray-600">
            Cerrar
          </button>
        </div>

        {/* Selector de plantillas */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Plantillas de mensajes
          </label>
          <select
            value={selectedTemplate}
            onChange={(e) => applyTemplate(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
          >
            <option value="">Seleccionar plantilla...</option>
            {messageTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          {selectedTemplate && (
            <p className="text-xs text-gray-500 mt-1">
              Plantilla seleccionada:{" "}
              {messageTemplates.find((t) => t.id === selectedTemplate)?.name}
            </p>
          )}
        </div>

        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mensaje
          </label>
          <textarea
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              // Limpiar plantilla seleccionada si el usuario edita manualmente
              if (selectedTemplate) {
                setSelectedTemplate("");
              }
            }}
            className="w-full border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
            placeholder="Escribe tu mensaje o selecciona una plantilla arriba..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Puedes editar el mensaje después de seleccionar una plantilla
          </p>
        </div>

        {!hideRecipients ? (
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Destinatarios
            </label>
            <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
              {chats.map((c) => {
                const id = c?.id?._serialized ?? c?.id;
                return (
                  <label
                    key={id}
                    className="flex items-center gap-2 mb-1 hover:bg-gray-50 p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(id)}
                      onChange={() => toggle(id)}
                    />
                    <span className="text-sm">{c.name || id}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Destinatario
            </label>
            <div className="p-2 border border-gray-300 rounded-lg bg-gray-50">
              {chatId || "N/A"}
            </div>
          </div>
        )}

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha y hora
            </label>
            <input
              type="datetime-local"
              value={datetime}
              onChange={(e) => setDatetime(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recurrente (cron)
            </label>
            <input
              placeholder="e.g. 0 9 * * *"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Opcional: expresión cron para repetición
            </p>
          </div>
        </div>

        {error ? (
          <div className="text-sm text-red-600 mb-2">{error}</div>
        ) : null}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border">
            Cancelar
          </button>
          <button
            onClick={submit}
            className="px-4 py-2 bg-blue-600 text-white"
            disabled={loading}
          >
            {loading ? "Enviando..." : "Programar"}
          </button>
        </div>
      </div>
    </div>
  );
}

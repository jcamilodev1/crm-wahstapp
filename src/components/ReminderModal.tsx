import React, { useState, useEffect } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  chatId?: string | null;
  chats: any[];
  hideRecipients?: boolean;
};

export default function ReminderModal({ open, onClose, chatId, chats, hideRecipients = false }: Props) {
  const [body, setBody] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [datetime, setDatetime] = useState('');
  const [repeat, setRepeat] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (chatId) setSelected([chatId]);
    if (hideRecipients && chatId) setSelected([chatId]);
  }, [chatId, hideRecipients]);

  useEffect(() => {
    if (!open) {
      setBody(''); setSelected([]); setDatetime(''); setRepeat(''); setError(null); setLoading(false);
    }
  }, [open]);

  if (!open) return null;

  const toggle = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const submit = async () => {
    setError(null);
    if (!body.trim()) { setError('El mensaje está vacío'); return; }
    const recipientsPayload = hideRecipients && chatId ? [chatId] : selected;
    if (!recipientsPayload || recipientsPayload.length === 0) { setError('Selecciona al menos un destinatario'); return; }
    if (!datetime && !repeat) { setError('Selecciona una fecha/hora o una expresión recurrente (cron)'); return; }

    const scheduledAt = datetime ? (new Date(datetime)).getTime() : (Date.now() + 1000);
    const payload: any = { body: body.trim(), recipients: recipientsPayload, scheduledAt };
    if (repeat) payload.repeatRule = repeat;

    try {
      setLoading(true);
      const apiKey = process.env.NEXT_PUBLIC_SYNC_API_KEY || '';
      const headers: any = { 'Content-Type': 'application/json' };
      if (apiKey) headers['x-api-key'] = apiKey;
      const resp = await fetch('/api/reminders', { method: 'POST', headers, body: JSON.stringify(payload) });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      onClose();
    } catch (e: any) {
      setError(String(e && e.message ? e.message : e));
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-xl p-4 rounded shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Programar recordatorio</h3>
          <button onClick={onClose} className="text-gray-600">Cerrar</button>
        </div>

        <div className="mb-3">
          <label className="block text-sm text-gray-700">Mensaje</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} className="w-full border p-2" rows={4} />
        </div>

        {!hideRecipients ? (
          <div className="mb-3">
            <label className="block text-sm text-gray-700">Destinatarios</label>
            <div className="max-h-40 overflow-y-auto border p-2">
              {chats.map((c) => {
                const id = c?.id?._serialized ?? c?.id;
                return (
                  <label key={id} className="flex items-center gap-2 mb-1">
                    <input type="checkbox" checked={selected.includes(id)} onChange={() => toggle(id)} />
                    <span className="text-sm">{c.name || id}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mb-3">
            <label className="block text-sm text-gray-700">Destinatario</label>
            <div className="p-2 border">{chatId || 'N/A'}</div>
          </div>
        )}

        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm text-gray-700">Fecha y hora</label>
            <input type="datetime-local" value={datetime} onChange={(e) => setDatetime(e.target.value)} className="w-full border p-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Recurrente (cron)</label>
            <input placeholder="e.g. 0 9 * * *" value={repeat} onChange={(e) => setRepeat(e.target.value)} className="w-full border p-2" />
          </div>
        </div>

        {error ? <div className="text-sm text-red-600 mb-2">{error}</div> : null}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border">Cancelar</button>
          <button onClick={submit} className="px-4 py-2 bg-blue-600 text-white" disabled={loading}>{loading ? 'Enviando...' : 'Programar'}</button>
        </div>
      </div>
    </div>
  );
}

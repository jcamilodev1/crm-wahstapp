// reminder-worker.js - Módulo para el worker de recordatorios

const cronParser = require("cron-parser");
const {
  getDueReminders,
  markReminderProcessing,
  markReminderSent,
  markReminderFailed,
  getReminderById,
  rescheduleReminder,
} = require("../lib/database");
const { client, readyState } = require("./whatsapp-client");
const { REMINDER_POLL_INTERVAL_MS } = require("./config");

let reminderWorkerHandle = null;

// Reminder worker: consulta recordatorios pendientes y los envía cuando llega el momento.
async function processDueReminders(maxPerRun = 20) {
  if (!readyState.isReady) {
    console.log("Reminder worker: WhatsApp not ready, skipping");
    return;
  }
  try {
    const now = Date.now();
    const due = getDueReminders.all(now, maxPerRun) || [];
    console.log(`Reminder worker: Checking for due reminders, found ${due.length}`);
    for (const r of due) {
      try {
        // marcar como processing (y aumentar attempts)
        markReminderProcessing.run(r.id);
        // refrescar registro para conocer attempts actuales
        const refreshed = getReminderById.get(r.id);
        const recipients = (() => {
          try {
            return JSON.parse(r.recipients || "[]");
          } catch (e) {
            return [];
          }
        })();
        let allOk = true;
        for (const to of recipients) {
          try {
            console.log(`Sending reminder ${r.id} to ${to}`);
            await client.sendMessage(String(to), r.body || "");
            console.log(`Reminder ${r.id} sent to ${to}`);
          } catch (sendErr) {
            allOk = false;
            console.warn(
              "Failed to send reminder",
              r.id,
              "to",
              to,
              sendErr && sendErr.message ? sendErr.message : sendErr
            );
          }
        }

        if (allOk) {
          // If there's a repeatRule, compute next occurrence and reschedule
          if (r.repeatRule) {
            try {
              const interval = cronParser.parseExpression(r.repeatRule, {
                currentDate: new Date(r.scheduledAt),
              });
              const next = interval.next().getTime();
              // reschedule for next occurrence
              try {
                rescheduleReminder.run(next, r.id);
                // io.emit("reminder_rescheduled", { id: r.id, next }); // Emitir si io está disponible
              } catch (dbErr) {
                // fallback: mark as sent if reschedule fails
                console.warn(
                  "Failed to reschedule reminder in DB",
                  dbErr && dbErr.message ? dbErr.message : dbErr
                );
                markReminderSent.run(Date.now(), r.id);
                // io.emit("reminder_sent", { id: r.id });
              }
            } catch (cronErr) {
              // invalid cron expression -> mark sent and log
              console.warn(
                "Invalid repeatRule for reminder",
                r.id,
                r.repeatRule,
                cronErr && cronErr.message ? cronErr.message : cronErr
              );
              markReminderSent.run(Date.now(), r.id);
              // io.emit("reminder_sent", { id: r.id });
            }
          } else {
            markReminderSent.run(Date.now(), r.id);
            // io.emit("reminder_sent", { id: r.id });
          }
        } else {
          const attempts =
            refreshed && refreshed.attempts ? refreshed.attempts : 1;
          markReminderFailed.run(String("partial_send_error"), attempts, r.id);
          // io.emit("reminder_failed", { id: r.id, error: "partial_send_error" });
        }
      } catch (err) {
        // Make sure failures are recorded
        const refreshed = getReminderById.get(r.id);
        const attempts =
          refreshed && refreshed.attempts ? refreshed.attempts : 1;
        markReminderFailed.run(
          String(err && err.message ? err.message : err),
          attempts,
          r.id
        );
        // io.emit("reminder_failed", { id: r.id, error: err && err.message ? err.message : String(err) });
      }
    }
  } catch (e) {
    console.error("Reminder worker failed:", e && e.message ? e.message : e);
  }
}

function startReminderWorker(pollMs = REMINDER_POLL_INTERVAL_MS) {
  if (reminderWorkerHandle) return;
  reminderWorkerHandle = setInterval(() => {
    processDueReminders().catch(() => {});
  }, pollMs);
  console.log("Reminder worker started, poll interval:", pollMs, "ms");
}

function stopReminderWorker() {
  if (reminderWorkerHandle) {
    clearInterval(reminderWorkerHandle);
    reminderWorkerHandle = null;
    console.log("Reminder worker stopped");
  }
}

module.exports = {
  processDueReminders,
  startReminderWorker,
  stopReminderWorker,
};
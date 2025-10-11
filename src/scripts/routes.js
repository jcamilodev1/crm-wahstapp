// routes.js - Módulo para manejar rutas REST del servidor

const fs = require("fs");
const path = require("path");
const mime = require("mime-types");
const {
  insertMessage,
  listReminders,
  getReminderById,
  deleteReminder,
  insertReminder,
  markReminderProcessing,
  markReminderSent,
  markReminderFailed,
  rescheduleReminder,
} = require("../lib/database");
const { SYNC_API_KEY, MEDIA_ROOT, NODE_ENV } = require("./config");
const { client, readyState, normalize, normalizeChatIdInput } = require("./whatsapp-client");

function setupRoutes(server, io) {
  // Basic CORS headers used by our endpoints
  const corsBase = {
    "Access-Control-Allow-Origin": "http://localhost:3000",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key, Authorization",
  };

  // Simple health endpoint to check server availability
  server.on("request", async (req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { ...corsBase, "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    // Serve media files saved under data/media safely
    if (req.method === "GET" && req.url && req.url.startsWith("/media/")) {
      try {
        const requested = decodeURIComponent(req.url.replace(/^\/media\//, ""));
        const fullPath = path.join(MEDIA_ROOT, requested);
        if (!fullPath.startsWith(MEDIA_ROOT)) {
          res.writeHead(403);
          res.end("forbidden");
          return;
        }
        if (!fs.existsSync(fullPath)) {
          res.writeHead(404);
          res.end("not found");
          return;
        }
        const stat = fs.statSync(fullPath);
        const contentType = mime.lookup(fullPath) || "application/octet-stream";
        res.writeHead(200, {
          "Content-Type": contentType,
          "Content-Length": stat.size,
        });
        const stream = fs.createReadStream(fullPath);
        stream.pipe(res);
        return;
      } catch (e) {
        res.writeHead(500);
        res.end("error");
        return;
      }
    }

    // Only handle /api/sync-chat here; respond to OPTIONS for CORS preflight
    if (req.url === "/api/sync-chat") {
      const corsHeaders = corsBase;

      if (req.method === "OPTIONS") {
        res.writeHead(204, corsHeaders);
        res.end();
        return;
      }

      if (req.method !== "POST") {
        res.writeHead(405, {
          ...corsHeaders,
          "Content-Type": "application/json",
        });
        res.end(JSON.stringify({ error: "method_not_allowed" }));
        return;
      }

      try {
        const apiKeyHeader =
          req.headers["x-api-key"] || req.headers["authorization"];
        const expected = SYNC_API_KEY;

        if (!apiKeyHeader && NODE_ENV === "production") {
          res.writeHead(401, {
            ...corsHeaders,
            "Content-Type": "application/json",
          });
          res.end(JSON.stringify({ error: "unauthorized" }));
          return;
        }

        if (apiKeyHeader && String(apiKeyHeader) !== expected) {
          res.writeHead(401, {
            ...corsHeaders,
            "Content-Type": "application/json",
          });
          res.end(JSON.stringify({ error: "unauthorized" }));
          return;
        }

        // collect body
        let body = "";
        for await (const chunk of req) {
          body += chunk;
        }
        let payload = {};
        try {
          payload = body ? JSON.parse(body) : {};
        } catch (e) {
          res.writeHead(400, {
            ...corsHeaders,
            "Content-Type": "application/json",
          });
          res.end(JSON.stringify({ error: "invalid json" }));
          return;
        }

        const { chatId, limit = 200 } = payload;
        if (!chatId) {
          res.writeHead(400, {
            ...corsHeaders,
            "Content-Type": "application/json",
          });
          res.end(JSON.stringify({ error: "chatId required" }));
          return;
        }

        // Ensure client is ready
        if (!readyState.isReady) {
          res.writeHead(409, {
            ...corsHeaders,
            "Content-Type": "application/json",
          });
          res.end(JSON.stringify({ error: "whatsapp client not ready" }));
          return;
        }

        try {
          const chatIdNormalized = normalizeChatIdInput(chatId);
          console.log(
            `Sync request received for chat ${chatId} (normalized=${chatIdNormalized}) (limit=${limit})`
          );

          console.log(`Attempting to get chat by ID: ${chatIdNormalized}`);
          const chat = await client.getChatById(chatIdNormalized);
          if (!chat) {
            console.error(`Chat not found: ${chatIdNormalized}`);
            res.writeHead(404, {
              ...corsHeaders,
              "Content-Type": "application/json",
            });
            res.end(JSON.stringify({ error: "chat not found" }));
            return;
          }

          console.log(`Chat found, fetching messages with limit: ${limit}`);
          const messages = await chat.fetchMessages({ limit });
          console.log(`Fetched ${messages.length} messages from chat`);
          let saved = 0;
          for (const m of messages) {
            try {
              // If message has media, attempt to download and store
              let mediaFilename = null;
              let mediaMime = null;
              let mediaSize = null;
              if (m.hasMedia) {
                try {
                  const media = await m.downloadMedia();
                  if (media && media.data) {
                    mediaMime = media.mimetype || null;
                    mediaSize = media.filesize || null;
                    const ext = media.filename
                      ? path.extname(media.filename)
                      : mediaMime
                      ? "." + mediaMime.split("/").pop()
                      : "";
                    const mediaDir = path.join(MEDIA_ROOT, chatId);
                    fs.mkdirSync(mediaDir, { recursive: true });
                    mediaFilename = `${
                      m.id && (m.id._serialized || m.id.id)
                        ? m.id._serialized || m.id.id
                        : Date.now()
                    }${ext}`;
                    const filePath = path.join(mediaDir, mediaFilename);
                    fs.writeFileSync(filePath, Buffer.from(media.data, "base64"));
                  }
                } catch (e) {
                  console.warn(
                    "Failed to download media during sync for message",
                    m && m.id ? m.id._serialized || m.id.id : "<no-id>",
                    e && e.message ? e.message : e
                  );
                }
              }

              insertMessage.run(
                normalize(
                  m && m.id && (m.id._serialized || m.id.id)
                    ? m.id._serialized || m.id.id
                    : null
                ),
                normalize(chatId),
                normalize(
                  m && m.body ? m.body : m && m.content ? m.content : null
                ),
                normalize(m && m.from ? m.from : null),
                normalize(m && m.to ? m.to : null),
                normalize(m && m.timestamp ? m.timestamp : null),
                normalize(m && m.type ? m.type : null),
                normalize(m && m.isForwarded),
                normalize(m && m.isStatus),
                normalize(m && m.isStarred),
                normalize(m && m.fromMe),
                normalize(m && m.hasMedia),
                normalize(mediaFilename),
                normalize(mediaMime),
                normalize(mediaSize)
              );
              saved++;
            } catch (err) {
              console.warn(
                "Failed to save message during sync:",
                err && err.message ? err.message : err
              );
            }
          }

          console.log(
            `Sync completed: ${saved}/${messages.length} messages saved`
          );
          io.emit("sync_completed", { chatId, saved, total: messages.length });
          res.writeHead(200, {
            ...corsHeaders,
            "Content-Type": "application/json",
          });
          res.end(JSON.stringify({ chatId, saved, total: messages.length }));
          return;
        } catch (err) {
          console.error(
            "Error during sync:",
            err && err.message ? err.message : err
          );
          res.writeHead(500, {
            ...corsHeaders,
            "Content-Type": "application/json",
          });
          res.end(
            JSON.stringify({
              error: "sync_failed",
              details: err && err.message ? err.message : String(err),
            })
          );
          return;
        }
      } catch (err) {
        res.writeHead(500, {
          ...corsHeaders,
          "Content-Type": "application/json",
        });
        res.end(JSON.stringify({ error: "internal" }));
        return;
      }
    }

    // Simple reminders API: POST /api/reminders to create
    if (req.url && req.url.startsWith("/api/reminders")) {
      const corsHeaders = {
        "Access-Control-Allow-Origin": "http://localhost:3000",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-api-key, Authorization",
      };

      if (req.method === "OPTIONS") {
        res.writeHead(204, corsHeaders);
        res.end();
        return;
      }

      // POST /api/reminders -> crear reminder
      if (req.method === "POST" && req.url === "/api/reminders") {
        try {
          let body = "";
          for await (const chunk of req) body += chunk;
          const payload = body ? JSON.parse(body) : {};
          const apiKeyHeader =
            req.headers["x-api-key"] || req.headers["authorization"];
          const expected = SYNC_API_KEY;
          if (!apiKeyHeader || String(apiKeyHeader) !== expected) {
            res.writeHead(401, {
              ...corsHeaders,
              "Content-Type": "application/json",
            });
            res.end(JSON.stringify({ error: "unauthorized" }));
            return;
          }

          const { body: text, recipients, scheduledAt, repeatRule } = payload;
          if (
            !text ||
            !recipients ||
            !Array.isArray(recipients) ||
            recipients.length === 0 ||
            !scheduledAt
          ) {
            res.writeHead(400, {
              ...corsHeaders,
              "Content-Type": "application/json",
            });
            res.end(
              JSON.stringify({
                error: "invalid_payload",
                required: ["body", "recipients(array)", "scheduledAt(epoch_ms)"],
              })
            );
            return;
          }

          insertReminder.run(
            text,
            JSON.stringify(recipients),
            Number(scheduledAt),
            repeatRule || null,
            "pending"
          );
          console.log("Reminder created:", { text: text.substring(0, 50), recipients, scheduledAt: new Date(Number(scheduledAt)).toLocaleString('es-CO', {timeZone: 'America/Bogota'}) });
          res.writeHead(201, {
            ...corsHeaders,
            "Content-Type": "application/json",
          });
          res.end(JSON.stringify({ ok: true }));
          return;
        } catch (e) {
          res.writeHead(500, {
            ...corsHeaders,
            "Content-Type": "application/json",
          });
          res.end(
            JSON.stringify({
              error: "internal",
              details: e && e.message ? e.message : String(e),
            })
          );
          return;
        }
      }

      // GET /api/reminders?limit=&offset=
      if (req.method === "GET" && req.url.startsWith("/api/reminders")) {
        try {
          const urlObj = new URL(req.url, `http://localhost:3001`);
          const limit = Number(urlObj.searchParams.get("limit") || "50");
          const offset = Number(urlObj.searchParams.get("offset") || "0");
          const reminders = listReminders.all(limit, offset);
          res.writeHead(200, {
            ...corsHeaders,
            "Content-Type": "application/json",
          });
          res.end(JSON.stringify({ reminders }));
          return;
        } catch (e) {
          res.writeHead(500, {
            ...corsHeaders,
            "Content-Type": "application/json",
          });
          res.end(
            JSON.stringify({
              error: "internal",
              details: e && e.message ? e.message : String(e),
            })
          );
          return;
        }
      }

      // DELETE /api/reminders/:id
      if (req.method === "DELETE" && req.url.match(/^\/api\/reminders\/\d+$/)) {
        try {
          const parts = req.url.split("/");
          const id = Number(parts[parts.length - 1]);
          deleteReminder.run(id);
          res.writeHead(204, corsHeaders);
          res.end();
          return;
        } catch (e) {
          res.writeHead(500, {
            ...corsHeaders,
            "Content-Type": "application/json",
          });
          res.end(
            JSON.stringify({
              error: "internal",
              details: e && e.message ? e.message : String(e),
            })
          );
          return;
        }
      }
    }
  });
}

module.exports = { setupRoutes };
// config.js - Configuraciones centralizadas para el servidor WhatsApp CRM

const path = require("path");

// Cargar variables de entorno desde el archivo .env (si existe)
try {
  require("dotenv").config();
} catch (e) {
  // ignore if dotenv not installed; we still allow env vars passed via shell
}

// Configuraciones del servidor
const SERVER_PORT = 3001;
const CORS_ORIGIN = "http://localhost:3000";

// Configuraciones de WhatsApp
const SYNC_API_KEY = process.env.SYNC_API_KEY || "dev-key-123";
const REMINDER_POLL_INTERVAL_MS = Number(process.env.REMINDER_POLL_INTERVAL_MS || 5000);
const PREFETCH_MESSAGES = process.env.PREFETCH_MESSAGES && String(process.env.PREFETCH_MESSAGES).toLowerCase() === "true";

// Configuraciones de base de datos y multimedia
const MEDIA_ROOT = path.join(process.cwd(), "data", "media");

// Otras constantes
const NODE_ENV = process.env.NODE_ENV || "development";

module.exports = {
  SERVER_PORT,
  CORS_ORIGIN,
  SYNC_API_KEY,
  REMINDER_POLL_INTERVAL_MS,
  PREFETCH_MESSAGES,
  MEDIA_ROOT,
  NODE_ENV,
};
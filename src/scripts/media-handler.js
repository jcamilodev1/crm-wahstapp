// media-handler.js - Módulo para manejo de multimedia

const fs = require("fs");
const path = require("path");
const { MEDIA_ROOT } = require("./config");

async function downloadAndSaveMedia(message, chatId) {
  let mediaFilename = null;
  let mediaMime = null;
  let mediaSize = null;

  if (message.hasMedia) {
    try {
      const media = await message.downloadMedia();
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
          message.id && (message.id._serialized || message.id.id)
            ? message.id._serialized || message.id.id
            : Date.now()
        }${ext}`;
        const filePath = path.join(mediaDir, mediaFilename);
        fs.writeFileSync(filePath, Buffer.from(media.data, "base64"));
      }
    } catch (e) {
      console.warn(
        "Failed to download/save media for message:",
        message && message.id ? message.id._serialized || message.id.id : "<no-id>",
        e && e.message ? e.message : e
      );
    }
  }

  return { mediaFilename, mediaMime, mediaSize };
}

module.exports = { downloadAndSaveMedia };
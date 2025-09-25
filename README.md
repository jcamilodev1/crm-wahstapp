# WhatsApp CRM

Un CRM para WhatsApp que permite escanear código QR, ver contactos, chats y mensajes.

## Instalación

1. Clona el repositorio.
2. Instala las dependencias: `npm install`

## Uso

1. Ejecuta el servidor de WhatsApp: `npm run whatsapp`
2. En otra terminal, ejecuta el frontend: `npm run dev`
3. Abre http://localhost:3000 en tu navegador.
4. Escanea el código QR mostrado con la app de WhatsApp.
5. Una vez conectado, verás contactos y chats.

## Funcionalidades

- Escaneo de QR para autenticación.
- Lista de contactos.
- Lista de chats paginada (10 por página).
- Mensajes de chats seleccionados, paginados (20 por página).
- Recepción de nuevos mensajes en tiempo real.

## Tecnologías

- Frontend: Next.js, React, Tailwind CSS, Socket.io-client
- Backend: Node.js, whatsapp-web.js, Socket.io
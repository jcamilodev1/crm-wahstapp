# WhatsApp CRM

Un CRM moderno para WhatsApp construido con Next.js, React y Socket.io con una arquitectura basada en componentes reutilizables.

## ✨ Características

- 🔗 Conexión a WhatsApp mediante código QR
- 👥 Visualización de contactos y chats
- 💬 Envío y recepción de mensajes en tiempo real
- 📱 Soporte completo para medios (imágenes, videos, audio, documentos)
- 🎨 Interfaz moderna y responsiva
- ♻️ Arquitectura basada en componentes reutilizables
- 🔄 Scroll infinito para chats y mensajes
- 📊 Sincronización automática de conversaciones

## 🏗️ Arquitectura

### Componentes principales

- **QRConnection**: Maneja la pantalla de conexión y código QR
- **ChatSidebar**: Lista de contactos y chats con scroll infinito
- **MessageArea**: Área principal de mensajes con envío y recepción
- **Componentes UI**: Button, Input, Avatar, Badge, Spinner

### Hooks personalizados

- **useWhatsAppSocket**: Maneja toda la lógica de Socket.io y estado de la aplicación

### Estructura de archivos

```
src/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   │   ├── Avatar.tsx
│   │   ├── Badge.tsx
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Spinner.tsx
│   │   └── index.ts
│   ├── ChatSidebar.tsx
│   ├── MessageArea.tsx
│   ├── QRConnection.tsx
│   └── index.ts
├── hooks/
│   └── useWhatsAppSocket.ts
├── types/
│   └── index.ts
├── lib/
│   └── database.js
└── scripts/
    ├── migrate_messages.js
    ├── test_insert_message.js
    └── whatsapp-server.js
```

## 🚀 Configuración

1. **Instalar dependencias:**
```bash
npm install
```

2. **Iniciar el servidor de WhatsApp:**
```bash
npm run whatsapp
```

3. **En otra terminal, iniciar el servidor de desarrollo:**
```bash
npm run dev
```

4. **Abrir http://localhost:3000 en el navegador**
5. **Escanear el código QR con WhatsApp para conectar**

## 🛠️ Tecnologías

- **Frontend:**
  - Next.js 14
  - React 18
  - TypeScript
  - Tailwind CSS
  - Socket.io Client

- **Backend:**
  - Node.js
  - Socket.io Server
  - whatsapp-web.js
  - SQLite (better-sqlite3)

## 🎨 Componentes UI

### Button
```tsx
<Button variant="primary" size="md" onClick={handleClick}>
  Enviar
</Button>
```

### Input
```tsx
<Input
  label="Mensaje"
  placeholder="Escribe un mensaje..."
  value={message}
  onChange={(e) => setMessage(e.target.value)}
/>
```

### Avatar
```tsx
<Avatar
  src={contact.avatar}
  name={contact.name}
  size="md"
/>
```

### Badge
```tsx
<Badge variant="error" size="sm">
  {unreadCount}
</Badge>
```

## 🔧 Personalización

### Temas y estilos
Los componentes están construidos con Tailwind CSS y son fácilmente personalizables modificando las clases CSS.

### Nuevos componentes
Para agregar nuevos componentes UI:
1. Crear el componente en `src/components/ui/`
2. Exportarlo en `src/components/ui/index.ts`
3. Usarlo en tu aplicación

### Extender funcionalidad
El hook `useWhatsAppSocket` encapsula toda la lógica de estado y comunicación, facilitando la extensión de funcionalidades.

## 📱 Características de UX/UI

- **Diseño responsivo** que se adapta a diferentes tamaños de pantalla
- **Scroll infinito** para cargar más chats y mensajes
- **Indicadores de estado** (sincronizando, cargando, etc.)
- **Feedback visual** inmediato al enviar mensajes
- **Manejo de medios** optimizado con Next.js Image
- **Estados de carga** y errores bien definidos

## 🔄 Estados de la aplicación

1. **Conectando**: Mostrar pantalla de carga
2. **QR Code**: Mostrar código QR para escanear
3. **Conectado**: Interfaz principal con chats y mensajes
4. **Error**: Pantallas de error con mensajes descriptivos

## 🤝 Contribuir

1. Fork del proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit de tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.
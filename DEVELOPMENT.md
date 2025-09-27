# Guía de Desarrollo - WhatsApp CRM

## 📋 Resumen de Refactorización

Este documento describe la transformación del CRM de WhatsApp de un componente monolítico a una arquitectura basada en componentes reutilizables.

## 🔄 Cambios Realizados

### Antes
- Un solo archivo `page.tsx` con toda la lógica (484 líneas)
- Estado y lógica mezclados en un solo componente
- Difícil mantenimiento y reutilización
- UI básica sin sistema de diseño consistente

### Después
- Arquitectura modular con componentes especializados
- Separación clara de responsabilidades
- Sistema de diseño consistente con componentes UI reutilizables
- Hooks personalizados para lógica de negocio
- TypeScript para mejor tipado y desarrollo

## 🏗️ Arquitectura de Componentes

### Componentes UI Base (`src/components/ui/`)

#### Button.tsx
- **Propósito**: Botón reutilizable con diferentes variantes y tamaños
- **Props**: `variant`, `size`, `children`, y props nativas de button
- **Variantes**: `primary`, `secondary`, `outline`, `ghost`
- **Tamaños**: `sm`, `md`, `lg`

#### Input.tsx
- **Propósito**: Campo de entrada reutilizable con label y manejo de errores
- **Props**: `label`, `error`, y props nativas de input
- **Características**: Estilos consistentes, estados de error

#### Avatar.tsx
- **Propósito**: Mostrar imagen de perfil o iniciales
- **Props**: `src`, `alt`, `name`, `size`
- **Características**: Fallback a iniciales, optimización con Next.js Image

#### Badge.tsx
- **Propósito**: Mostrar contadores y estados
- **Props**: `variant`, `size`, `children`
- **Variantes**: `default`, `success`, `warning`, `error`

#### Spinner.tsx
- **Propósito**: Indicador de carga animado
- **Props**: `size`, `className`
- **Características**: Animación CSS pura, diferentes tamaños

### Componentes de Funcionalidad

#### QRConnection.tsx
- **Propósito**: Maneja la pantalla de conexión y código QR
- **Características**:
  - Diseño centrado y atractivo visualmente
  - Estados: generando QR, mostrando QR, conectando
  - Instrucciones paso a paso para el usuario
  - Optimización de imágenes con Next.js

#### ChatSidebar.tsx
- **Propósito**: Lista de contactos y chats con funcionalidad de scroll infinito
- **Características**:
  - Lista de contactos (primeros 5)
  - Lista completa de chats con scroll infinito
  - Indicadores de mensajes no leídos
  - Estados de sincronización
  - Formato de timestamps
  - IntersectionObserver para carga automática

#### MessageArea.tsx
- **Propósito**: Área principal de visualización y envío de mensajes
- **Características**:
  - Header del chat seleccionado
  - Lista de mensajes con scroll infinito hacia arriba
  - Soporte completo para medios (imagen, audio, video, archivos)
  - Formulario de envío de mensajes
  - Estados de carga y error
  - Formato de timestamps
  - Diferenciación visual entre mensajes propios y ajenos

### Hook Personalizado

#### useWhatsAppSocket.ts
- **Propósito**: Encapsula toda la lógica de Socket.io y manejo de estado
- **Características**:
  - Conexión y reconexión automática
  - Manejo de eventos de socket
  - Estado centralizado de la aplicación
  - Funciones para interactuar con chats y mensajes
  - Manejo de errores y estados de carga
  - Optimización de rendimiento con refs

## 🎨 Sistema de Diseño

### Paleta de Colores
- **Primario**: Azul (#2563eb)
- **Secundario**: Gris (#6b7280)
- **Éxito**: Verde (#059669)
- **Advertencia**: Amarillo (#d97706)
- **Error**: Rojo (#dc2626)

### Espaciado
- Usa el sistema de espaciado de Tailwind CSS
- Consistencia en margins y paddings
- Espaciado responsivo

### Tipografía
- Font system stack para mejor rendimiento
- Jerarquía clara de tamaños
- Weights apropiados para diferentes contextos

## 📁 Estructura de Archivos

```
src/
├── app/                    # Next.js App Router
│   ├── globals.css        # Estilos globales
│   ├── layout.tsx         # Layout principal
│   └── page.tsx           # Página principal (refactorizada)
├── components/            # Componentes React
│   ├── ui/               # Componentes UI reutilizables
│   │   ├── Avatar.tsx
│   │   ├── Badge.tsx
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Spinner.tsx
│   │   └── index.ts      # Barrel export
│   ├── ChatSidebar.tsx   # Sidebar de chats
│   ├── MessageArea.tsx   # Área de mensajes
│   ├── QRConnection.tsx  # Pantalla de conexión
│   └── index.ts          # Barrel export
├── hooks/                # Hooks personalizados
│   └── useWhatsAppSocket.ts
├── types/                # Definiciones TypeScript
│   └── index.ts
├── lib/                  # Utilidades y configuración
│   └── database.js
└── scripts/              # Scripts del servidor
    ├── migrate_messages.js
    ├── test_insert_message.js
    └── whatsapp-server.js
```

## 🔧 Patrones de Desarrollo

### Barrel Exports
Se utilizan archivos `index.ts` para facilitar las importaciones:
```typescript
// En lugar de:
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

// Podemos usar:
import { Button, Input } from '../components/ui';
```

### Props Interface
Cada componente tiene su interfaz de props bien definida:
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}
```

### Composición sobre Herencia
Los componentes se componen usando otros componentes más pequeños:
```typescript
// MessageArea usa Button, Input, Avatar, etc.
<Button type="submit" disabled={!messageInput.trim()}>
  <SendIcon />
</Button>
```

### Estado Centralizado
El hook `useWhatsAppSocket` mantiene todo el estado en un lugar:
```typescript
const {
  qr, ready, contacts, chats, messages,
  handleChatClick, handleSendMessage
} = useWhatsAppSocket();
```

## 🚀 Beneficios de la Refactorización

### Mantenimiento
- **Separación de responsabilidades**: Cada componente tiene una función específica
- **Código reutilizable**: Los componentes UI se pueden usar en toda la aplicación
- **Fácil debugging**: Problemas localizados en componentes específicos

### Desarrollo
- **TypeScript**: Mejor experiencia de desarrollo con tipado estático
- **Componentes pequeños**: Más fáciles de entender y testear
- **Hooks personalizados**: Lógica reutilizable y testeable

### UX/UI
- **Diseño consistente**: Sistema de diseño unificado
- **Mejor rendimiento**: Optimizaciones específicas por componente
- **Responsivo**: Adaptable a diferentes tamaños de pantalla

### Escalabilidad
- **Fácil agregar features**: Nuevos componentes siguiendo patrones establecidos
- **Tema configurable**: Sistema de diseño fácilmente personalizable
- **Testing**: Componentes aislados más fáciles de testear

## 📋 Próximos Pasos

### Mejoras Sugeridas
1. **Tests**: Agregar tests unitarios para componentes y hooks
2. **Storybook**: Documentar componentes UI con Storybook
3. **Temas**: Implementar sistema de temas dark/light
4. **Notificaciones**: Sistema de notificaciones toast
5. **PWA**: Convertir en Progressive Web App
6. **Internacionalización**: Soporte para múltiples idiomas

### Optimizaciones
1. **Lazy Loading**: Carga diferida de componentes pesados
2. **Virtualización**: Para listas muy largas de chats/mensajes
3. **Service Worker**: Para funcionalidad offline
4. **Bundle Analysis**: Optimizar el tamaño del bundle

## 🛠️ Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Compilar
npm run build

# Linting
npm run lint

# Servidor WhatsApp
npm run whatsapp
```

## 📖 Recursos

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [TypeScript](https://www.typescriptlang.org)
- [Socket.io](https://socket.io)

---

Esta refactorización transforma el proyecto de un código monolítico a una arquitectura moderna, mantenible y escalable, siguiendo las mejores prácticas de React y Next.js.
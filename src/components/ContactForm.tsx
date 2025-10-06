import React, { useState, useEffect } from "react";
import { Contact } from "../types";
import { Avatar, Button, Input } from "./ui";

interface ContactFormProps {
  contact: Contact;
  isEditing?: boolean;
  onSave: (contactData: ContactFormData) => void;
  onCancel: () => void;
  onAssignToChat?: (contactData: ContactFormData) => void;
}

interface ContactFormData {
  name: string;
  tag: string;
  number: string;
}

// Etiquetas predefinidas - esto podría venir de una API o base de datos
const PREDEFINED_TAGS = [
  "Cliente",
  "Proveedor",
  "Empleado",
  "Familia",
  "Amigo",
  "Negocio",
  "Servicio",
  "Otro",
];

export const ContactForm: React.FC<ContactFormProps> = ({
  contact,
  isEditing = false,
  onSave,
  onCancel,
  onAssignToChat,
}) => {
  const [formData, setFormData] = useState<ContactFormData>({
    name: contact.name || "",
    tag: "",
    number: contact.number,
  });
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);

  // Validar formulario
  useEffect(() => {
    setIsValid(
      formData.name.trim().length > 0 && formData.tag.trim().length > 0
    );
  }, [formData]);

  const handleInputChange = (field: keyof ContactFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleTagSelect = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tag,
    }));
    setIsCreatingTag(false);
    setNewTag("");
  };

  const handleCreateTag = () => {
    if (newTag.trim() && !customTags.includes(newTag.trim())) {
      const tag = newTag.trim();
      setCustomTags((prev) => [...prev, tag]);
      setFormData((prev) => ({
        ...prev,
        tag,
      }));
      setNewTag("");
      setIsCreatingTag(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      onSave(formData);
    }
  };

  const allTags = [...PREDEFINED_TAGS, ...customTags];

  return (
    <div className="flex-1 flex flex-col">
      {/* Header del contacto */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <Avatar
            src={contact.avatar}
            name={contact.name || contact.number}
            size="lg"
          />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditing ? "Editar Contacto" : "Agregar Contacto"}
            </h2>
            <p className="text-sm text-gray-600">{contact.number}</p>
          </div>
          <Button
            onClick={onCancel}
            variant="outline"
            className="text-gray-600 hover:text-gray-800"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </Button>
        </div>
      </div>

      {/* Formulario */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-6">
          {/* Campo Nombre */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Nombre del Contacto *
            </label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Ingresa el nombre completo"
              className="w-full"
              required
            />
          </div>

          {/* Campo Número (solo lectura) */}
          <div>
            <label
              htmlFor="number"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Número de Teléfono
            </label>
            <Input
              id="number"
              type="text"
              value={formData.number}
              disabled
              className="w-full bg-gray-100 text-gray-600"
            />
            <p className="text-xs text-gray-500 mt-1">
              El número no se puede modificar
            </p>
          </div>

          {/* Selector de Etiquetas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Etiqueta *
            </label>

            {/* Etiquetas existentes */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagSelect(tag)}
                  className={`p-2 text-sm rounded-lg border transition-colors ${
                    formData.tag === tag
                      ? "bg-blue-500 text-white border-blue-500"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Crear nueva etiqueta */}
            {!isCreatingTag ? (
              <button
                type="button"
                onClick={() => setIsCreatingTag(true)}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
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
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                <span>Crear nueva etiqueta</span>
              </button>
            ) : (
              <div className="flex space-x-2">
                <Input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Nombre de la etiqueta"
                  className="flex-1"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateTag();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={handleCreateTag}
                  disabled={!newTag.trim()}
                  size="sm"
                >
                  Crear
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setIsCreatingTag(false);
                    setNewTag("");
                  }}
                  variant="outline"
                  size="sm"
                >
                  Cancelar
                </Button>
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="space-y-3 pt-6">
            {/* Botones principales */}
            <div className="flex space-x-3">
              <Button
                type="button"
                onClick={onCancel}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!isValid}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isEditing ? "Actualizar" : "Agregar"} Contacto
              </Button>
            </div>

            {/* Botón de asignación creativo */}
            {onAssignToChat && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-50 text-gray-500">O</span>
                </div>
              </div>
            )}

            {onAssignToChat && (
              <Button
                type="button"
                onClick={() => onAssignToChat(formData)}
                disabled={!isValid}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
              >
                <div className="flex items-center justify-center space-x-2">
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
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  <span className="font-medium">⚡ Asignar a Chat</span>
                </div>
                <div className="text-xs opacity-90 mt-1">
                  Crear chat directo con este contacto
                </div>
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

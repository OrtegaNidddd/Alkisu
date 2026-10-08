import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { UserPlus, Edit3, AlertCircle, Phone, Mail, FileText, CheckCircle2 } from 'lucide-react';
import { useCreateClient, useUpdateClient } from '../../api/hooks';
import { Client } from '../../types';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientToEdit?: Client | null;
  onClientSaved?: (client: Client) => void;
  onClientCreated?: (client: Client) => void;
}

export const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  onClose,
  clientToEdit,
  onClientSaved,
  onClientCreated,
}) => {
  const isEditing = Boolean(clientToEdit);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createClientMutation = useCreateClient();
  const updateClientMutation = useUpdateClient();

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (clientToEdit) {
        setFullName(clientToEdit.fullName || '');
        setPhone(clientToEdit.phone || '');
        setEmail(clientToEdit.email || '');
        setDocumentId(clientToEdit.documentId || '');
      } else {
        setFullName('');
        setPhone('');
        setEmail('');
        setDocumentId('');
      }
    }
  }, [isOpen, clientToEdit]);

  const isPending = createClientMutation.isPending || updateClientMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('El nombre completo del cliente es obligatorio');
      return;
    }

    if (!phone.trim()) {
      setError('El número de teléfono o celular es obligatorio');
      return;
    }

    try {
      if (isEditing && clientToEdit) {
        const updated = await updateClientMutation.mutateAsync({
          id: clientToEdit.id,
          data: {
            fullName: fullName.trim(),
            phone: phone.trim(),
            email: email.trim() || undefined,
            documentId: documentId.trim() || undefined,
          },
        });

        onClose();
        if (onClientSaved) onClientSaved(updated);
        if (onClientCreated) onClientCreated(updated);
      } else {
        const created = await createClientMutation.mutateAsync({
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          documentId: documentId.trim() || undefined,
        });

        // Limpiar formulario
        setFullName('');
        setPhone('');
        setEmail('');
        setDocumentId('');
        onClose();

        if (onClientSaved) onClientSaved(created);
        if (onClientCreated) onClientCreated(created);
      }
    } catch (err: any) {
      setError(err.message || `Error al ${isEditing ? 'actualizar' : 'registrar'} el cliente`);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title={
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-lg bg-[#E5F4EE] text-[#176B52]">
            {isEditing ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-[#17201D] font-serif">
              {isEditing ? 'Editar Datos del Cliente' : 'Registrar Nuevo Cliente'}
            </h3>
            <p className="text-xs text-[#66736D]">
              {isEditing
                ? 'Actualice la información de contacto y documento de identidad'
                : 'Alta en el directorio comercial y vinculación a pedidos o cotizaciones'}
            </p>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-[#FDECEA] border border-[#f9c5c0] rounded-xl flex items-start space-x-2 text-xs text-[#B42318]">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-[#17201D] mb-1">
            Nombre Completo <span className="text-[#B42318]">*</span>
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="ej. Dra. María Camila Restrepo"
            className="w-full px-3 py-2 text-xs bg-[#F4F6F8] border border-[#DDE3E0] rounded-lg text-[#17201D] placeholder:text-[#9CA9A3] focus:outline-none focus:border-[#176B52]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#17201D] mb-1">
              Teléfono / WhatsApp <span className="text-[#B42318]">*</span>
            </label>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 text-[#9CA9A3] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+57 300 123 4567"
                className="w-full pl-8 pr-3 py-2 text-xs bg-[#F4F6F8] border border-[#DDE3E0] rounded-lg text-[#17201D] placeholder:text-[#9CA9A3] focus:outline-none focus:border-[#176B52]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17201D] mb-1">
              Cédula / Documento (Opcional)
            </label>
            <div className="relative">
              <FileText className="w-3.5 h-3.5 text-[#9CA9A3] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                placeholder="ej. 2222222222"
                className="w-full pl-8 pr-3 py-2 text-xs bg-[#F4F6F8] border border-[#DDE3E0] rounded-lg text-[#17201D] placeholder:text-[#9CA9A3] focus:outline-none focus:border-[#176B52]"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#17201D] mb-1">
            Correo Electrónico (Opcional)
          </label>
          <div className="relative">
            <Mail className="w-3.5 h-3.5 text-[#9CA9A3] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@ejemplo.com"
              className="w-full pl-8 pr-3 py-2 text-xs bg-[#F4F6F8] border border-[#DDE3E0] rounded-lg text-[#17201D] placeholder:text-[#9CA9A3] focus:outline-none focus:border-[#176B52]"
            />
          </div>
          <span className="text-[10px] text-[#66736D] mt-0.5 block">
            Utilizado para envío de cotizaciones comerciales y recibos digitales de abono.
          </span>
        </div>

        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#DDE3E0]">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isPending}
          >
            {isEditing ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Guardar Cambios
              </>
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5 mr-1" />
                Crear Cliente
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

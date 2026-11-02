import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Order,
  OrderStatus,
  OrderAttachment,
  PaymentMethod,
  Payment,
  AttachmentType,
  Material,
} from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Lightbox } from '../ui/Lightbox';
import { DeliveryActModal } from './DeliveryActModal';
import {
  formatCurrency,
  formatGrams,
  formatDate,
  getDeliverySLA,
} from '../../utils/formatters';
import {
  User,
  Scale,
  Hammer,
  Calendar,
  DollarSign,
  Layers,
  Image as ImageIcon,
  CheckCircle,
  ZoomIn,
  Eye,
  AlertTriangle,
  History,
  FileCheck,
  Upload,
  Printer,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  XCircle,
  Sparkles,
  Gem,
  Plus,
  Check,
  Info,
  Award,
  Fingerprint,
} from 'lucide-react';
import {
  useOrder,
  useUpdateOrderStatus,
  useAddPayment,
  useCancelOrder,
  useAddAttachment,
  useUsers,
  useMaterials,
  useAssignArtisan,
  useConsumeOrderMaterial,
  useUploadFile,
} from '../../api/hooks';
import { useAuth } from '../../hooks/useAuth';

interface OrderDetailModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenMetalReturn?: (order: Order) => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  isOpen,
  onClose,
  onOpenMetalReturn,
}) => {
  const { role } = useAuth();
  const queryClient = useQueryClient();

  // Obtener datos reactivos en tiempo real de la orden desde el backend
  const { data: liveOrder, refetch: refetchLiveOrder } = useOrder(order?.id || null);
  const currentOrder = liveOrder || order;

  // Estado reactivo inmediato para abonos
  const [localPayments, setLocalPayments] = useState<Payment[]>([]);

  useEffect(() => {
    if (currentOrder?.payments) {
      setLocalPayments(
        currentOrder.payments.map((p) => ({
          ...p,
          amount: Number(p.amount),
        }))
      );
    }
  }, [currentOrder?.payments]);

  // Estado reactivo inmediato para adjuntos (permite ver la foto al instante)
  const [localAttachments, setLocalAttachments] = useState<OrderAttachment[]>([]);

  useEffect(() => {
    // Sincronizar de forma estricta con la orden actual. Si no tiene adjuntos, vaciar a []
    setLocalAttachments(currentOrder?.attachments || order?.attachments || []);
  }, [currentOrder?.id, order?.id, currentOrder?.attachments, order?.attachments]);

  const currentAttachments = localAttachments.length > 0
    ? localAttachments
    : (currentOrder?.attachments || order?.attachments || []);

  const bocetoAttachment =
    currentAttachments.find((a) => a.fileType === 'BOCETO_REFERENCIA') ||
    currentAttachments[0];

  const [activeTab, setActiveTab] = useState<
    'general' | 'gallery' | 'materials' | 'metal' | 'payments' | 'history'
  >('general');

  // Lightbox
  const [lightboxImage, setLightboxImage] = useState<OrderAttachment | null>(null);

  // Abonos
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TRANSFERENCIA');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  // Cancelación
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState<string>('');

  // Errores / Notificaciones locales
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Recibo de comprobante imprimible
  const [receiptPayment, setReceiptPayment] = useState<any | null>(null);

  // Acta oficial de entrega final y liquidación contable
  const [isDeliveryActOpen, setIsDeliveryActOpen] = useState(false);

  // Siempre reiniciar a la pestaña 'general' y limpiar estados de submodales al abrir o cambiar de orden
  useEffect(() => {
    if (isOpen) {
      setActiveTab('general');
      setLightboxImage(null);
      setIsPaymentModalOpen(false);
      setReceiptPayment(null);
      setIsDeliveryActOpen(false);
      setIsDispatchModalOpen(false);
      setIsAssigningArtisan(false);
      setIsCancelConfirmOpen(false);
      setActionError(null);
      setActionSuccess(null);
      setLocalAttachments(order?.attachments || []);
      setLocalPayments((order?.payments || []).map((p) => ({ ...p, amount: Number(p.amount) })));
    } else {
      setLocalAttachments([]);
      setLocalPayments([]);
      setIsDeliveryActOpen(false);
    }
  }, [isOpen, order?.id]);

  // Mutaciones
  const updateStatusMutation = useUpdateOrderStatus();
  const addPaymentMutation = useAddPayment();
  const cancelOrderMutation = useCancelOrder();
  const addAttachmentMutation = useAddAttachment();

  // Usuarios y Joyeros
  const { data: users = [] } = useUsers();
  const { data: materials = [] } = useMaterials();
  const artisans = users.filter((u) => u.role === 'JOYERO');

  const assignArtisanMutation = useAssignArtisan();
  const consumeMaterialMutation = useConsumeOrderMaterial();
  const uploadFileMutation = useUploadFile();

  // Estado de asignación de joyero reactivo
  const [selectedArtisanId, setSelectedArtisanId] = useState<string>(
    currentOrder?.artisanId || order?.artisanId || ''
  );
  const [isAssigningArtisan, setIsAssigningArtisan] = useState(false);

  useEffect(() => {
    if (currentOrder?.artisanId) {
      setSelectedArtisanId(currentOrder.artisanId);
    }
  }, [currentOrder?.artisanId]);

  // Estado de despacho de materia prima
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [dispatchMaterialId, setDispatchMaterialId] = useState<string>('');
  const [dispatchQuantity, setDispatchQuantity] = useState<string>('');

  // Refs para subida de archivos (disponibles siempre en el DOM)
  const bocetoInputRef = useRef<HTMLInputElement>(null);
  const calidadInputRef = useRef<HTMLInputElement>(null);

  // Detección inteligente de materiales requeridos según especificación técnica / cotización
  const orderRequirements = useMemo(() => {
    if (!currentOrder) {
      return {
        requiredMaterials: [] as Material[],
        matchingIds: new Set<string>(),
        requiredGrams: 0,
        materialRequirements: new Map<string, { targetQty: number; unit: string; description: string }>(),
      };
    }

    const descLower = (currentOrder.description || '').toLowerCase();
    const quoteItems = currentOrder.quote?.items || [];
    const quoteTexts = quoteItems.map((it) => (it.description || '').toLowerCase()).join(' ');
    const fullSpec = `${descLower} ${quoteTexts}`;

    // Extraer peso bruto o neto requerido en gramos para metales
    let requiredGrams = 0;
    const brutoMatch = fullSpec.match(/\[([\d.]+)\s*g\s*brutos/i) || fullSpec.match(/([\d.]+)\s*g\s*brutos/i);
    if (brutoMatch) {
      requiredGrams = parseFloat(brutoMatch[1]);
    } else {
      const netoMatch = fullSpec.match(/\(?([\d.]+)\s*g\s*netos?/i) || fullSpec.match(/([\d.]+)\s*g/i);
      if (netoMatch) {
        requiredGrams = parseFloat(netoMatch[1]);
      }
    }

    // Mapa de requerimientos específicos por cada material (ID -> { targetQty, unit, description })
    const materialRequirements = new Map<string, { targetQty: number; unit: string; description: string }>();

    // Buscar qué materiales de bodega coinciden de verdad con la pieza
    const matching = materials.filter((m) => {
      const nameLower = (m.name || '').toLowerCase();
      const isMetal = m.unit === 'GRAMOS' || (m.type && m.type !== 'PIEDRA_PRECIOSA');
      const isStone = m.type === 'PIEDRA_PRECIOSA' || m.unit === 'KILATES';

      // 1. Verificación precisa de metales
      if (isMetal) {
        let metalMatches = false;
        if (m.type === 'ORO_AMARILLO_18K' && (fullSpec.includes('oro amarillo') || fullSpec.includes('18k amarillo') || fullSpec.includes('amarillo 18k'))) metalMatches = true;
        else if (m.type === 'ORO_BLANCO_18K' && (fullSpec.includes('oro blanco') || fullSpec.includes('18k blanco') || fullSpec.includes('blanco 18k'))) metalMatches = true;
        else if (m.type === 'ORO_ROSA_18K' && (fullSpec.includes('oro rosa') || fullSpec.includes('18k rosa') || fullSpec.includes('rosa 18k'))) metalMatches = true;
        else if (m.type === 'ORO_14K' && fullSpec.includes('14k')) metalMatches = true;
        else if (m.type === 'ORO_10K' && fullSpec.includes('10k')) metalMatches = true;
        else if (m.type === 'PLATA_925' && (fullSpec.includes('plata') || fullSpec.includes('925'))) metalMatches = true;
        else if (fullSpec.includes(nameLower)) metalMatches = true;

        if (metalMatches) {
          materialRequirements.set(m.id, {
            targetQty: requiredGrams,
            unit: m.unit || 'GRAMOS',
            description: 'Gramaje presupuestado para la joya',
          });
          return true;
        }
      }

      // 2. Verificación precisa de piedras preciosas / gemas (NO mezclar tipos de piedras)
      if (isStone) {
        const isDiamanteMat = nameLower.includes('diamante') || nameLower.includes('brillante') || nameLower.includes('diamond');
        const isEsmeraldaMat = nameLower.includes('esmeralda') || nameLower.includes('emerald');
        const isZafiroMat = nameLower.includes('zafiro') || nameLower.includes('sapphire');
        const isRubiMat = nameLower.includes('rubi') || nameLower.includes('rubí') || nameLower.includes('ruby');
        const isCirconMat = nameLower.includes('circon') || nameLower.includes('circón') || nameLower.includes('zircon');
        const isMoissanitaMat = nameLower.includes('moissanita') || nameLower.includes('moissanite');

        // Solo coincide si la joya específicamente pide este tipo de gema
        let stoneMatches = false;
        if (isDiamanteMat && (fullSpec.includes('diamante') || fullSpec.includes('brillante') || fullSpec.includes('diamond'))) stoneMatches = true;
        else if (isEsmeraldaMat && (fullSpec.includes('esmeralda') || fullSpec.includes('emerald'))) stoneMatches = true;
        else if (isZafiroMat && (fullSpec.includes('zafiro') || fullSpec.includes('sapphire'))) stoneMatches = true;
        else if (isRubiMat && (fullSpec.includes('rubi') || fullSpec.includes('rubí') || fullSpec.includes('ruby'))) stoneMatches = true;
        else if (isCirconMat && (fullSpec.includes('circon') || fullSpec.includes('circón') || fullSpec.includes('zircon'))) stoneMatches = true;
        else if (isMoissanitaMat && (fullSpec.includes('moissanita') || fullSpec.includes('moissanite'))) stoneMatches = true;
        else if (fullSpec.includes(nameLower)) stoneMatches = true;

        if (stoneMatches) {
          // Extraer la cantidad presupuestada de piedras / quilates
          let stoneQty = 0;
          const matchingQuoteItem = quoteItems.find((it) => {
            const itemDesc = (it.description || '').toLowerCase();
            return (
              it.category === 'piedra' &&
              ((isDiamanteMat && itemDesc.includes('diamante')) ||
                (isEsmeraldaMat && itemDesc.includes('esmeralda')) ||
                (isZafiroMat && itemDesc.includes('zafiro')) ||
                (isRubiMat && itemDesc.includes('rubi')) ||
                itemDesc.includes(nameLower))
            );
          });

          if (matchingQuoteItem) {
            const desc = matchingQuoteItem.description || '';
            const ctMatch = desc.match(/([\d.]+)\s*ct/i);
            const carats = ctMatch ? parseFloat(ctMatch[1]) : 0;
            const count = matchingQuoteItem.quantity || 1;

            if (m.unit === 'KILATES') {
              stoneQty = carats > 0 ? Number((count * carats).toFixed(3)) : count;
            } else {
              stoneQty = count;
            }
          } else {
            // Analizar texto general: ej. "1x Diamante (0.5ct)" o "1x Diamante"
            const stoneWord = isDiamanteMat ? 'diamante' : isEsmeraldaMat ? 'esmeralda' : isZafiroMat ? 'zafiro' : isRubiMat ? 'rubi' : '';
            const regex = new RegExp(`(\\d+)x?\\s+[^|()]*${stoneWord}[^|()]*\\(?([\\d.]+)?\\s*ct?`, 'i');
            const match = fullSpec.match(regex);
            if (match) {
              const count = parseFloat(match[1]) || 1;
              const carats = match[2] ? parseFloat(match[2]) : 0;
              stoneQty = m.unit === 'KILATES' && carats > 0 ? Number((count * carats).toFixed(3)) : count;
            } else {
              stoneQty = 1;
            }
          }

          materialRequirements.set(m.id, {
            targetQty: stoneQty,
            unit: m.unit || 'KILATES',
            description: `Gema requerida: ${stoneQty} ${m.unit || 'ct/ud'}`,
          });
          return true;
        }
      }

      return false;
    });

    const matchingIds = new Set(matching.map((m) => m.id));

    return {
      requiredMaterials: matching,
      matchingIds,
      requiredGrams,
      materialRequirements,
    };
  }, [currentOrder, materials]);

  // Selección de material a despachar y cálculo de saldo pendiente
  const selectedDispatchMaterial = useMemo(() => {
    return materials.find((m) => m.id === dispatchMaterialId);
  }, [materials, dispatchMaterialId]);

  const materialDispatchStats = useMemo(() => {
    if (!currentOrder || !dispatchMaterialId) return null;

    const yaDespachado = (currentOrder.materialsUsed || [])
      .filter((m) => m.materialId === dispatchMaterialId)
      .reduce((sum, curr) => sum + Number(curr.quantity), 0);

    const isMetal = selectedDispatchMaterial?.unit === 'GRAMOS' || (selectedDispatchMaterial?.type && selectedDispatchMaterial?.type !== 'PIEDRA_PRECIOSA');
    const isRelated = orderRequirements.matchingIds.has(dispatchMaterialId);
    const req = orderRequirements.materialRequirements.get(dispatchMaterialId);
    const targetQty = req ? req.targetQty : (isMetal && orderRequirements.requiredGrams > 0 ? orderRequirements.requiredGrams : 0);
    const pendiente = Math.max(0, targetQty - yaDespachado);

    return {
      yaDespachado,
      isMetal,
      isRelated,
      targetQty,
      pendiente,
      unit: selectedDispatchMaterial?.unit || (isMetal ? 'GRAMOS' : 'KILATES'),
    };
  }, [currentOrder, dispatchMaterialId, selectedDispatchMaterial, orderRequirements]);

  // Advertencias en tiempo real de despacho
  const dispatchWarning = useMemo(() => {
    if (!dispatchMaterialId || !dispatchQuantity) return null;
    const qty = parseFloat(dispatchQuantity);
    if (isNaN(qty) || qty <= 0) return null;

    if (materialDispatchStats && !materialDispatchStats.isRelated) {
      return {
        type: 'incompatible',
        message: 'Advertencia: Este material NO forma parte de la especificación técnica ni cotización de este pedido. Verifique si realmente corresponde a esta joya.',
      };
    }

    if (materialDispatchStats && materialDispatchStats.targetQty > 0 && qty < materialDispatchStats.pendiente) {
      const faltante = (materialDispatchStats.pendiente - qty).toFixed(3);
      return {
        type: 'partial',
        message: `Despacho Inicial Parcial: Está despachando ${qty} ${selectedDispatchMaterial?.unit || 'g'} de los ${materialDispatchStats.pendiente.toFixed(3)} ${selectedDispatchMaterial?.unit || 'g'} requeridos. Quedarán ${faltante} pendientes por entregar al joyero.`,
      };
    }

    return null;
  }, [dispatchMaterialId, dispatchQuantity, materialDispatchStats, selectedDispatchMaterial]);

  // Conceptos limpios y amigables para el cliente en el recibo (sin jerga técnica interna de merma/taller)
  const cleanReceiptItems = useMemo(() => {
    if (!currentOrder?.description) return [];

    // 1. Eliminar prefijo automático de cotización
    let cleaned = currentOrder.description.replace(/^Fabricación según cotización:\s*/i, '').trim();

    // 2. Ocultar cálculos internos de taller (merma interna, fórmulas de fundición)
    cleaned = cleaned.replace(/\|\s*Control taller:[^\])]*\]?/gi, '');
    cleaned = cleaned.replace(/\[\s*[\d.]+\s*g\s*brutos[^\]]*\]/gi, '');

    // 3. Separar por ítems
    const rawParts = cleaned.split(/\s*\|\s*/).map((p) => p.trim()).filter(Boolean);

    return rawParts
      .map((part) => {
        // Quitar cantidades duplicadas tipo '1x 1x'
        let item = part.replace(/^(\d+x\s*)+/i, '').trim();
        // Quitar desglose de tarifas unitarias no requeridas por el cliente (ej. '@ $ 400.000/g' o 'c/u @ $ 10.000/ct')
        item = item.replace(/\s*(?:c\/u\s*)?@\s*\$[\d.,\s]+(?:\/[a-zA-Z]+)?/gi, '');
        // Limpiar paréntesis y espacios sobrantes
        item = item.replace(/\s+\)/g, ')');
        item = item.replace(/\(\s*\)/g, '');
        item = item.replace(/\s{2,}/g, ' ').trim();
        return item;
      })
      .filter(Boolean);
  }, [currentOrder?.description]);

  // Subida de archivos con reactividad instantánea
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: AttachmentType) => {
    const file = e.target.files?.[0];
    if (!file || !currentOrder) return;
    setActionError(null);
    setActionSuccess(null);

    try {
      // Subir archivo al backend/storage
      const uploadResult = await uploadFileMutation.mutateAsync({
        file,
        folder: type === 'BOCETO_REFERENCIA' ? 'bocetos' : 'calidad',
      });

      // Registrar adjunto en el pedido
      const newAtt = await addAttachmentMutation.mutateAsync({
        orderId: currentOrder.id,
        file: {
          fileName: file.name,
          fileUrl: uploadResult.publicUrl,
          fileType: type,
          description: type === 'BOCETO_REFERENCIA' ? 'Boceto técnico cargado' : 'Control fotográfico de calidad',
        },
      });

      const formattedAtt: OrderAttachment = {
        id: newAtt?.id || `att-${Date.now()}`,
        orderId: currentOrder.id,
        fileName: file.name,
        fileUrl: uploadResult.publicUrl,
        fileType: type,
        description: type === 'BOCETO_REFERENCIA' ? 'Boceto técnico cargado' : 'Control fotográfico de calidad',
        createdAt: new Date().toISOString(),
      };

      // Actualizar vista local inmediatamente
      setLocalAttachments((prev) => [
        formattedAtt,
        ...prev.filter((p) => p.fileUrl !== uploadResult.publicUrl),
      ]);

      // Sincronizar cache de react-query para reflejo en toda la app
      queryClient.setQueryData(['order', currentOrder.id], (old: any) => ({
        ...old,
        attachments: [formattedAtt, ...(old?.attachments || []).filter((a: any) => a.fileUrl !== uploadResult.publicUrl)],
      }));
      await queryClient.invalidateQueries({ queryKey: ['orders'] });

      setActionSuccess(`Archivo ${file.name} adjuntado exitosamente a la orden`);
    } catch (err: any) {
      setActionError(err.message || 'Error al adjuntar archivo');
    } finally {
      e.target.value = '';
    }
  };

  // Asignación de joyero con reactividad instantánea
  const handleAssignArtisanSubmit = async () => {
    if (!currentOrder || !selectedArtisanId) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      await assignArtisanMutation.mutateAsync({
        orderId: currentOrder.id,
        artisanId: selectedArtisanId,
      });

      const assignedUser = artisans.find((a) => a.id === selectedArtisanId);

      // Actualizar cache inmediatamente
      queryClient.setQueryData(['order', currentOrder.id], (old: any) => ({
        ...old,
        artisanId: selectedArtisanId,
        artisan: assignedUser || old?.artisan,
      }));
      await queryClient.invalidateQueries({ queryKey: ['orders'] });

      setIsAssigningArtisan(false);
      setActionSuccess(`Orfebre ${assignedUser?.fullName || ''} asignado correctamente a la joya`);
    } catch (err: any) {
      setActionError(err.message || 'Error al asignar joyero');
    }
  };

  // Despacho de materia prima con reactividad instantánea
  const handleDispatchMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrder || !dispatchMaterialId) return;
    const qty = parseFloat(dispatchQuantity);
    if (isNaN(qty) || qty <= 0) {
      setActionError('Ingrese una cantidad válida mayor a 0');
      return;
    }
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await consumeMaterialMutation.mutateAsync({
        orderId: currentOrder.id,
        materialId: dispatchMaterialId,
        quantity: qty,
      });

      const mat = materials.find((m) => m.id === dispatchMaterialId);
      const newMaterialUsage = res?.orderMaterial
        ? { ...res.orderMaterial, material: mat }
        : {
            id: `om-${Date.now()}`,
            orderId: currentOrder.id,
            materialId: dispatchMaterialId,
            material: mat,
            quantity: qty,
            createdAt: new Date().toISOString(),
          };

      // Actualizar cache inmediatamente
      queryClient.setQueryData(['order', currentOrder.id], (old: any) => ({
        ...old,
        materialsUsed: [newMaterialUsage, ...(old?.materialsUsed || [])],
      }));
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['materials'] });

      setIsDispatchModalOpen(false);
      setDispatchQuantity('');
      setDispatchMaterialId('');
      setActionSuccess(`Materia prima (${qty} ${mat?.unit || 'g'} de ${mat?.name || 'material'}) despachada e ingresada a la orden con éxito`);
    } catch (err: any) {
      setActionError(err.message || 'Error al despachar material');
    }
  };

  if (!currentOrder) return null;

  const sla = getDeliverySLA(currentOrder.estimatedDelivery);
  const activePayments = localPayments.length > 0 ? localPayments : (currentOrder.payments || []).map((p) => ({ ...p, amount: Number(p.amount) }));
  const totalAbonado = activePayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const totalPactadoNum = Number(currentOrder.totalPactado) || 0;
  const saldoPendiente = Math.max(0, totalPactadoNum - totalAbonado);
  const isPaidInFull = saldoPendiente <= 0;

  // Filtrado técnico para cierre metalúrgico: METALES NOBLES VS GEMAS
  const metalMaterialsUsed = (currentOrder.materialsUsed || []).filter(
    (m) => m.material?.unit === 'GRAMOS' || (m.material?.type && m.material.type !== 'PIEDRA_PRECIOSA')
  );
  const gemMaterialsUsed = (currentOrder.materialsUsed || []).filter(
    (m) => m.material?.unit === 'KILATES' || m.material?.type === 'PIEDRA_PRECIOSA'
  );
  const totalMetalGrams = metalMaterialsUsed.reduce(
    (acc, m) => acc + Number(m.quantity),
    0
  );

  // Manejo de cambio de estado
  const handleTransition = async (nextStatus: OrderStatus) => {
    setActionError(null);
    setActionSuccess(null);

    if (nextStatus === 'ENTREGADO' && !isPaidInFull) {
      setActionError(
        `Bloqueo de Entrega: Esta joya tiene un saldo pendiente de ${formatCurrency(
          saldoPendiente
        )}. Debe estar 100% cancelada para formalizar la entrega.`
      );
      return;
    }

    if (nextStatus === 'FABRICACION' && !currentOrder.artisanId && !selectedArtisanId) {
      setActionError('Para pasar a Banco de Trabajo (Fabricación) debe asignar un orfebre responsable a la joya.');
      setIsAssigningArtisan(true);
      return;
    }

    try {
      await updateStatusMutation.mutateAsync({
        id: currentOrder.id,
        newStatus: nextStatus,
        note: `Estado actualizado a ${nextStatus} desde la ficha técnica`,
      });

      queryClient.setQueryData(['order', currentOrder.id], (old: any) => ({
        ...old,
        status: nextStatus,
      }));
      await queryClient.invalidateQueries({ queryKey: ['orders'] });

      setActionSuccess(`Estado actualizado con éxito a ${nextStatus}`);
      if (nextStatus === 'ENTREGADO') {
        setIsDeliveryActOpen(true);
      }
    } catch (err: any) {
      setActionError(err.message || 'Error al actualizar el estado del pedido');
    }
  };

  // Manejo de abono
  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setActionError('Ingrese un monto válido');
      return;
    }

    if (amountNum > saldoPendiente) {
      setActionError(
        `El abono (${formatCurrency(amountNum)}) excede el saldo pendiente (${formatCurrency(saldoPendiente)})`
      );
      return;
    }

    try {
      const res = await addPaymentMutation.mutateAsync({
        orderId: currentOrder.id,
        amount: amountNum,
        paymentMethod,
        referenceNotes: paymentNotes,
      });

      const createdPayment = (res as any)?.payment;
      const newPayId = createdPayment?.id || (res as any)?.payments?.[0]?.id || `pay-${Date.now()}`;
      const newPayObj: Payment = {
        id: newPayId,
        orderId: currentOrder.id,
        registeredById: createdPayment?.registeredById || 'current-user',
        registeredBy: createdPayment?.registeredBy || { fullName: 'Caja Alkisu' },
        amount: amountNum,
        paymentMethod,
        referenceNotes: paymentNotes,
        createdAt: createdPayment?.createdAt || new Date().toISOString(),
      };

      // 1. Actualizar estado local al instante
      setLocalPayments((prev) => [newPayObj, ...prev.filter((p) => p.id !== newPayId)]);

      // 2. Cerrar modal de pago y abrir recibo de inmediato sin esperas de red
      setIsPaymentModalOpen(false);
      const currentNotes = paymentNotes;
      setPaymentAmount('');
      setPaymentNotes('');

      // Abrir recibo automático formal instantáneamente
      setReceiptPayment({
        id: newPayId,
        amount: amountNum,
        paymentMethod,
        referenceNotes: currentNotes,
        createdAt: createdPayment?.createdAt || new Date().toISOString(),
        orderId: currentOrder.id,
        client: currentOrder.client,
      });

      // 3. Sincronizar cache en segundo plano (sin bloquear la interfaz)
      queryClient.invalidateQueries({ queryKey: ['order', currentOrder.id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (err: any) {
      setActionError(err.message || 'Error al registrar el pago');
    }
  };

  const handleModalClose = () => {
    setActiveTab('general');
    setLightboxImage(null);
    setIsPaymentModalOpen(false);
    setReceiptPayment(null);
    setIsDeliveryActOpen(false);
    setIsDispatchModalOpen(false);
    setIsAssigningArtisan(false);
    setIsCancelConfirmOpen(false);
    setActionError(null);
    setActionSuccess(null);
    setLocalAttachments([]);
    setLocalPayments([]);
    onClose();
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      setActionError('Debe ingresar un motivo para cancelar');
      return;
    }
    try {
      await cancelOrderMutation.mutateAsync({
        orderId: currentOrder.id,
        reason: cancelReason,
      });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      setIsCancelConfirmOpen(false);
      handleModalClose();
    } catch (err: any) {
      setActionError(err.message || 'Error al cancelar la orden');
    }
  };

  return (
    <>
      {/* INPUTS DE ARCHIVOS MONTADOS SIEMPRE EN EL DOM (ACCESIBLES DESDE CUALQUIER TAB) */}
      <input
        type="file"
        ref={bocetoInputRef}
        accept="image/*"
        onChange={(e) => handleFileUpload(e, 'BOCETO_REFERENCIA')}
        className="hidden"
      />
      <input
        type="file"
        ref={calidadInputRef}
        accept="image/*"
        onChange={(e) => handleFileUpload(e, 'CONTROL_CALIDAD')}
        className="hidden"
      />

      <Modal
        isOpen={isOpen}
        onClose={handleModalClose}
        maxWidth="4xl"
        title={
          <div className="flex items-center space-x-3">
            {bocetoAttachment?.fileUrl && (
              <div
                onClick={() => setLightboxImage(bocetoAttachment)}
                className="w-10 h-10 rounded-lg overflow-hidden border border-[#DDE3E0] flex-shrink-0 cursor-pointer hover:border-[#176B52] transition shadow-2xs group relative"
                title="Clic para ampliar boceto"
              >
                <img
                  src={bocetoAttachment.fileUrl}
                  alt="Boceto"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                />
              </div>
            )}
            <span className="font-mono text-sm px-2.5 py-1 rounded bg-[#17211D] text-[#EDF5F2] font-bold">
              #{currentOrder.id.toUpperCase()}
            </span>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#17201D]">
                Ficha Técnica de Joya
              </h3>
              <p className="text-xs text-[#66736D]">
                Cliente: <strong className="text-[#17201D]">{currentOrder.client?.fullName}</strong>
              </p>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Mensajes de Alerta / Éxito Reactivos */}
          {actionError && (
            <div className="p-3.5 bg-[#FDECEA] border border-[#f9c5c0] rounded-xl flex items-start space-x-3 text-xs text-[#B42318] animate-in fade-in">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{actionError}</div>
              <button
                onClick={() => setActionError(null)}
                className="text-[#B42318] hover:opacity-75 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {actionSuccess && (
            <div className="p-3.5 bg-[#E6F5ED] border border-[#c1e7d4] rounded-xl flex items-start space-x-3 text-xs text-[#17734B] animate-in fade-in">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{actionSuccess}</div>
              <button
                onClick={() => setActionSuccess(null)}
                className="text-[#17734B] hover:opacity-75 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Banner de Estado & SLA */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#F4F6F8] border border-[#DDE3E0]">
            <div className="flex items-center space-x-3">
              <span className="text-xs text-[#66736D] uppercase font-bold tracking-wider">
                Fase de Taller:
              </span>
              <Badge
                variant={
                  currentOrder.status === 'ENTREGADO'
                    ? 'success'
                    : currentOrder.status === 'CALIDAD'
                    ? 'info'
                    : currentOrder.status === 'FABRICACION'
                    ? 'gold'
                    : 'neutral'
                }
                size="md"
              >
                {currentOrder.status}
              </Badge>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-[#66736D]">Entrega:</span>
              <span className={`text-xs px-2.5 py-1 rounded-full border ${sla.badgeClass}`}>
                {formatDate(currentOrder.estimatedDelivery)} ({sla.label})
              </span>
            </div>

            {/* Acciones de transición de estado */}
            <div className="flex items-center space-x-2">
              {currentOrder.status === 'CREADO' && (
                <Button
                  size="sm"
                  variant="gold"
                  onClick={() => handleTransition('FABRICACION')}
                  isLoading={updateStatusMutation.isPending}
                >
                  Pasar a Banco (Fabricación)
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              )}

              {currentOrder.status === 'FABRICACION' && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleTransition('CALIDAD')}
                  isLoading={updateStatusMutation.isPending}
                >
                  Finalizar & Control Calidad
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              )}

              {currentOrder.status === 'CALIDAD' && (
                <Button
                  size="sm"
                  variant={isPaidInFull ? 'primary' : 'outline'}
                  onClick={() => handleTransition('ENTREGADO')}
                  isLoading={updateStatusMutation.isPending}
                  className={!isPaidInFull ? 'border-[#B42318] text-[#B42318] hover:bg-[#FDECEA]' : ''}
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                  Formalizar Entrega al Cliente
                </Button>
              )}

              {currentOrder.status === 'ENTREGADO' && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setIsDeliveryActOpen(true)}
                  className="bg-[#176B52] hover:bg-[#125440] text-white font-bold shadow-xs"
                >
                  <FileCheck className="w-3.5 h-3.5 mr-1.5" />
                  Acta de Entrega Final
                </Button>
              )}
            </div>
          </div>

          {/* Pestañas de Navegación de la Ficha Técnica */}
          <div className="flex border-b border-[#DDE3E0] overflow-x-auto space-x-1">
            {[
              { id: 'general', label: '1. General' },
              { id: 'gallery', label: `2. Galería (${localAttachments.length || currentOrder.attachments?.length || 0})` },
              { id: 'materials', label: `3. Materia Prima (${currentOrder.materialsUsed?.length || 0})` },
              { id: 'metal', label: '4. Cierre Metalúrgico' },
              { id: 'payments', label: `5. Caja y Abonos (${currentOrder.payments?.length || 0})` },
              { id: 'history', label: '6. Historial de Estados' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-[#176B52] text-[#176B52] bg-[#E5F4EE]/40'
                    : 'border-transparent text-[#66736D] hover:text-[#17201D] hover:border-[#DDE3E0]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* BANNER OFICIAL DE ENTREGA A SATISFACCIÓN */}
              {currentOrder.status === 'ENTREGADO' && (
                <div className="p-4 bg-[#E6F5ED] border border-[#c1e7d4] rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#17734B] shadow-2xs">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-[#17734B]/15 text-[#17734B] flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <strong className="block text-sm font-bold text-[#17201D]">
                        Joya Entregada a Satisfacción del Cliente
                      </strong>
                      <span className="text-[11px] text-[#17734B]">
                        Cuenta liquidada en cero ($0) y metal noble garantizado. Puede volver a imprimir el Acta de Entrega y Liquidación Final oficial para soporte legal y contable.
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setIsDeliveryActOpen(true)}
                    className="bg-[#176B52] hover:bg-[#125440] text-white font-bold flex-shrink-0"
                  >
                    <FileCheck className="w-3.5 h-3.5 mr-1" />
                    Ver / Imprimir Acta Oficial
                  </Button>
                </div>
              )}

              {/* VISTA DESTACADA DEL BOCETO EN PESTAÑA GENERAL */}
              {bocetoAttachment ? (
                <div className="p-4 rounded-xl bg-white border border-[#DDE3E0] shadow-xs flex flex-col md:flex-row items-center gap-4">
                  <div
                    onClick={() => setLightboxImage(bocetoAttachment)}
                    className="w-full md:w-44 h-44 rounded-xl overflow-hidden border border-[#DDE3E0] bg-[#F4F6F8] flex-shrink-0 cursor-pointer relative group"
                  >
                    <img
                      src={bocetoAttachment.fileUrl}
                      alt={bocetoAttachment.fileName}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold">
                      <ZoomIn className="w-4 h-4 mr-1" />
                      Ampliar Boceto
                    </div>
                  </div>

                  <div className="flex-1 space-y-2 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#A57525] bg-[#FAF1DA] px-2.5 py-0.5 rounded-full border border-[#eedab1]">
                        Boceto de Referencia Aprobado
                      </span>
                    </div>
                    <h5 className="font-bold text-sm text-[#17201D]">{bocetoAttachment.fileName}</h5>
                    <p className="text-[#66736D] leading-relaxed">
                      Boceto técnico cargado para la producción de esta joya en taller. Haga clic en la fotografía para zoom detallado.
                    </p>
                    <div className="pt-1 flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => bocetoInputRef.current?.click()}
                        isLoading={uploadFileMutation.isPending || addAttachmentMutation.isPending}
                      >
                        <Upload className="w-3.5 h-3.5 mr-1" />
                        Cambiar / Actualizar Boceto
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setLightboxImage(bocetoAttachment)}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Ver en Grande
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => bocetoInputRef.current?.click()}
                  className="p-4 border-2 border-dashed border-[#DDE3E0] hover:border-[#176B52] bg-white rounded-xl text-center cursor-pointer transition flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-[#FAF1DA] text-[#A57525] flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-bold text-[#17201D] block">
                        Boceto de Referencia Pendiente
                      </span>
                      <span className="text-[11px] text-[#66736D]">
                        Sube la foto del diseño o render 3D para que el orfebre tenga la guía exacta en mesa de trabajo.
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="gold"
                    onClick={(e) => {
                      e.stopPropagation();
                      bocetoInputRef.current?.click();
                    }}
                    isLoading={uploadFileMutation.isPending || addAttachmentMutation.isPending}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1" />
                    Subir Boceto Ahora
                  </Button>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#66736D] flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#A57525]" />
                    <span>Ficha y Especificación Técnica de Orfebrería</span>
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FAF1DA] text-[#A57525] border border-[#eedab1] font-bold">
                    Estándar de Taller
                  </span>
                </div>

                <div className="rounded-xl bg-gradient-to-br from-white to-[#FAF1DA]/10 border border-[#DDE3E0] p-4 shadow-2xs space-y-3">
                  {(currentOrder.description || '').includes('|') ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {(currentOrder.description || '').split('|').map((part, pIdx) => {
                        const cleanPart = part.replace(/^Fabricación según cotización:\s*/i, '').trim();
                        const isMetal = cleanPart.toLowerCase().includes('oro') || cleanPart.toLowerCase().includes('plata');
                        const isStone = cleanPart.toLowerCase().includes('diamante') || cleanPart.toLowerCase().includes('esmeralda') || cleanPart.toLowerCase().includes('zafiro') || cleanPart.toLowerCase().includes('ct');
                        return (
                          <div
                            key={pIdx}
                            className="p-3 rounded-lg bg-white border border-[#E5E9E7] shadow-2xs flex items-start space-x-2.5"
                          >
                            <div className="p-1.5 rounded-md bg-[#FAF1DA] text-[#A57525] mt-0.5 flex-shrink-0">
                              {isMetal ? <Scale className="w-4 h-4" /> : isStone ? <Gem className="w-4 h-4 text-[#2457A6]" /> : <Hammer className="w-4 h-4 text-[#17734B]" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-[#9CA9A3] block">
                                {isMetal ? 'Metal Base Noble' : isStone ? 'Gema / Piedra' : 'Hechura / Detalle'}
                              </span>
                              <p className="text-xs font-semibold text-[#17201D] leading-snug">
                                {cleanPart}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3.5 bg-white rounded-lg border border-[#E5E9E7] text-sm text-[#17201D] leading-relaxed font-serif">
                      {currentOrder.description || 'Sin especificación detallada'}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                    <span className="px-2 py-0.5 rounded-md bg-[#E5F4EE] text-[#176B52] border border-[#c1e7d4] font-medium">
                      Control Técnico de Merma: 6.00%
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[#F4F6F8] text-[#66736D] border border-[#DDE3E0] font-medium">
                      Inspección Óptica 10x
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[#F4F6F8] text-[#66736D] border border-[#DDE3E0] font-medium">
                      Hechura Artesanal
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#F4F6F8] border border-[#DDE3E0]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#66736D] block mb-1">
                    Cliente & Contacto
                  </span>
                  <p className="text-sm font-bold text-[#17201D]">{currentOrder.client?.fullName}</p>
                  <p className="text-xs text-[#66736D] mt-0.5">{currentOrder.client?.phone}</p>
                  <p className="text-xs text-[#66736D]">{currentOrder.client?.email || 'Sin correo'}</p>
                  {currentOrder.client?.documentId && (
                    <span className="inline-block text-[10px] mt-2 font-mono bg-white px-2 py-0.5 rounded border border-[#DDE3E0]">
                      {currentOrder.client.documentId}
                    </span>
                  )}
                </div>

                {/* TARJETA REACTIVA DE ASIGNACIÓN DE JOYERO */}
                <div className="p-4 rounded-xl bg-[#F4F6F8] border border-[#DDE3E0] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#66736D] block">
                        Orfebre Asignado
                      </span>
                      {currentOrder.artisan && !isAssigningArtisan && (role === 'ADMIN' || role === 'ASESOR') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedArtisanId(currentOrder.artisanId || '');
                            setIsAssigningArtisan(true);
                          }}
                          className="text-[10px] text-[#176B52] hover:underline font-bold"
                        >
                          Reasignar
                        </button>
                      )}
                    </div>

                    {!currentOrder.artisan && !isAssigningArtisan ? (
                      <div className="mt-1">
                        <span className="text-xs font-bold text-[#B42318] block">Sin joyero asignado</span>
                        <p className="text-[11px] text-[#66736D] mt-0.5">Requerido para pasar a banco</p>
                        <Button
                          size="sm"
                          variant="gold"
                          onClick={() => setIsAssigningArtisan(true)}
                          className="mt-2 w-full text-xs"
                        >
                          <User className="w-3.5 h-3.5 mr-1" />
                          Asignar Joyero
                        </Button>
                      </div>
                    ) : isAssigningArtisan ? (
                      <div className="space-y-2 mt-1">
                        <select
                          value={selectedArtisanId}
                          onChange={(e) => setSelectedArtisanId(e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-[#DDE3E0] rounded-lg font-medium text-[#17201D] focus:outline-none focus:border-[#176B52]"
                        >
                          <option value="">Seleccione un orfebre...</option>
                          {artisans.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.fullName}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center space-x-1.5">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={handleAssignArtisanSubmit}
                            isLoading={assignArtisanMutation.isPending}
                            className="flex-1 text-xs"
                          >
                            <Check className="w-3.5 h-3.5 mr-1" />
                            Confirmar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setIsAssigningArtisan(false)}
                            className="text-xs"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className="w-6 h-6 rounded-full bg-[#E5F4EE] text-[#176B52] flex items-center justify-center font-bold text-[10px]">
                            {currentOrder.artisan?.fullName?.charAt(0) || 'J'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#17201D]">
                              {currentOrder.artisan?.fullName}
                            </p>
                            <p className="text-[10px] text-[#17734B] font-semibold flex items-center mt-0.5">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Orfebre asignado y activo en mesa
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#F4F6F8] border border-[#DDE3E0]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#66736D] block mb-1">
                    Resumen Financiero
                  </span>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#66736D]">Total Pactado:</span>
                      <strong className="text-[#17201D]">{formatCurrency(currentOrder.totalPactado)}</strong>
                    </div>
                    <div className="flex justify-between text-[#17734B]">
                      <span>Abonado:</span>
                      <strong>{formatCurrency(totalAbonado)}</strong>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-[#DDE3E0] font-bold text-[#B42318]">
                      <span>Saldo Pendiente:</span>
                      <strong>{formatCurrency(saldoPendiente)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botón de Cancelación Protegida */}
              {currentOrder.status !== 'ENTREGADO' && currentOrder.status !== 'CANCELADO' && (
                <div className="pt-4 border-t border-[#DDE3E0] flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#B42318] hover:bg-[#FDECEA]"
                    onClick={() => setIsCancelConfirmOpen(true)}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />
                    Cancelar esta Orden de Trabajo
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GALERÍA MULTIMEDIA */}
          {activeTab === 'gallery' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#66736D]">
                  Bocetos, renders 3D y fotografías de microscopio para inspección de microengaste. Haz clic en cualquier foto para zoom detallado.
                </p>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => bocetoInputRef.current?.click()}
                    isLoading={uploadFileMutation.isPending || addAttachmentMutation.isPending}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1" />
                    Subir Boceto
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => calidadInputRef.current?.click()}
                    isLoading={uploadFileMutation.isPending || addAttachmentMutation.isPending}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1" />
                    Foto Calidad
                  </Button>
                </div>
              </div>

              {localAttachments.length === 0 ? (
                <div
                  onClick={() => bocetoInputRef.current?.click()}
                  className="p-8 border-2 border-dashed border-[#DDE3E0] hover:border-[#176B52] bg-white rounded-xl text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2"
                >
                  <Upload className="w-8 h-8 text-[#9CA9A3]" />
                  <p className="text-xs font-bold text-[#17201D]">No hay fotos adjuntas todavía</p>
                  <p className="text-[11px] text-[#66736D]">Haz clic aquí o usa los botones de arriba para subir el boceto o foto de control de calidad.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {localAttachments.map((att) => (
                    <div
                      key={att.id}
                      onClick={() => setLightboxImage(att)}
                      className="group relative rounded-xl overflow-hidden border border-[#DDE3E0] bg-white cursor-pointer hover:shadow-lg transition-all"
                    >
                      <div className="aspect-square bg-[#F4F6F8] overflow-hidden">
                        <img
                          src={att.fileUrl}
                          alt={att.fileName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-3 bg-white">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase font-bold text-[#A57525] bg-[#FAF1DA] px-2 py-0.5 rounded">
                            {att.fileType.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-[#9CA9A3]">
                            {formatDate(att.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-[#17201D] truncate">
                          {att.fileName}
                        </p>
                        {att.description && (
                          <p className="text-[11px] text-[#66736D] line-clamp-1 mt-0.5">
                            {att.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MATERIA PRIMA CONSUMIDA CON VALIDACIÓN INTELIGENTE */}
          {activeTab === 'materials' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#66736D]">
                    Gramos de metal fino y gemas asignadas y despachadas desde bodega central para esta pieza.
                  </p>
                  {orderRequirements.requiredGrams > 0 && (
                    <p className="text-[11px] text-[#A57525] font-semibold mt-0.5">
                      Requerimiento técnico de la pieza: {orderRequirements.requiredGrams.toFixed(2)} g brutos para fundición
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="gold"
                  onClick={() => setIsDispatchModalOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Despachar Materia Prima
                </Button>
              </div>

              {/* Formulario de despacho de materia prima con validación */}
              {isDispatchModalOpen && (
                <div className="p-4 rounded-xl border border-[#eedab1] bg-[#FAF1DA]/40 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#A57525] uppercase tracking-wider flex items-center space-x-1.5">
                      <Scale className="w-4 h-4" />
                      <span>Despachar Materia Prima de Bodega al Joyero</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsDispatchModalOpen(false)}
                      className="text-xs text-[#66736D] hover:text-[#17201D]"
                    >
                      Cerrar
                    </button>
                  </div>

                  {/* Resumen del estado de despacho del material seleccionado */}
                  {materialDispatchStats && (
                    <div className="p-3 bg-white rounded-lg border border-[#eedab1] text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[#66736D]">Material seleccionado:</span>
                        <strong className="text-[#17201D]">{selectedDispatchMaterial?.name}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#66736D]">Ya despachado previamente:</span>
                        <strong className="text-[#17734B]">{materialDispatchStats.yaDespachado.toFixed(3)} {selectedDispatchMaterial?.unit}</strong>
                      </div>
                      {materialDispatchStats.targetQty > 0 && (
                        <div className="flex justify-between">
                          <span className="text-[#66736D]">Pendiente por entregar al joyero:</span>
                          <div className="flex items-center space-x-2">
                            <strong className="text-[#B42318]">{materialDispatchStats.pendiente.toFixed(3)} {selectedDispatchMaterial?.unit}</strong>
                            {materialDispatchStats.pendiente > 0 && (
                              <button
                                type="button"
                                onClick={() => setDispatchQuantity(materialDispatchStats.pendiente.toFixed(3))}
                                className="text-[10px] text-[#176B52] bg-[#E5F4EE] px-1.5 py-0.5 rounded font-bold hover:underline"
                              >
                                Usar valor pendiente
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Alerta de advertencia en tiempo real */}
                  {dispatchWarning && (
                    <div
                      className={`p-3 rounded-lg text-xs flex items-start space-x-2 ${
                        dispatchWarning.type === 'incompatible'
                          ? 'bg-[#FDECEA] text-[#B42318] border border-[#f9c5c0]'
                          : 'bg-[#FFF4D6] text-[#9A6700] border border-[#fce49f]'
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{dispatchWarning.message}</span>
                    </div>
                  )}

                  <form onSubmit={handleDispatchMaterialSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-[#66736D] uppercase mb-1">
                        Material de Bodega
                      </label>
                      <select
                        value={dispatchMaterialId}
                        onChange={(e) => {
                          const matId = e.target.value;
                          setDispatchMaterialId(matId);
                          // Auto pre-llenar con valor pendiente correspondiente (metal o piedra)
                          const mat = materials.find((m) => m.id === matId);
                          const req = orderRequirements.materialRequirements.get(matId);
                          if (mat && req && req.targetQty > 0) {
                            const ya = (currentOrder.materialsUsed || [])
                              .filter((m) => m.materialId === matId)
                              .reduce((sum, curr) => sum + Number(curr.quantity), 0);
                            const pend = Math.max(0, req.targetQty - ya);
                            if (pend > 0) {
                              setDispatchQuantity(pend.toFixed(3));
                            }
                          } else if (mat && (mat.unit === 'GRAMOS' || mat.type !== 'PIEDRA_PRECIOSA') && orderRequirements.requiredGrams > 0) {
                            const ya = (currentOrder.materialsUsed || [])
                              .filter((m) => m.materialId === matId)
                              .reduce((sum, curr) => sum + Number(curr.quantity), 0);
                            const pend = Math.max(0, orderRequirements.requiredGrams - ya);
                            if (pend > 0) setDispatchQuantity(pend.toFixed(3));
                          }
                        }}
                        required
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DDE3E0] rounded-lg text-[#17201D] font-medium focus:outline-none focus:border-[#176B52]"
                      >
                        <option value="">Seleccione material...</option>
                        {orderRequirements.requiredMaterials.length > 0 && (
                          <optgroup label="✨ Materiales Requeridos por esta Joya">
                            {orderRequirements.requiredMaterials.map((m) => {
                              const req = orderRequirements.materialRequirements.get(m.id);
                              return (
                                <option key={m.id} value={m.id}>
                                  ⭐ {m.name} {req ? `[Req: ${req.targetQty} ${m.unit}]` : ''} (Stock: {m.stock} {m.unit})
                                </option>
                              );
                            })}
                          </optgroup>
                        )}
                        <optgroup label="📦 Otros Materiales en Bodega">
                          {materials
                            .filter((m) => !orderRequirements.matchingIds.has(m.id))
                            .map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} (Stock: {m.stock} {m.unit})
                              </option>
                            ))}
                        </optgroup>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#66736D] uppercase mb-1">
                        Cantidad a Entregar ({selectedDispatchMaterial?.unit || 'g/ct'})
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0.001"
                        placeholder="Ej. 10.600"
                        value={dispatchQuantity}
                        onChange={(e) => setDispatchQuantity(e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DDE3E0] rounded-lg font-mono focus:outline-none focus:border-[#176B52]"
                      />
                    </div>

                    <div className="flex items-end">
                      <Button
                        type="submit"
                        size="sm"
                        variant="primary"
                        className="w-full"
                        isLoading={consumeMaterialMutation.isPending}
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Despachar a la Orden
                      </Button>
                    </div>

                    {materialDispatchStats && materialDispatchStats.isRelated && materialDispatchStats.targetQty > 0 && (
                      <div className="sm:col-span-3 text-[11px] font-medium text-[#176B52] bg-[#E5F4EE] px-3 py-1.5 rounded-lg border border-[#c1e7d4] flex flex-wrap items-center justify-between gap-2">
                        <span>
                          Requerido para la joya: <strong>{materialDispatchStats.targetQty} {materialDispatchStats.unit}</strong>
                          {' · '}Ya entregado a mesa: <strong>{materialDispatchStats.yaDespachado} {materialDispatchStats.unit}</strong>
                        </span>
                        <span>
                          Pendiente por despachar: <strong className="font-bold text-[#17734B]">{materialDispatchStats.pendiente} {materialDispatchStats.unit}</strong>
                        </span>
                      </div>
                    )}
                  </form>
                </div>
              )}

              {/* Tabla reactiva de materiales entregados */}
              <div className="bg-white border border-[#DDE3E0] rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto w-full">
                  <table className="w-full min-w-[550px] text-xs text-left">
                    <thead className="bg-[#F4F6F8] border-b border-[#DDE3E0] text-[#66736D] uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4 whitespace-nowrap">Material / Gema</th>
                        <th className="py-3 px-4 whitespace-nowrap">Tipo</th>
                        <th className="py-3 px-4 text-right whitespace-nowrap">Cantidad Entregada</th>
                        <th className="py-3 px-4 text-right whitespace-nowrap">Unidad</th>
                        <th className="py-3 px-4 text-right whitespace-nowrap">Fecha Despacho</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DDE3E0]">
                      {(currentOrder.materialsUsed || []).map((item) => (
                        <tr key={item.id} className="hover:bg-[#F4F6F8]/50">
                          <td className="py-3 px-4 font-semibold text-[#17201D] whitespace-nowrap flex items-center space-x-1.5">
                            {item.material?.unit === 'KILATES' || item.material?.type === 'PIEDRA_PRECIOSA' ? (
                              <Gem className="w-3.5 h-3.5 text-[#2457A6]" />
                            ) : (
                              <Scale className="w-3.5 h-3.5 text-[#A57525]" />
                            )}
                            <span>{item.material?.name || 'Material'}</span>
                          </td>
                          <td className="py-3 px-4 text-[#66736D] whitespace-nowrap">
                            {item.material?.type}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-[#17201D] whitespace-nowrap">
                            {formatGrams(item.quantity, '')}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-[#66736D] whitespace-nowrap">
                            {item.material?.unit}
                          </td>
                          <td className="py-3 px-4 text-right text-[#9CA9A3] whitespace-nowrap">
                            {formatDate(item.createdAt)}
                          </td>
                        </tr>
                      ))}
                      {(!currentOrder.materialsUsed || currentOrder.materialsUsed.length === 0) && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-[#9CA9A3]">
                            No se han registrado consumos de bodega aún para esta orden.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CIERRE METALÚRGICO ESTRICTO (METALES NOBLES VS GEMAS) */}
          {activeTab === 'metal' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#FAF1DA] border border-[#eedab1] text-xs text-[#A57525] flex items-center justify-between">
                <div>
                  <h5 className="font-bold">Protocolo de Balanza y Control de Mermas</h5>
                  <p className="mt-0.5 text-[#9A6700]">
                    Balance exclusivo de metales nobles: Merma = Metal Entregado - (Joya Terminada + Limalla Devuelta).
                  </p>
                </div>
                {onOpenMetalReturn && (
                  <Button
                    variant="gold"
                    size="sm"
                    onClick={() => onOpenMetalReturn(currentOrder)}
                  >
                    Registrar Liquidación de Mesa
                  </Button>
                )}
              </div>

              {/* Desglose de Gemas si existen en el pedido */}
              {gemMaterialsUsed.length > 0 && (
                <div className="p-3.5 bg-[#EAF1FC] border border-[#b8d0f7] rounded-xl text-xs text-[#2457A6] flex items-start space-x-2.5">
                  <Gem className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Piedras y Gemas Asignadas ({gemMaterialsUsed.length} tipo(s)):</strong>
                    <p className="text-[11px] mt-0.5 text-[#3b6db3]">
                      {gemMaterialsUsed.map((g) => `${g.quantity} ${g.material?.unit || 'ct'} de ${g.material?.name || 'Gema'}`).join(', ')}.
                    </p>
                    <p className="text-[10px] text-[#2457A6] font-semibold mt-1">
                      ℹ️ Regla de Orfebrería: Las gemas pasan directamente a la mesa de microengaste y NO se computan en el peso del metal para fundición ni en la merma metalúrgica.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white border border-[#DDE3E0] shadow-xs">
                  <span className="text-[10px] font-bold text-[#66736D] uppercase">
                    Metal Noble Total Entregado
                  </span>
                  <p className="text-xl font-mono font-bold text-[#17201D] mt-1">
                    {formatGrams(totalMetalGrams)}
                  </p>
                  <p className="text-[11px] text-[#9CA9A3] mt-1">Pesaje exclusivo de metal fundido (Oro/Plata)</p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-[#DDE3E0] shadow-xs">
                  <span className="text-[10px] font-bold text-[#66736D] uppercase">
                    Umbral Máximo de Merma
                  </span>
                  <p className="text-xl font-mono font-bold text-[#A57525] mt-1">
                    8.00 %
                  </p>
                  <p className="text-[11px] text-[#9CA9A3] mt-1">Tolerancia técnica de fundición y limado</p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-[#DDE3E0] shadow-xs">
                  <span className="text-[10px] font-bold text-[#66736D] uppercase">
                    Destino de Limalla
                  </span>
                  <p className="text-xl font-mono font-bold text-[#17734B] mt-1">
                    Retorno Automático
                  </p>
                  <p className="text-[11px] text-[#9CA9A3] mt-1">Se reingresa a bodega al liquidar</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CAJA Y ABONOS */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[#17201D]">Historial de Pagos y Caja</h4>
                  <p className="text-xs text-[#66736D]">
                    Saldo pendiente por liquidar: <strong>{formatCurrency(saldoPendiente)}</strong>
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {(isPaidInFull || currentOrder.status === 'ENTREGADO') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsDeliveryActOpen(true)}
                      className="text-[#176B52] border-[#176B52] hover:bg-[#E5F4EE] font-bold text-xs"
                    >
                      <Award className="w-3.5 h-3.5 mr-1" />
                      Acta de Entrega & Liquidación
                    </Button>
                  )}
                  {saldoPendiente > 0 && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setIsPaymentModalOpen(true)}
                    >
                      <DollarSign className="w-4 h-4 mr-1" />
                      Registrar Nuevo Abono
                    </Button>
                  )}
                </div>
              </div>

              {isPaidInFull && (
                <div className="p-3.5 bg-[#E6F5ED] border border-[#c1e7d4] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#17734B]">
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span>
                      <strong>Joya 100% Pagada (Paz y Salvo):</strong> La cuenta está totalmente saldada. Puede generar el <strong>Acta de Entrega y Liquidación Final</strong> oficial para la firma del cliente al entregar la joya física.
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setIsDeliveryActOpen(true)}
                    className="bg-[#176B52] hover:bg-[#125440] text-white flex-shrink-0 ml-auto"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1" />
                    Imprimir Acta
                  </Button>
                </div>
              )}

              <div className="bg-white border border-[#DDE3E0] rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto w-full">
                  <table className="w-full min-w-[600px] text-xs text-left">
                    <thead className="bg-[#F4F6F8] border-b border-[#DDE3E0] text-[#66736D] uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4 whitespace-nowrap">Fecha</th>
                        <th className="py-3 px-4 whitespace-nowrap">Método</th>
                        <th className="py-3 px-4 whitespace-nowrap">Registrado Por</th>
                        <th className="py-3 px-4 whitespace-nowrap">Referencia / Notas</th>
                        <th className="py-3 px-4 text-right whitespace-nowrap">Monto</th>
                        <th className="py-3 px-4 text-center whitespace-nowrap">Comprobante</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DDE3E0]">
                      {(activePayments || []).map((pay) => (
                        <tr key={pay.id} className="hover:bg-[#F4F6F8]/50">
                          <td className="py-3 px-4 text-[#17201D] font-mono whitespace-nowrap">
                            {formatDate(pay.createdAt)}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EEF1F0] text-[#17201D]">
                              {pay.paymentMethod}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[#66736D] whitespace-nowrap">
                            {pay.registeredBy?.fullName || 'Caja Alkisu'}
                          </td>
                          <td className="py-3 px-4 text-[#66736D]">
                            {pay.referenceNotes || 'Abono a orden'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-[#17734B] whitespace-nowrap">
                            {formatCurrency(pay.amount)}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <button
                              onClick={() =>
                                setReceiptPayment({
                                  ...pay,
                                  orderId: currentOrder.id,
                                  client: currentOrder.client,
                                })
                              }
                              className="p-1 text-[#176B52] hover:bg-[#E5F4EE] rounded"
                              title="Ver recibo imprimible"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {(!activePayments || activePayments.length === 0) && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-[#9CA9A3]">
                            No hay abonos registrados para esta joya.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: HISTORIAL DE ESTADOS INMUTABLE */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <p className="text-xs text-[#66736D]">
                Línea de tiempo inmutable con registro cronológico de usuarios, cambios de estado y notas de taller.
              </p>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#DDE3E0]">
                {(currentOrder.statusHistory || []).map((sh, idx) => (
                  <div key={sh.id || idx} className="relative">
                    <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-[#176B52] border-2 border-white shadow-xs" />
                    <div className="bg-white p-3.5 rounded-xl border border-[#DDE3E0] shadow-xs">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-[#17201D]">
                            {sh.fromStatus} → {sh.toStatus}
                          </span>
                          <span className="text-[10px] text-[#66736D]">
                            por {sh.user?.fullName || 'Sistema'}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#9CA9A3]">
                          {formatDate(sh.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-[#66736D]">{sh.note || 'Actualización de fase'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* MODAL PARA REGISTRAR ABONO */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        maxWidth="md"
        title="Registrar Abono a la Orden"
      >
        <form onSubmit={handleRegisterPayment} className="space-y-4">
          <div className="p-3 rounded-lg bg-[#FAF1DA] text-[#A57525] text-xs">
            Saldo pendiente actual: <strong>{formatCurrency(saldoPendiente)}</strong>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17201D] mb-1">
              Monto a Abonar (COP)
            </label>
            <input
              type="number"
              min="1000"
              max={saldoPendiente}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="Ej: 3000000"
              className="w-full px-3 py-2 text-sm border border-[#DDE3E0] rounded-lg focus:outline-none focus:border-[#176B52]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17201D] mb-1">
              Método de Pago
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full px-3 py-2 text-sm border border-[#DDE3E0] rounded-lg focus:outline-none focus:border-[#176B52]"
            >
              <option value="TRANSFERENCIA">Transferencia Bancaria</option>
              <option value="EFECTIVO">Efectivo en Mostrador</option>
              <option value="TARJETA">Tarjeta Débito/Crédito</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17201D] mb-1">
              Comprobante / Referencia
            </label>
            <input
              type="text"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="Ej: Aprobación #88412 Bancolombia"
              className="w-full px-3 py-2 text-sm border border-[#DDE3E0] rounded-lg focus:outline-none focus:border-[#176B52]"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPaymentModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={addPaymentMutation.isPending}>
              Guardar Abono & Imprimir
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL DE COMPROBANTE OFICIAL IMPRIMIBLE DE ALTA JOYERÍA */}
      <Modal
        isOpen={!!receiptPayment}
        onClose={() => setReceiptPayment(null)}
        maxWidth="4xl"
        title={
          <div className="flex items-center justify-between w-full">
            <span className="font-serif font-bold text-base text-[#17201D]">
              Comprobante Oficial de Caja - Alkisu Joyería
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#E6F5ED] text-[#17734B] font-bold">
              Abono Registrado
            </span>
          </div>
        }
      >
        {receiptPayment && (
          <div className="space-y-6">
            {/* DOCUMENTO IMPRIMIBLE AISLADO MEDIANTE ID PRINTABLE-RECEIPT-AREA */}
            <div
              id="printable-receipt-area"
              className="p-8 bg-white border border-[#DDE3E0] rounded-xl text-[#17201D] font-sans shadow-sm space-y-6"
            >
              {/* Encabezado y membrete de marca */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-[#17211D] pb-5 gap-4">
                <div>
                  <h2 className="font-serif text-2xl font-black tracking-widest text-[#17211D] uppercase">
                    ALKISU JOYERÍA
                  </h2>
                  <p className="text-xs font-semibold text-[#A57525] tracking-wider uppercase mt-0.5">
                    Taller de Alta Gama & Orfebrería Fina
                  </p>
                  <p className="text-[11px] text-[#66736D] mt-1 font-mono">
                    NIT: 901.442.189-1 | No responsable de IVA
                  </p>
                  <p className="text-[11px] text-[#66736D]">
                    Sedes de Taller: Medellín - Bogotá, Colombia
                  </p>
                </div>
                <div className="sm:text-right bg-[#FAF1DA]/60 p-3.5 rounded-xl border border-[#eedab1] min-w-[200px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#A57525] block">
                    RECIBO DE CAJA OFICIAL
                  </span>
                  <span className="font-mono text-base font-bold text-[#17211D] block mt-0.5">
                    REC-{(receiptPayment.id || '0000').slice(-6).toUpperCase()}
                  </span>
                  <span className="text-[11px] text-[#66736D] block mt-1">
                    Fecha: {new Date(receiptPayment.createdAt || Date.now()).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Información del Cliente y Orden */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-[#F4F6F8] p-4 rounded-xl border border-[#DDE3E0]">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#66736D] block">
                    DATOS DEL CLIENTE
                  </span>
                  <p className="font-bold text-sm text-[#17201D]">
                    {receiptPayment.client?.fullName || currentOrder.client?.fullName || 'Cliente Alkisu'}
                  </p>
                  <p className="text-[#66736D]">
                    CC/NIT: <strong className="text-[#17201D] font-mono">{receiptPayment.client?.documentId || currentOrder.client?.documentId || 'No registrado'}</strong>
                  </p>
                  <p className="text-[#66736D]">
                    Teléfono: <strong className="text-[#17201D]">{receiptPayment.client?.phone || currentOrder.client?.phone || 'No registrado'}</strong>
                  </p>
                </div>

                <div className="space-y-1 sm:text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#66736D] block">
                    REFERENCIA TÉCNICA DE ORDEN
                  </span>
                  <p className="font-mono font-bold text-sm text-[#17201D]">
                    #ORD-{((receiptPayment.orderId || currentOrder.id).length > 8 ? (receiptPayment.orderId || currentOrder.id).slice(-5) : (receiptPayment.orderId || currentOrder.id)).toUpperCase()}
                  </p>
                  <span className="text-[9px] text-[#66736D] font-mono block break-all">
                    ID: {receiptPayment.orderId || currentOrder.id}
                  </span>
                  <p className="text-[#66736D]">
                    Fase: <strong className="text-[#176B52]">{currentOrder.status}</strong>
                  </p>
                  <p className="text-[#66736D]">
                    Fecha estimada de entrega:{' '}
                    <strong className="text-[#17201D] font-mono">
                      {currentOrder.estimatedDelivery
                        ? new Date(currentOrder.estimatedDelivery).toLocaleDateString('es-CO', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })
                        : 'Por acordar'}
                    </strong>
                  </p>
                  <p className="text-[#66736D]">
                    Orfebre: <strong className="text-[#17201D]">{currentOrder.artisan?.fullName || 'Taller Central Alkisu'}</strong>
                  </p>
                </div>
              </div>

              {/* Tabla de Desglose del Abono */}
              <div className="border border-[#DDE3E0] rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-[#17211D] text-[#EDF5F2] uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4 text-left w-1/2">Concepto & Especificación Técnica</th>
                      <th className="py-2.5 px-3 text-center w-1/6">Método de Pago</th>
                      <th className="py-2.5 px-3 text-right w-1/6">Comprobante / Ref</th>
                      <th className="py-2.5 px-4 text-right w-1/6">Valor Abonado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDE3E0]">
                    <tr>
                      <td className="py-3 px-4 font-semibold text-[#17201D] align-top">
                        <span className="block font-bold text-xs text-[#17201D] mb-1.5">
                          Abono a orden de fabricación de orfebrería personalizada
                        </span>
                        <div className="text-[11px] font-normal text-[#36413C] bg-[#F4F6F8] p-3 rounded-lg border border-[#DDE3E0] leading-relaxed">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#A57525] block mb-1.5">
                            Detalle de la joya:
                          </span>
                          {cleanReceiptItems.length > 0 ? (
                            <ul className="space-y-1">
                              {cleanReceiptItems.map((item, idx) => (
                                <li key={idx} className="flex items-start">
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#176B52] mt-1.5 mr-2 flex-shrink-0" />
                                  <span className="text-[#17201D]">{item}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-[#17201D]">{currentOrder.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center align-top pt-4">
                        <span className="px-2.5 py-1 rounded font-bold text-[10px] bg-[#EEF1F0] text-[#17201D] border border-[#DDE3E0]">
                          {receiptPayment.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[#66736D] align-top pt-4">
                        {receiptPayment.referenceNotes || 'Pago en caja'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-base font-bold text-[#17734B] align-top pt-4 whitespace-nowrap">
                        {formatCurrency(receiptPayment.amount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Resumen Financiero Consolidado */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[#F4F6F8] rounded-xl border border-[#DDE3E0] font-mono text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#66736D] block">
                    TOTAL PACTADO
                  </span>
                  <span className="text-sm font-bold text-[#17201D] block mt-0.5">
                    {formatCurrency(currentOrder.totalPactado)}
                  </span>
                </div>
                <div className="sm:text-center">
                  <span className="text-[10px] uppercase font-bold text-[#17734B] block">
                    TOTAL ABONADO A LA FECHA
                  </span>
                  <span className="text-sm font-bold text-[#17734B] block mt-0.5">
                    {formatCurrency(totalAbonado)}
                  </span>
                </div>
                <div className="sm:text-right">
                  <span className="text-[10px] uppercase font-bold text-[#B42318] block">
                    SALDO PENDIENTE
                  </span>
                  <span className="text-sm font-bold text-[#B42318] block mt-0.5">
                    {formatCurrency(saldoPendiente)}
                  </span>
                  <span className="text-[10px] text-[#66736D] italic block mt-0.5 font-sans">
                    {saldoPendiente > 0 ? 'Exigible contra entrega de la pieza terminada' : 'Cancelado en su totalidad'}
                  </span>
                </div>
              </div>

              {/* Cláusulas y Firmas */}
              <div className="pt-2 border-t border-[#DDE3E0] space-y-6">
                <p className="text-[10px] text-[#66736D] leading-relaxed text-justify">
                  Este comprobante certifica el abono recibido para la confección artesanal de la pieza orfebre detallada en la orden. Los metales preciosos son garantizados en su ley oficial (Oro 18K Ley 750 / Plata Ley 925).{' '}
                  <strong className="text-[#17201D]">
                    Por tratarse de una pieza personalizada y sobre medida, en caso de desistimiento unilateral por parte del cliente, se retendrán los costos incurridos por diseño 3D, mano de obra y merma de fundición.
                  </strong>{' '}
                  La entrega final requiere la cancelación del 100% del saldo pactado.
                </p>

                <div className="grid grid-cols-2 gap-8 pt-4">
                  <div className="space-y-2">
                    <div className="border-b border-[#17211D] h-10 w-full" />
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-[#17201D]">
                          Alkisu Joyería Artesanal
                        </span>
                        <span className="text-[9px] uppercase tracking-wider text-[#66736D]">
                          Caja Autorizada
                        </span>
                      </div>
                      <span className="text-[9px] uppercase tracking-wider text-[#66736D] block">
                        Responsable de Caja & Entrega
                      </span>
                      <div className="pt-2 space-y-1.5 text-[10px] text-[#17201D]">
                        <p className="flex items-center">
                          <span className="w-36 font-medium text-[#66736D]">Nombre de quien entrega:</span>
                          <span className="border-b border-[#17211D]/40 flex-1 h-3.5"></span>
                        </p>
                        <p className="flex items-center">
                          <span className="w-36 font-medium text-[#66736D]">Fecha Emisión:</span>
                          <span className="border-b border-[#17211D]/40 flex-1 h-3.5 font-mono text-[#17201D]">
                            {new Date(receiptPayment.createdAt || Date.now()).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="border-b border-[#17211D] h-10 w-full" />
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-[#17201D]">
                          {receiptPayment.client?.fullName || currentOrder.client?.fullName || 'Cliente Alkisu'}
                        </span>
                        <span className="text-[9px] uppercase tracking-wider text-[#66736D]">
                          Aceptación y Recibo Conforme
                        </span>
                      </div>
                      <span className="text-[9px] uppercase tracking-wider text-[#66736D] block">
                        Firma de Aceptación del Cliente
                      </span>
                      <div className="pt-2 space-y-1.5 text-[10px] text-[#17201D]">
                        <p className="flex items-center">
                          <span className="w-36 font-medium text-[#66736D]">C.C. N.°:</span>
                          <span className="border-b border-[#17211D]/40 flex-1 h-3.5 font-mono text-[#17201D] font-bold">
                            {receiptPayment.client?.documentId || currentOrder.client?.documentId || ''}
                          </span>
                        </p>
                        <p className="flex items-center">
                          <span className="w-36 font-medium text-[#66736D]">Fecha de recibido:</span>
                          <span className="border-b border-[#17211D]/40 flex-1 h-3.5 font-mono text-[#17201D]">
                            {new Date(receiptPayment.createdAt || Date.now()).toLocaleDateString('es-CO', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </span>
                        </p>
                        <div className="pt-2 flex justify-end">
                          <div className="w-20 h-24 border-2 border-dashed border-[#17211D]/40 rounded-lg flex flex-col items-center justify-center p-1 bg-white">
                            <Fingerprint className="w-7 h-7 text-[#17211D]/25 mb-1" />
                            <span className="text-[8px] uppercase tracking-wider text-[#66736D] font-bold text-center leading-tight">
                              Huella
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Aclaración tributaria al pie (Blindaje frente a la DIAN) */}
                <div className="pt-3 border-t border-[#DDE3E0] text-center">
                  <p className="text-[10px] text-[#66736D] italic">
                    "Este documento constituye un recibo de caja interno y comprobante de abono. No equivale ni reemplaza la factura de venta ni da derecho a costos o deducciones tributarias."
                  </p>
                </div>
              </div>
            </div>

            {/* Botones de Acción (Ocultos en la impresión mediante clase no-print) */}
            <div className="flex justify-end space-x-3 pt-2 no-print">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReceiptPayment(null)}
              >
                Cerrar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const origOverflow = document.body.style.overflow;
                  document.body.style.overflow = 'visible';
                  window.print();
                  setTimeout(() => {
                    document.body.style.overflow = origOverflow;
                  }, 1000);
                }}
                className="font-bold shadow-md"
              >
                <Printer className="w-4 h-4 mr-1.5" />
                Imprimir Recibo Oficial
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* CONFIRMACIÓN DE CANCELACIÓN DESTRUCCIÓN PROTEGIDA */}
      <Modal
        isOpen={isCancelConfirmOpen}
        onClose={() => setIsCancelConfirmOpen(false)}
        maxWidth="md"
        title="Confirmar Cancelación de la Orden"
      >
        <div className="space-y-4">
          <div className="p-3 bg-[#FDECEA] border border-[#f9c5c0] rounded-lg text-xs text-[#B42318] flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              Esta acción detendrá la producción técnica y registrará la cancelación en el libro de auditoría inmutable.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17201D] mb-1">
              Motivo de la Cancelación:
            </label>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ej: Desistimiento por parte del cliente antes de corte..."
              className="w-full px-3 py-2 text-xs border border-[#DDE3E0] rounded-lg focus:outline-none focus:border-[#B42318]"
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCancelConfirmOpen(false)}
            >
              Volver
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancel}
              isLoading={cancelOrderMutation.isPending}
            >
              Confirmar Cancelación
            </Button>
          </div>
        </div>
      </Modal>

      {/* LIGHTBOX CON ZOOM PARA INSPECCIÓN */}
      <Lightbox
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
        imageUrl={lightboxImage?.fileUrl || ''}
        title={lightboxImage?.fileName}
        description={lightboxImage?.description || undefined}
      />

      {/* ACTA DE ENTREGA Y COMPROBANTE DE LIQUIDACIÓN FINAL */}
      <DeliveryActModal
        order={currentOrder}
        isOpen={isDeliveryActOpen}
        onClose={() => setIsDeliveryActOpen(false)}
        cleanItems={cleanReceiptItems}
      />
    </>
  );
};

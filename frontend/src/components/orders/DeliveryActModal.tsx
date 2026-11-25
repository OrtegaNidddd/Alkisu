import React, { useState, useMemo, useEffect } from 'react';
import { Order } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Printer,
  FileCheck,
  CheckCircle2,
  Scale,
  Gem,
  Award,
  Edit2,
  Check,
  ShieldCheck,
  Clock,
  Sparkles,
  Fingerprint,
} from 'lucide-react';

interface DeliveryActModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  cleanItems?: string[];
}

export const DeliveryActModal: React.FC<DeliveryActModalProps> = ({
  order,
  isOpen,
  onClose,
  cleanItems = [],
}) => {
  if (!order) return null;

  // Extracción inteligente de valores iniciales a partir de la orden
  const extractedDefaults = useMemo(() => {
    const desc = order.description || '';
    const descLower = desc.toLowerCase();

    // 1. Metal y Ley
    let metal = 'Oro 18K (Ley 750)';
    if (descLower.includes('oro amarillo') || descLower.includes('amarillo 18k')) {
      metal = 'Oro Amarillo 18K (Ley 750)';
    } else if (descLower.includes('oro blanco') || descLower.includes('blanco 18k')) {
      metal = 'Oro Blanco 18K (Ley 750)';
    } else if (descLower.includes('oro rosa') || descLower.includes('rosa 18k')) {
      metal = 'Oro Rosa 18K (Ley 750)';
    } else if (descLower.includes('14k')) {
      metal = 'Oro 14K (Ley 585)';
    } else if (descLower.includes('plata') || descLower.includes('925')) {
      metal = 'Plata Ley 925 Purificada';
    }

    // 2. Gramaje neto final (extraer de cotización, materiales o descripción)
    let netGrams = '14.00';
    const netMatch = desc.match(/\(?([\d.]+)\s*g\s*netos?/i) || desc.match(/([\d.]+)\s*g/i);
    if (netMatch) {
      netGrams = parseFloat(netMatch[1]).toFixed(2);
    } else {
      const metalMaterial = (order.materialsUsed || []).find(
        (m) => m.material?.unit === 'GRAMOS' || (m.material?.type && m.material.type !== 'PIEDRA_PRECIOSA')
      );
      if (metalMaterial) {
        netGrams = Number(metalMaterial.quantity).toFixed(2);
      }
    }

    // 3. Gemas y pedrería montada
    const gemParts = cleanItems.filter((it) => {
      const low = it.toLowerCase();
      return (
        low.includes('circon') ||
        low.includes('diamante') ||
        low.includes('esmeralda') ||
        low.includes('zafiro') ||
        low.includes('rubi') ||
        low.includes('ct')
      );
    });
    const gems =
      gemParts.length > 0
        ? gemParts.join(' | ') + ' (engastadas y verificadas sin fisuras)'
        : 'Sin gemas / Hechura exclusiva en metal noble';

    // 4. Medida o Talla (Solo aplica si es anillo o si se especifica explícitamente)
    let size = '';
    let hasSize = false;

    const isRing =
      descLower.includes('anillo') ||
      descLower.includes('argolla') ||
      descLower.includes('solitario') ||
      descLower.includes('churumbela') ||
      descLower.includes('alianza') ||
      descLower.includes('sinfin') ||
      cleanItems.some((it) => {
        const itLow = it.toLowerCase();
        return (
          itLow.includes('anillo') ||
          itLow.includes('argolla') ||
          itLow.includes('solitario') ||
          itLow.includes('churumbela') ||
          itLow.includes('alianza')
        );
      });

    const sizeMatch = desc.match(/(?:talla|medida)\s*[:=]?\s*([^,\s|]+(?:\s+[^,\s|]+)?)/i);
    if (sizeMatch) {
      size = sizeMatch[0];
      hasSize = true;
    } else if (isRing) {
      size = 'Talla 6.5 americana';
      hasSize = true;
    }

    return {
      metal,
      netGrams,
      gems,
      size,
      hasSize,
    };
  }, [order, cleanItems]);

  // Estados editables para la Ficha Técnica Definitiva (El "Check" de la pieza física)
  const [metalConfirmed, setMetalConfirmed] = useState(extractedDefaults.metal);
  const [finalNetWeight, setFinalNetWeight] = useState(extractedDefaults.netGrams);
  const [gemVerification, setGemVerification] = useState(extractedDefaults.gems);
  const [hasPieceSize, setHasPieceSize] = useState(extractedDefaults.hasSize);
  const [pieceSize, setPieceSize] = useState(extractedDefaults.size);
  const [isEditingSpecs, setIsEditingSpecs] = useState(false);

  // Sincronizar cuando cambia de orden
  useEffect(() => {
    setMetalConfirmed(extractedDefaults.metal);
    setFinalNetWeight(extractedDefaults.netGrams);
    setGemVerification(extractedDefaults.gems);
    setHasPieceSize(extractedDefaults.hasSize);
    setPieceSize(extractedDefaults.size);
    setIsEditingSpecs(false);
  }, [order?.id, extractedDefaults]);

  // Identificador consecutivo para entrega
  const shortId = order.id.length > 8 ? order.id.slice(-5).toUpperCase() : order.id.toUpperCase();
  const deliveryConsecutive = `ENT-${shortId}`;

  // Historial cronológico de pagos
  const sortedPayments = useMemo(() => {
    return [...(order.payments || [])]
      .map((p) => ({ ...p, amount: Number(p.amount) }))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [order.payments]);

  const totalPactado = Number(order.totalPactado) || 0;
  const totalAbonado = sortedPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const saldoPendiente = Math.max(0, totalPactado - totalAbonado);
  const isPazYSalvo = saldoPendiente <= 0;

  // Fecha y hora de entrega física
  const deliveryDateTime = useMemo(() => {
    const rawDate = order.deliveryDate ? new Date(order.deliveryDate) : new Date();
    return rawDate.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [order.deliveryDate]);

  const handlePrint = () => {
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'visible';
    window.print();
    setTimeout(() => {
      document.body.style.overflow = origOverflow;
    }, 1000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="4xl"
      title={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-[#A57525]" />
            <span className="font-serif font-bold text-base text-[#17201D]">
              Acta de Entrega & Liquidación Final
            </span>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#E6F5ED] text-[#17734B] font-bold border border-[#c1e7d4] flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Paz y Salvo Contable</span>
          </span>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Barra superior de herramientas y edición de verificación física */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#FAF1DA]/60 border border-[#eedab1] rounded-xl text-xs no-print">
          <div className="flex items-center space-x-2 text-[#A57525]">
            <Sparkles className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">
              Verifique los datos físicos reales pesados en balanza antes de imprimir para la firma del cliente.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Opción rápida para agregar o remover talla */}
            <label className="flex items-center space-x-1.5 cursor-pointer bg-white px-2.5 py-1.5 rounded-lg border border-[#eedab1] text-[#17201D] font-medium text-xs hover:bg-[#FAF1DA]/40 transition-colors shadow-2xs">
              <input
                type="checkbox"
                checked={hasPieceSize}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setHasPieceSize(checked);
                  if (checked && !pieceSize) {
                    setPieceSize('Talla 6.5 americana');
                  }
                }}
                className="w-3.5 h-3.5 rounded text-[#17734B] focus:ring-[#17734B] border-[#DDE3E0]"
              />
              <span>{hasPieceSize ? 'Talla activa (Anillo)' : '+ Agregar Talla'}</span>
            </label>
            {hasPieceSize && (
              <input
                type="text"
                value={pieceSize}
                onChange={(e) => setPieceSize(e.target.value)}
                placeholder="Ej: Talla 6.5 americana"
                className="w-40 px-2.5 py-1 text-xs bg-white border border-[#eedab1] rounded-lg font-medium text-[#17201D] focus:outline-none focus:ring-1 focus:ring-[#A57525] shadow-2xs"
                title="Talla de la joya (ej. para anillos o argollas)"
              />
            )}
            <Button
              size="sm"
              variant={isEditingSpecs ? 'primary' : 'outline'}
              onClick={() => setIsEditingSpecs(!isEditingSpecs)}
              className="text-xs"
            >
              <Edit2 className="w-3.5 h-3.5 mr-1" />
              {isEditingSpecs ? 'Guardar Cambios en Acta' : 'Personalizar Pesaje / Medida'}
            </Button>
          </div>
        </div>

        {/* Formulario desplegable para ajustar especificaciones finales de la joya */}
        {isEditingSpecs && (
          <div className="p-4 bg-white border border-[#DDE3E0] rounded-xl shadow-xs space-y-3 text-xs no-print animate-in fade-in">
            <h5 className="font-bold text-[#17201D] uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
              <Scale className="w-4 h-4 text-[#A57525]" />
              <span>Verificación Física Real en Balanza de Taller</span>
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-[#66736D] uppercase mb-1">
                  Metal y Ley Confirmada
                </label>
                <input
                  type="text"
                  value={metalConfirmed}
                  onChange={(e) => setMetalConfirmed(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#F4F6F8] border border-[#DDE3E0] rounded-lg font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#66736D] uppercase mb-1">
                  Peso Neto Balanza (g)
                </label>
                <input
                  type="text"
                  value={finalNetWeight}
                  onChange={(e) => setFinalNetWeight(e.target.value)}
                  placeholder="Ej: 14.12"
                  className="w-full px-2.5 py-1.5 text-xs bg-[#F4F6F8] border border-[#DDE3E0] rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-[#66736D] uppercase">
                    Talla / Medida
                  </label>
                  <label className="flex items-center space-x-1 cursor-pointer text-[10px] text-[#A57525] font-semibold">
                    <input
                      type="checkbox"
                      checked={hasPieceSize}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setHasPieceSize(checked);
                        if (checked && !pieceSize) {
                          setPieceSize('Talla 6.5 americana');
                        }
                      }}
                      className="w-3 h-3 rounded text-[#17734B]"
                    />
                    <span>{hasPieceSize ? 'Aplica' : 'No aplica'}</span>
                  </label>
                </div>
                {hasPieceSize ? (
                  <input
                    type="text"
                    value={pieceSize}
                    onChange={(e) => setPieceSize(e.target.value)}
                    placeholder="Ej: Talla 6.5 americana"
                    className="w-full px-2.5 py-1.5 text-xs bg-[#F4F6F8] border border-[#DDE3E0] rounded-lg"
                  />
                ) : (
                  <div className="px-2.5 py-1.5 text-xs bg-[#F4F6F8] border border-dashed border-[#DDE3E0] rounded-lg text-[#8C9893] italic">
                    Sin talla (cadena, dije o no aplica)
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#66736D] uppercase mb-1">
                  Gemas / Pedrería
                </label>
                <input
                  type="text"
                  value={gemVerification}
                  onChange={(e) => setGemVerification(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#F4F6F8] border border-[#DDE3E0] rounded-lg"
                />
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            DOCUMENTO OFICIAL IMPRIMIBLE: ACTA DE ENTREGA Y COMPROBANTE DE LIQUIDACIÓN
            AISLADO PARA IMPRESIÓN MEDIANTE ID PRINTABLE-DELIVERY-ACT-AREA
           ========================================================================= */}
        <div
          id="printable-delivery-act-area"
          className="p-8 bg-white border border-[#DDE3E0] rounded-xl text-[#17201D] font-sans shadow-sm space-y-6"
        >
          {/* 1. ENCABEZADO Y DATOS DE CONTROL */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-[#17211D] pb-5 gap-4">
            <div>
              <h2 className="font-serif text-2xl font-black tracking-widest text-[#17211D] uppercase">
                PAPOI JOYERÍA
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

            <div className="sm:text-right bg-[#E5F4EE]/60 p-3.5 rounded-xl border border-[#c1e7d4] min-w-[240px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#17734B] block">
                ACTA DE ENTREGA & LIQUIDACIÓN FINAL
              </span>
              <span className="font-mono text-base font-bold text-[#17211D] block mt-0.5">
                {deliveryConsecutive}
              </span>
              <span className="text-[10px] font-mono font-medium text-[#66736D] block mt-0.5">
                Ref. Orden: #ORD-{shortId}
              </span>
              <span className="text-[11px] text-[#66736D] block mt-1">
                Fecha entrega: <strong>{deliveryDateTime}</strong>
              </span>
            </div>
          </div>

          {/* DATOS DEL CLIENTE Y REFERENCIA CRUZADA */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-[#F4F6F8] p-4 rounded-xl border border-[#DDE3E0]">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#66736D] block">
                DATOS DEL CLIENTE / RECEPTOR
              </span>
              <p className="font-bold text-sm text-[#17201D]">
                {order.client?.fullName || 'Cliente de Taller'}
              </p>
              <p className="text-[#66736D]">
                CC/NIT: <strong className="text-[#17201D] font-mono">{order.client?.documentId || 'No registrado'}</strong>
              </p>
              <p className="text-[#66736D]">
                Teléfono: <strong className="text-[#17201D]">{order.client?.phone || 'No registrado'}</strong>
              </p>
              <p className="text-[#66736D]">
                Correo: <strong className="text-[#17201D]">{order.client?.email || 'Sin correo registrado'}</strong>
              </p>
            </div>

            <div className="space-y-1 sm:text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#66736D] block">
                TRAZABILIDAD Y CONTROL DE TALLER
              </span>
              <p className="text-[#66736D]">
                Orden Asociada: <strong className="font-mono text-[#17201D]">#ORD-{shortId}</strong>
              </p>
              <span className="text-[9px] text-[#66736D] font-mono block break-all">
                ID Sistema: {order.id}
              </span>
              <p className="text-[#66736D]">
                Orfebre Maestro: <strong className="text-[#17201D]">{order.artisan?.fullName || 'Taller Central Papoi'}</strong>
              </p>
              <p className="text-[#66736D]">
                Estado de la Orden: <strong className="text-[#17734B] uppercase">ENTREGADA A SATISFACCIÓN</strong>
              </p>
            </div>
          </div>

          {/* 2. FICHA TÉCNICA DEFINITIVA (EL "CHECK" DE LA PIEZA FÍSICA TERMINADA) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#17201D] flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-[#A57525]" />
                <span>Ficha Técnica Definitiva & Certificación de la Pieza Entregada</span>
              </span>
              <span className="text-[10px] font-mono font-bold bg-[#FAF1DA] text-[#A57525] px-2 py-0.5 rounded border border-[#eedab1]">
                Inspección 100% Conforme
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-[#F4F6F8] rounded-xl border border-[#DDE3E0] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-[#66736D]">
                    Metal Noble y Ley Oficial:
                  </span>
                  <span className="font-bold text-xs text-[#17201D]">{metalConfirmed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-[#66736D]">
                    Peso Neto Real en Balanza:
                  </span>
                  <span className="font-mono font-bold text-sm text-[#176B52]">
                    {finalNetWeight} g netos
                  </span>
                </div>
                {hasPieceSize && pieceSize.trim() !== '' && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-[#66736D]">
                      Talla / Medida Física:
                    </span>
                    <span className="font-semibold text-xs text-[#17201D]">{pieceSize}</span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-[#F4F6F8] rounded-xl border border-[#DDE3E0] space-y-1.5 flex flex-col justify-center">
                <span className="text-[10px] font-bold uppercase text-[#66736D] block">
                  Gemas / Pedrería Montada:
                </span>
                <span className="font-medium text-xs text-[#17201D] block mt-0.5">
                  {gemVerification}
                </span>
              </div>
            </div>

            {/* Conceptos resumidos de la pieza */}
            {cleanItems.length > 0 && (
              <div className="p-3 bg-white rounded-lg border border-[#DDE3E0] text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A57525] block mb-1">
                  Especificación de diseño orfebre acordada:
                </span>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-[11px] text-[#17201D]">
                  {cleanItems.map((item, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#176B52] mt-1 mr-2 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 3. HISTORIAL DE PAGOS Y LIQUIDACIÓN (BALANCE EN CERO) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#17201D]">
                Historial de Pagos & Liquidación Contable
              </span>
              <span className="text-[10px] text-[#66736D]">
                Trazabilidad inmutable de anticipos recibidos
              </span>
            </div>

            <div className="border border-[#DDE3E0] rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-[#17211D] text-[#EDF5F2] uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 text-left w-1/4">Fecha & Hora</th>
                    <th className="py-2.5 px-3 text-left w-1/3">N.° Comprobante / Referencia</th>
                    <th className="py-2.5 px-3 text-center w-1/5">Método de Pago</th>
                    <th className="py-2.5 px-4 text-right w-1/5">Valor Recibido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDE3E0]">
                  {sortedPayments.map((pay) => (
                    <tr key={pay.id} className="hover:bg-[#F4F6F8]/60">
                      <td className="py-2.5 px-3 font-mono text-[#66736D]">
                        {formatDate(pay.createdAt)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-[#17201D]">
                          REC-{(pay.id || '0000').slice(-6).toUpperCase()}
                        </span>
                        {pay.referenceNotes && (
                          <span className="text-[11px] text-[#66736D] block truncate max-w-xs">
                            {pay.referenceNotes}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EEF1F0] text-[#17201D] border border-[#DDE3E0]">
                          {pay.paymentMethod}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-[#17734B]">
                        {formatCurrency(pay.amount)}
                      </td>
                    </tr>
                  ))}

                  {sortedPayments.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-[#9CA9A3]">
                        No se registraron transacciones previas en el sistema.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Resumen Financiero con Sello de Paz y Salvo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[#F4F6F8] rounded-xl border border-[#DDE3E0] font-mono text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#66736D] block">
                  TOTAL PACTADO
                </span>
                <span className="text-base font-bold text-[#17201D] block mt-0.5">
                  {formatCurrency(totalPactado)}
                </span>
              </div>

              <div className="sm:text-center">
                <span className="text-[10px] uppercase font-bold text-[#17734B] block">
                  TOTAL PAGADO A LA FECHA
                </span>
                <span className="text-base font-bold text-[#17734B] block mt-0.5">
                  {formatCurrency(totalAbonado)}
                </span>
              </div>

              <div className="sm:text-right">
                <span className="text-[10px] uppercase font-bold text-[#17201D] block">
                  SALDO PENDIENTE
                </span>
                <div className="flex items-center sm:justify-end space-x-2 mt-0.5">
                  <span
                    className={`text-base font-bold ${
                      isPazYSalvo ? 'text-[#17734B]' : 'text-[#B42318]'
                    }`}
                  >
                    {formatCurrency(saldoPendiente)}
                  </span>
                  {isPazYSalvo && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-[#E6F5ED] text-[#17734B] border border-[#c1e7d4] font-bold">
                      PAZ Y SALVO
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-[#66736D] italic block mt-0.5 font-sans">
                  {isPazYSalvo
                    ? 'Cuenta cancelada y liquidada al 100%'
                    : 'Saldo pendiente previo a entrega'}
                </span>
              </div>
            </div>
          </div>

          {/* 4. CLÁUSULA DE RECIBIDO A SATISFACCIÓN Y GARANTÍA (BLINDAJE LEGAL) */}
          <div className="pt-2 border-t border-[#DDE3E0] space-y-4">
            <div className="p-3.5 bg-[#FAF1DA]/40 border border-[#eedab1] rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A57525] block mb-1.5">
                Declaración de Conformidad y Garantía Oficial Papoi:
              </span>
              <p className="text-[11px] text-[#17201D] leading-relaxed text-justify">
                "El cliente declara haber recibido a entera satisfacción la joya descrita en la presente acta, habiendo verificado su estado físico, peso, acabados y gemas montadas. La pieza cuenta con garantía de por vida sobre la ley del metal precioso (Oro 18K / Plata 925). La garantía no cubre desgaste natural, deformaciones por golpes o caídas, cortes accidentales, pérdida de gemas por tracción externa o manipulación por talleres ajenos a Papoi."
              </p>
            </div>

            {/* 5. FIRMAS DE CIERRE */}
            <div className="grid grid-cols-2 gap-8 pt-6">
              {/* Entregado por Taller / Tienda */}
              <div className="space-y-2">
                <div className="border-b-2 border-[#17211D] h-12 w-full" />
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-[#17201D]">
                      Papoi Joyería Artesanal
                    </span>
                    <span className="text-[9px] uppercase tracking-wider text-[#66736D] font-medium">
                      Control y Entrega
                    </span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-[#66736D] block">
                    Entregado por (Asesor / Responsable de Tienda)
                  </span>
                  <div className="pt-2 space-y-1.5 text-[10px] text-[#17201D]">
                    <p className="flex items-center">
                      <span className="w-36 font-medium text-[#66736D]">Nombre de quien entrega:</span>
                      <span className="border-b border-[#17211D]/40 flex-1 h-3.5"></span>
                    </p>
                    <p className="flex items-center">
                      <span className="w-36 font-medium text-[#66736D]">Fecha de Entrega:</span>
                      <span className="border-b border-[#17211D]/40 flex-1 h-3.5 font-mono text-[#17201D] font-bold">
                        {new Date().toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Recibido por Cliente */}
              <div className="space-y-2">
                <div className="border-b-2 border-[#17211D] h-12 w-full" />
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-[#17201D]">
                      {order.client?.fullName || 'Cliente Papoi'}
                    </span>
                    <span className="text-[9px] uppercase tracking-wider text-[#17734B] font-bold">
                      Recibido a Conformidad
                    </span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-[#66736D] block">
                    Firma de Recepción del Cliente
                  </span>
                  <div className="pt-2 space-y-1.5 text-[10px] text-[#17201D]">
                    <p className="flex items-center">
                      <span className="w-36 font-medium text-[#66736D]">Nombre Legible:</span>
                      <span className="border-b border-[#17211D]/40 flex-1 h-3.5 font-mono text-[#17201D]">
                        {order.client?.fullName || ''}
                      </span>
                    </p>
                    <p className="flex items-center">
                      <span className="w-36 font-medium text-[#66736D]">C.C. / NIT:</span>
                      <span className="border-b border-[#17211D]/40 flex-1 h-3.5 font-mono text-[#17201D] font-bold">
                        {order.client?.documentId || ''}
                      </span>
                    </p>
                    <p className="flex items-center">
                      <span className="w-36 font-medium text-[#66736D]">Fecha de Recibido:</span>
                      <span className="border-b border-[#17211D]/40 flex-1 h-3.5 font-mono text-[#8C9893]">
                        DD / MM / AAAA
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
            <div className="pt-4 border-t border-[#DDE3E0] text-center">
              <p className="text-[10px] text-[#66736D] italic">
                "Este documento constituye un acta de entrega y comprobante de liquidación interna de taller. No equivale ni reemplaza la factura de venta ni da derecho a costos o deducciones tributarias."
              </p>
            </div>
          </div>
        </div>

        {/* Botones de acción modal (ocultos al imprimir) */}
        <div className="flex justify-end space-x-3 pt-2 no-print">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            className="font-bold shadow-md bg-[#176B52] hover:bg-[#125440] text-white"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Imprimir Acta de Entrega y Liquidación
          </Button>
        </div>
      </div>
    </Modal>
  );
};


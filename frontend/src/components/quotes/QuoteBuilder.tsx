import React, { useState, useMemo, useEffect, useRef } from 'react';
import { QuoteItem, Client, Material } from '../../types';
import { formatCurrency, formatGrams } from '../../utils/formatters';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  FileText,
  Plus,
  Trash2,
  CheckCircle,
  ArrowRight,
  Calculator,
  Scale,
  Gem,
  Hammer,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkle,
  Sparkles,
  Boxes,
  Search,
  Check,
  X,
  User,
} from 'lucide-react';
import {
  useQuotes,
  useClients,
  useMaterials,
  useCreateQuote,
  useApproveQuote,
} from '../../api/hooks';

interface QuoteBuilderProps {
  onQuoteApproved?: (orderId: string) => void;
}

interface GemItem {
  id: string;
  materialId?: string; // ID si viene de la bodega de materiales
  name: string;
  quantity: number;
  carats: number;
  pricingMode: 'unit' | 'carat';
  price: number;
}

interface AdditionalItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

// Precios de referencia sugeridos en miles de pesos por gramo según tipo
const DEFAULT_METAL_RATES: Record<string, number> = {
  ORO_AMARILLO_18K: 340000,
  ORO_BLANCO_18K: 360000,
  ORO_ROSA_18K: 345000,
  ORO_14K: 270000,
  ORO_10K: 200000,
  PLATA_925: 7500,
};

export const QuoteBuilder: React.FC<QuoteBuilderProps> = ({ onQuoteApproved }) => {
  const { data: quotes = [], refetch: refetchQuotes } = useQuotes();
  const { data: clients = [] } = useClients();
  const { data: materials = [] } = useMaterials();

  const createQuoteMutation = useCreateQuote();
  const approveQuoteMutation = useApproveQuote();

  // Filtrado de materiales del backend: Metales vs Piedras
  const metalsFromBackend = useMemo(() => {
    return materials.filter(
      (m) => m.unit === 'GRAMOS' || m.type !== 'PIEDRA_PRECIOSA'
    );
  }, [materials]);

  const stonesFromBackend = useMemo(() => {
    return materials.filter(
      (m) => m.unit === 'KILATES' || m.type === 'PIEDRA_PRECIOSA'
    );
  }, [materials]);

  // Cliente por defecto con CC 2222222222
  const [selectedClientId, setSelectedClientId] = useState<string>('cli-defecto');
  const [isClientSearchOpen, setIsClientSearchOpen] = useState<boolean>(false);
  const [clientSearchTerm, setClientSearchTerm] = useState<string>('');
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // Manejar click outside para cerrar el selector de cliente
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setIsClientSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Seleccionar automáticamente cliente con CC 2222222222
  useEffect(() => {
    if (clients.length > 0) {
      const defaultClient = clients.find((c) => {
        const doc = (c.documentId || '').replace(/\D/g, '');
        return doc === '2222222222' || c.documentId === '2222222222';
      });
      if (defaultClient && (!selectedClientId || selectedClientId === 'cli-1' || selectedClientId === 'cli-defecto')) {
        setSelectedClientId(defaultClient.id);
      } else if (!selectedClientId && clients[0]) {
        setSelectedClientId(clients[0].id);
      }
    }
  }, [clients]);

  const selectedClient = useMemo(() => {
    return (
      clients.find((c) => c.id === selectedClientId) ||
      clients.find((c) => (c.documentId || '').replace(/\D/g, '') === '2222222222') ||
      clients[0]
    );
  }, [clients, selectedClientId]);

  const filteredClientsForQuote = useMemo(() => {
    const q = clientSearchTerm.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter((c) => {
      const matchDoc = c.documentId?.toLowerCase().includes(q);
      const matchName = c.fullName?.toLowerCase().includes(q);
      return matchDoc || matchName;
    });
  }, [clients, clientSearchTerm]);

  // Estados de cotización iniciando en 0
  const [pieceTitle, setPieceTitle] = useState<string>('');
  const [validUntilDays, setValidUntilDays] = useState<number>(15);
  const [activeTab, setActiveTab] = useState<'calculator' | 'review'>('calculator');
  const [showFormulaExplanation, setShowFormulaExplanation] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Estado de Metal Base - Iniciando en 0
  const [selectedMetalId, setSelectedMetalId] = useState<string>('custom');
  const [customMetalName, setCustomMetalName] = useState<string>('Oro Amarillo 18k (Ley 750)');
  const [gramsNet, setGramsNet] = useState<number>(0);
  const [pricePerGram, setPricePerGram] = useState<number>(0);
  const [includeMerma, setIncludeMerma] = useState<boolean>(true);
  const [mermaPercent, setMermaPercent] = useState<number>(6.0);

  // Sincronizar metal sin sobreescribir el precio en 0 al inicio
  useEffect(() => {
    if (metalsFromBackend.length > 0 && selectedMetalId === 'custom' && !customMetalName) {
      const first = metalsFromBackend[0];
      setSelectedMetalId(first.id);
    }
  }, [metalsFromBackend]);

  const selectedMetalMaterial = useMemo(() => {
    return metalsFromBackend.find((m) => m.id === selectedMetalId);
  }, [metalsFromBackend, selectedMetalId]);

  const handleSelectMetal = (materialId: string) => {
    setSelectedMetalId(materialId);
    if (materialId === 'custom') {
      if (!customMetalName) setCustomMetalName('Oro 18k Personalizado');
    } else {
      const found = metalsFromBackend.find((m) => m.id === materialId);
      if (found) {
        const suggestedRate = DEFAULT_METAL_RATES[found.type] || 0;
        setPricePerGram(suggestedRate);
        if (found.type === 'PLATA_925') {
          setMermaPercent(8.0);
        } else if (found.type === 'ORO_BLANCO_18K') {
          setMermaPercent(6.5);
        } else {
          setMermaPercent(6.0);
        }
      }
    }
  };

  // Cálculos de metal (siempre a 2 decimales)
  // Control de taller e inventario: gramos brutos requeridos para fundición
  const grossGrams = useMemo(() => {
    if (!includeMerma) return Number(gramsNet.toFixed(2));
    return Number((gramsNet * (1 + mermaPercent / 100)).toFixed(2));
  }, [gramsNet, includeMerma, mermaPercent]);

  const metalWasteGrams = useMemo(() => {
    return Number(Math.max(0, grossGrams - gramsNet).toFixed(2));
  }, [grossGrams, gramsNet]);

  // Regla comercial Alkisu: la merma se contempla en el precio por gramo, no se le cobra adicional al cliente
  const metalSubtotal = useMemo(() => {
    return Math.round(gramsNet * (pricePerGram || 0));
  }, [gramsNet, pricePerGram]);

  // 2. Estado de Piedras / Gemas (Iniciando vacías / 0)
  const [gems, setGems] = useState<GemItem[]>([]);

  const gemsSubtotal = useMemo(() => {
    return gems.reduce((sum, g) => {
      const q = Number(g.quantity) || 0;
      const p = Number(g.price) || 0;
      const c = Number(g.carats) || 0;
      const itemTotal = g.pricingMode === 'carat' ? q * c * p : q * p;
      return sum + Math.round(itemTotal);
    }, 0);
  }, [gems]);

  const handleAddGem = () => {
    const firstStone = stonesFromBackend[0];
    setGems([
      ...gems,
      {
        id: `gem-${Date.now()}`,
        materialId: firstStone ? firstStone.id : 'custom',
        name: firstStone ? firstStone.name : 'Diamante Natural Brillante',
        quantity: 1,
        carats: firstStone ? firstStone.stock : 0.5,
        pricingMode: 'unit',
        price: 0,
      },
    ]);
  };

  const handleSelectGemMaterial = (gemId: string, materialId: string) => {
    if (materialId === 'custom') {
      handleUpdateGem(gemId, 'materialId', 'custom');
    } else {
      const found = stonesFromBackend.find((s) => s.id === materialId);
      if (found) {
        setGems(
          gems.map((g) =>
            g.id === gemId
              ? {
                  ...g,
                  materialId: found.id,
                  name: found.name,
                  carats: Number(found.stock.toFixed(2)),
                }
              : g
          )
        );
      }
    }
  };

  const handleUpdateGem = (id: string, field: keyof GemItem, value: any) => {
    setGems(gems.map((g) => (g.id === id ? { ...g, [field]: value } : g)));
  };

  const handleRemoveGem = (id: string) => {
    setGems(gems.filter((g) => g.id !== id));
  };

  // 3. Estado de Mano de Obra (Iniciando en 0)
  const [craftsmanshipPrice, setCraftsmanshipPrice] = useState<number>(0);
  const [craftsmanshipDescription, setCraftsmanshipDescription] = useState<string>(
    'Mano de obra y confección artesanal de taller'
  );

  // 4. Líneas adicionales libres
  const [additionalItems, setAdditionalItems] = useState<AdditionalItem[]>([]);

  const handleAddAdditionalItem = () => {
    setAdditionalItems([
      ...additionalItems,
      {
        id: `add-${Date.now()}`,
        description: 'Servicio de diseño 3D personalizado y render fotorrealista',
        quantity: 1,
        unitPrice: 200000,
      },
    ]);
  };

  const handleUpdateAdditionalItem = (
    id: string,
    field: keyof AdditionalItem,
    value: any
  ) => {
    setAdditionalItems(
      additionalItems.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  const handleRemoveAdditionalItem = (id: string) => {
    setAdditionalItems(additionalItems.filter((it) => it.id !== id));
  };

  const additionalSubtotal = useMemo(() => {
    return additionalItems.reduce(
      (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
      0
    );
  }, [additionalItems]);

  // Total acumulado final
  const grandTotal = useMemo(() => {
    return metalSubtotal + gemsSubtotal + craftsmanshipPrice + additionalSubtotal;
  }, [metalSubtotal, gemsSubtotal, craftsmanshipPrice, additionalSubtotal]);

  // Compilación de los parámetros en ítems formales para el backend
  const compiledQuoteItems = useMemo<QuoteItem[]>(() => {
    const list: QuoteItem[] = [];

    // 1. Metal
    const metalLabel =
      selectedMetalId !== 'custom' && selectedMetalMaterial
        ? selectedMetalMaterial.name
        : customMetalName || 'Metal Precioso';

    const metalDesc = includeMerma
      ? `${metalLabel} (${formatGrams(gramsNet)} netos @ ${formatCurrency(pricePerGram)}/g | Control taller: ${mermaPercent}% merma [${formatGrams(grossGrams)} brutos para fundición])`
      : `${metalLabel} (${formatGrams(gramsNet)} netos @ ${formatCurrency(pricePerGram)}/g)`;

    list.push({
      description: metalDesc,
      quantity: 1,
      unitPrice: metalSubtotal,
      subtotal: metalSubtotal,
      category: 'metal',
    });

    // 2. Gemas
    gems.forEach((g) => {
      const q = Number(g.quantity) || 1;
      const c = Number(g.carats) || 0;
      const p = Number(g.price) || 0;
      const sub = g.pricingMode === 'carat' ? Math.round(q * c * p) : Math.round(q * p);
      const desc =
        g.pricingMode === 'carat'
          ? `${q}x ${g.name} (${c}ct c/u @ ${formatCurrency(p)}/ct)`
          : `${q}x ${g.name} (${c > 0 ? `${c}ct c/u` : 'Gema'})`;

      list.push({
        description: desc,
        quantity: q,
        unitPrice: Math.round(sub / q),
        subtotal: sub,
        category: 'piedra',
      });
    });

    // 3. Mano de obra
    list.push({
      description: craftsmanshipDescription || 'Mano de obra artesanal',
      quantity: 1,
      unitPrice: craftsmanshipPrice,
      subtotal: craftsmanshipPrice,
      category: 'mano_obra',
    });

    // 4. Adicionales
    additionalItems.forEach((it) => {
      const q = Number(it.quantity) || 1;
      const p = Number(it.unitPrice) || 0;
      list.push({
        description: it.description,
        quantity: q,
        unitPrice: p,
        subtotal: q * p,
        category: 'otro',
      });
    });

    return list;
  }, [
    selectedMetalId,
    selectedMetalMaterial,
    customMetalName,
    gramsNet,
    mermaPercent,
    grossGrams,
    includeMerma,
    pricePerGram,
    metalSubtotal,
    gems,
    craftsmanshipDescription,
    craftsmanshipPrice,
    additionalItems,
  ]);

  // Guardar como Borrador
  const handleSaveDraft = async () => {
    setSuccessMessage(null);
    try {
      const newQuote = await createQuoteMutation.mutateAsync({
        clientId: selectedClientId,
        items: compiledQuoteItems,
        validUntil: new Date(Date.now() + validUntilDays * 24 * 60 * 60 * 1000).toISOString(),
      });

      setSuccessMessage(
        `¡Cotización guardada como Borrador! Ref: #${newQuote.id.slice(0, 8).toUpperCase()}`
      );
      refetchQuotes();
    } catch (err: any) {
      console.error(err);
      alert('Error guardando cotización: ' + (err.message || 'Error de servidor'));
    }
  };

  // Guardar y Aprobar Directamente
  const handleSaveAndApprove = async () => {
    setSuccessMessage(null);
    try {
      const newQuote = await createQuoteMutation.mutateAsync({
        clientId: selectedClientId,
        items: compiledQuoteItems,
        validUntil: new Date(Date.now() + validUntilDays * 24 * 60 * 60 * 1000).toISOString(),
      });

      const approved = await approveQuoteMutation.mutateAsync({
        id: newQuote.id,
      });

      setSuccessMessage(
        `¡Cotización aprobada y convertida en Pedido de Taller #${approved.order.id.slice(0, 8).toUpperCase()}!`
      );
      refetchQuotes();

      if (onQuoteApproved) {
        onQuoteApproved(approved.order.id);
      }
    } catch (err: any) {
      console.error(err);
      alert('Error aprobando cotización: ' + (err.message || 'Error de servidor'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="font-serif text-2xl font-bold text-[#17201D]">
              Cotizador Técnico de Joyería Fina
            </h2>
            <Badge variant="gold" size="sm">
              Conectado a Bodega
            </Badge>
          </div>
          <p className="text-xs text-[#66736D] mt-1">
            Cálculo matemático con inventario de metales y gemas en tiempo real: Gramos de metal con merma, piedras certificadas y hechura personalizada.
          </p>
        </div>

        {/* Botón Didáctico: ¿Cómo se calculan los precios? */}
        <button
          type="button"
          onClick={() => setShowFormulaExplanation(!showFormulaExplanation)}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#FAF1DA] text-[#A57525] border border-[#eedab1] hover:bg-[#f6e5be] transition"
        >
          <HelpCircle className="w-4 h-4 text-[#A57525]" />
          <span>¿Cómo se calculan los precios en Alkisu?</span>
          {showFormulaExplanation ? (
            <ChevronUp className="w-3.5 h-3.5 ml-1" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 ml-1" />
          )}
        </button>
      </div>

      {/* Panel Explicativo Didáctico Desplegable */}
      {showFormulaExplanation && (
        <div className="p-5 bg-gradient-to-br from-[#FAF1DA]/80 to-[#F4F6F8] border border-[#eedab1] rounded-2xl text-xs space-y-4 animate-in fade-in">
          <div className="flex items-center space-x-2 text-[#A57525] font-bold text-sm">
            <Sparkle className="w-4 h-4" />
            <span>Fórmula Estándar de Costeo de Alta Joyería (Taller Alkisu)</span>
          </div>

          <p className="text-[#4D5753] leading-relaxed">
            Una joya personalizada se compone de la suma estricta de sus materias primas de bodega y del valor de hechura personalizada:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-[#DDE3E0]">
              <div className="flex items-center space-x-1.5 font-bold text-[#17201D] mb-1">
                <Scale className="w-4 h-4 text-[#A57525]" />
                <span>1. Metal Precioso (en Gramos)</span>
              </div>
              <p className="text-[11px] text-[#66736D] leading-tight">
                <strong>Gramos Brutos = Gramos Netos × (1 + % Merma / 100)</strong>.
                La merma técnica (estándar 6%) cubre la pérdida inevitable de oro en fundición, limado y pulido.
                <span className="block mt-1 text-[#176B52] font-semibold">
                  Subtotal Metal = Gramos Brutos × $/g
                </span>
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-[#DDE3E0]">
              <div className="flex items-center space-x-1.5 font-bold text-[#17201D] mb-1">
                <Gem className="w-4 h-4 text-[#2457A6]" />
                <span>2. Gemas y Piedras de Bodega</span>
              </div>
              <p className="text-[11px] text-[#66736D] leading-tight">
                Se consultan las gemas del inventario de bodega con su stock en quilates (ct) o piedras libres.
                <span className="block mt-1 text-[#176B52] font-semibold">
                  Subtotal = Cantidad × Precio Unitario (o ct × $/ct)
                </span>
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-[#DDE3E0]">
              <div className="flex items-center space-x-1.5 font-bold text-[#17201D] mb-1">
                <Hammer className="w-4 h-4 text-[#17734B]" />
                <span>3. Mano de Obra y Regla del 50%</span>
              </div>
              <p className="text-[11px] text-[#66736D] leading-tight">
                Valor personalizado del orfebre. Se requiere el <strong>50% de anticipo</strong> para fundir metal antes de iniciar en mesa de trabajo.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Alerta de Éxito al Aprobar */}
      {successMessage && (
        <div className="p-4 bg-[#E6F5ED] border border-[#c1e7d4] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#17734B] animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-bold">{successMessage}</span>
          </div>
          {onQuoteApproved && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => onQuoteApproved('ord-101')}
            >
              Ver en Tablero
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      )}

      {/* Formulario Principal de Configuración */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Tarjeta de Datos Iniciales (Cliente, Nombre de la Joya y Pestañas) */}
          <div className="bg-white rounded-xl border border-[#DDE3E0] p-5 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="relative" ref={clientDropdownRef}>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#17201D] mb-1.5">
                  Cliente Solicitante
                </label>
                {/* Botón trigger del selector */}
                <button
                  type="button"
                  onClick={() => {
                    setIsClientSearchOpen(!isClientSearchOpen);
                    setClientSearchTerm('');
                  }}
                  className="w-full px-3 py-2 text-left text-xs border border-[#DDE3E0] rounded-lg focus:outline-none focus:border-[#176B52] bg-white font-medium flex items-center justify-between hover:bg-[#F4F6F8] transition"
                >
                  <div className="flex flex-col truncate pr-2">
                    <span className="font-bold text-[#17201D] truncate">
                      {selectedClient ? selectedClient.fullName : 'Seleccionar cliente...'}
                    </span>
                    <span className="text-[10px] text-[#176B52] font-mono">
                      {selectedClient?.documentId ? `CC: ${selectedClient.documentId}` : 'Sin documento'}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-[#9CA9A3] flex-shrink-0" />
                </button>

                {/* Menú desplegable con buscador por cédula / nombre */}
                {isClientSearchOpen && (
                  <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-[#DDE3E0] rounded-xl shadow-lg overflow-hidden animate-in fade-in duration-150">
                    <div className="p-2 border-b border-[#DDE3E0] bg-[#F4F6F8]">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-[#9CA9A3] absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          autoFocus
                          placeholder="Buscar por cédula o nombre..."
                          value={clientSearchTerm}
                          onChange={(e) => setClientSearchTerm(e.target.value)}
                          className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-[#DDE3E0] rounded-md text-[#17201D] focus:outline-none focus:border-[#176B52]"
                        />
                        {clientSearchTerm && (
                          <button
                            type="button"
                            onClick={() => setClientSearchTerm('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9CA9A3] hover:text-[#17201D]"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="max-h-56 overflow-y-auto divide-y divide-[#F4F6F8]">
                      {filteredClientsForQuote.map((c) => {
                        const isSelected = selectedClientId === c.id;
                        return (
                          <div
                            key={c.id}
                            onClick={() => {
                              setSelectedClientId(c.id);
                              setIsClientSearchOpen(false);
                              setClientSearchTerm('');
                            }}
                            className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between hover:bg-[#F4F6F8] transition ${
                              isSelected ? 'bg-[#E5F4EE]/60 font-bold' : ''
                            }`}
                          >
                            <div className="truncate pr-2">
                              <div className="text-[#17201D] font-medium truncate">{c.fullName}</div>
                              <div className="text-[10px] text-[#176B52] font-mono mt-0.5">
                                {c.documentId ? `CC: ${c.documentId}` : 'Sin documento'}
                              </div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-[#176B52] flex-shrink-0" />}
                          </div>
                        );
                      })}
                      {filteredClientsForQuote.length === 0 && (
                        <div className="py-4 text-center text-xs text-[#9CA9A3]">
                          No se encontraron clientes con esa cédula o nombre
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#17201D] mb-1.5">
                  Nombre o Referencia de la Joya
                </label>
                <input
                  type="text"
                  value={pieceTitle}
                  onChange={(e) => setPieceTitle(e.target.value)}
                  placeholder="Ej. Anillo Solitario Oro 18k Esmeralda"
                  className="w-full px-3 py-2 text-xs border border-[#DDE3E0] rounded-lg focus:outline-none focus:border-[#176B52] bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#17201D] mb-1.5">
                  Vigencia de la Oferta
                </label>
                <select
                  value={validUntilDays}
                  onChange={(e) => setValidUntilDays(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-[#DDE3E0] rounded-lg focus:outline-none focus:border-[#176B52] bg-white font-medium"
                >
                  <option value={7}>7 días de vigencia</option>
                  <option value={15}>15 días de vigencia (Estándar)</option>
                  <option value={30}>30 días de vigencia</option>
                </select>
              </div>
            </div>

            {/* Selector de Pestañas: Calculadora vs Líneas Compiladas */}
            <div className="flex border-b border-[#DDE3E0] pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('calculator')}
                className={`pb-2.5 px-4 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 ${
                  activeTab === 'calculator'
                    ? 'border-[#176B52] text-[#176B52]'
                    : 'border-transparent text-[#66736D] hover:text-[#17201D]'
                }`}
              >
                <Calculator className="w-4 h-4" />
                <span>1. Calculadora de Gramos y Componentes</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('review')}
                className={`pb-2.5 px-4 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 ${
                  activeTab === 'review'
                    ? 'border-[#176B52] text-[#176B52]'
                    : 'border-transparent text-[#66736D] hover:text-[#17201D]'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>2. Desglose Comercial Compilado ({compiledQuoteItems.length} líneas)</span>
              </button>
            </div>
          </div>

          {/* VISTA 1: CALCULADORA PARAMÉTRICA */}
          {activeTab === 'calculator' && (
            <div className="space-y-6">
              {/* SECCIÓN 1: METAL BASE (DESDE INVENTARIO DE BACKEND) */}
              <div className="bg-white rounded-xl border border-[#DDE3E0] p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#DDE3E0] pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-[#FAF1DA] text-[#A57525] flex items-center justify-center font-bold">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#17201D]">
                        1. Metal Base (Inventario de Bodega)
                      </h3>
                      <p className="text-[11px] text-[#66736D]">
                        Seleccione el metal disponible en bodega y calcule los gramos brutos con merma.
                      </p>
                    </div>
                  </div>
                  <Badge variant="gold" size="sm">
                    {formatCurrency(metalSubtotal)}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Selector de Metales Traídos del Backend */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#17201D] mb-1.5">
                      Metal de Bodega
                    </label>
                    <select
                      value={selectedMetalId}
                      onChange={(e) => handleSelectMetal(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#DDE3E0] rounded-lg focus:outline-none focus:border-[#176B52] bg-white font-medium"
                    >
                      {metalsFromBackend.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} — Stock: {formatGrams(m.stock)}
                        </option>
                      ))}
                      <option value="custom">Otro / Aleación Personalizada</option>
                    </select>

                    {/* Stock disponible y estado del material */}
                    {selectedMetalMaterial && (
                      <div className="flex items-center space-x-1.5 mt-1.5 text-[11px] text-[#176B52]">
                        <Boxes className="w-3.5 h-3.5" />
                        <span>
                          Stock en bodega:{' '}
                          <strong className="font-mono">
                            {formatGrams(selectedMetalMaterial.stock)}
                          </strong>
                        </span>
                        {selectedMetalMaterial.stock <= selectedMetalMaterial.minStock && (
                          <Badge variant="warning" size="sm">
                            Stock Crítico
                          </Badge>
                        )}
                      </div>
                    )}

                    {selectedMetalId === 'custom' && (
                      <input
                        type="text"
                        value={customMetalName}
                        onChange={(e) => setCustomMetalName(e.target.value)}
                        placeholder="Nombre de aleación personalizada..."
                        className="w-full mt-2 px-3 py-1.5 text-xs border border-[#DDE3E0] rounded-lg focus:outline-none focus:border-[#176B52]"
                      />
                    )}
                  </div>

                  {/* Precio por Gramo en Miles */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#17201D]">
                        Precio por Gramo
                      </label>
                      <span className="font-mono text-[11px] font-bold text-[#176B52]">
                        {formatCurrency(pricePerGram)} / g
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#9CA9A3] font-mono">
                        $
                      </span>
                      <input
                        type="number"
                        min="1000"
                        step="5000"
                        value={pricePerGram}
                        onChange={(e) => setPricePerGram(Number(e.target.value) || 0)}
                        className="w-full pl-7 pr-3 py-2 text-xs font-mono font-bold text-[#17201D] border border-[#DDE3E0] rounded-lg focus:outline-none focus:border-[#176B52] bg-white"
                        placeholder="340000"
                      />
                    </div>
                    <span className="text-[10px] text-[#66736D] mt-0.5 block">
                      Ej: 340000 = {formatCurrency(340000)} por gramo.
                    </span>
                  </div>
                </div>

                {/* Gramos Netos y Merma (siempre a 2 decimales) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#17201D] mb-1.5">
                      Gramos Netos de la Joya (g)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={gramsNet}
                      onChange={(e) => setGramsNet(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-xs font-mono font-bold text-[#17201D] border border-[#DDE3E0] rounded-lg focus:outline-none focus:border-[#176B52] bg-white"
                      placeholder="8.50"
                    />
                    <span className="text-[10px] text-[#66736D] mt-0.5 block">
                      Peso final estimado de la joya pulida.
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#17201D]">
                        % Merma de Taller
                      </label>
                      <label className="flex items-center space-x-1 cursor-pointer text-[10px] text-[#176B52] font-semibold">
                        <input
                          type="checkbox"
                          checked={includeMerma}
                          onChange={(e) => setIncludeMerma(e.target.checked)}
                          className="rounded text-[#176B52] focus:ring-0"
                        />
                        <span>Aplicar</span>
                      </label>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="20"
                        disabled={!includeMerma}
                        value={mermaPercent}
                        onChange={(e) => setMermaPercent(Number(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-xs font-mono font-bold text-[#17201D] border border-[#DDE3E0] rounded-lg focus:outline-none focus:border-[#176B52] bg-white disabled:bg-gray-100 disabled:text-gray-400"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#9CA9A3] font-bold">
                        %
                      </span>
                    </div>
                    <span className="text-[10px] text-[#66736D] mt-0.5 block">
                      Pérdida técnica en fundición y pulido.
                    </span>
                  </div>

                  {/* Resumen del cálculo de metal (Control de taller / inventario) */}
                  <div className="p-3 bg-[#FAF1DA]/60 border border-[#eedab1] rounded-xl flex flex-col justify-center">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#A57525] block">
                        Control Taller / Inventario
                      </span>
                      <span className="text-[9px] font-semibold text-[#176B52] bg-[#E5F4EE] px-1 rounded">
                        Sin cobrar al cliente
                      </span>
                    </div>
                    <div className="flex items-baseline space-x-1 mt-0.5">
                      <span className="text-base font-mono font-bold text-[#17201D]">
                        {formatGrams(grossGrams)}
                      </span>
                      <span className="text-[11px] text-[#66736D]">brutos para fundición</span>
                    </div>
                    <span className="text-[10px] text-[#4D5753] mt-0.5 block font-mono">
                      {formatGrams(gramsNet)} netos + {formatGrams(metalWasteGrams)} merma
                    </span>
                    <span className="text-[9px] text-[#66736D] mt-1 block">
                      Cobrado: {formatGrams(gramsNet)} netos (merma contemplada en $/g)
                    </span>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: GEMAS Y PIEDRAS PRECIOSAS (DESDE INVENTARIO DE BACKEND) */}
              <div className="bg-white rounded-xl border border-[#DDE3E0] p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#DDE3E0] pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-[#EAF1FC] text-[#2457A6] flex items-center justify-center font-bold">
                      <Gem className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#17201D]">
                        2. Gemas y Piedras Preciosas ({gems.length})
                      </h3>
                      <p className="text-[11px] text-[#66736D]">
                        Seleccione piedras del inventario de bodega o ingrese piedras personalizadas.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="info" size="sm">
                      {formatCurrency(gemsSubtotal)}
                    </Badge>
                    <button
                      type="button"
                      onClick={handleAddGem}
                      className="px-2.5 py-1 text-xs font-semibold rounded-md bg-[#176B52] text-white hover:bg-[#125843] transition flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar Gema</span>
                    </button>
                  </div>
                </div>

                {gems.length === 0 ? (
                  <div className="p-4 rounded-lg bg-[#F4F6F8] text-center text-xs text-[#66736D]">
                    No se han configurado piedras preciosas. (Joya lisa en metal puro).
                  </div>
                ) : (
                  <div className="space-y-3">
                    {gems.map((gem) => {
                      const itemSubtotal =
                        gem.pricingMode === 'carat'
                          ? (Number(gem.quantity) || 0) * (Number(gem.carats) || 0) * (Number(gem.price) || 0)
                          : (Number(gem.quantity) || 0) * (Number(gem.price) || 0);

                      return (
                        <div
                          key={gem.id}
                          className="p-3.5 rounded-xl border border-[#DDE3E0] bg-[#F4F6F8] flex flex-col md:flex-row items-center gap-3"
                        >
                          {/* Selector de Piedra de Bodega o Manual */}
                          <div className="w-full md:w-5/12 space-y-1">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#66736D]">
                              Gema / Piedra de Bodega
                            </label>
                            <select
                              value={gem.materialId || 'custom'}
                              onChange={(e) => handleSelectGemMaterial(gem.id, e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs font-medium border border-[#DDE3E0] rounded-lg bg-white focus:outline-none focus:border-[#176B52]"
                            >
                              {stonesFromBackend.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name} (Stock: {formatGrams(s.stock, s.unit)})
                                </option>
                              ))}
                              <option value="custom">Otra gema / personalizada...</option>
                            </select>

                            {gem.materialId === 'custom' && (
                              <input
                                type="text"
                                value={gem.name}
                                onChange={(e) => handleUpdateGem(gem.id, 'name', e.target.value)}
                                placeholder="Ej: Diamante Natural 0.50ct VS1"
                                className="w-full px-2.5 py-1 text-xs border border-[#DDE3E0] rounded bg-white"
                              />
                            )}
                          </div>

                          {/* Cantidad y Quilates (2 decimales) */}
                          <div className="grid grid-cols-2 gap-2 w-full md:w-3/12">
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#66736D] mb-1">
                                Cantidad
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={gem.quantity}
                                onChange={(e) =>
                                  handleUpdateGem(gem.id, 'quantity', Number(e.target.value) || 0)
                                }
                                className="w-full px-2 py-1.5 text-xs text-center font-mono border border-[#DDE3E0] rounded-lg bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#66736D] mb-1">
                                Quilates (ct)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={gem.carats}
                                onChange={(e) =>
                                  handleUpdateGem(gem.id, 'carats', Number(e.target.value) || 0)
                                }
                                className="w-full px-2 py-1.5 text-xs text-center font-mono border border-[#DDE3E0] rounded-lg bg-white"
                              />
                            </div>
                          </div>

                          {/* Modo de precio y Precio Unitario en miles */}
                          <div className="w-full md:w-3/12">
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-[#66736D]">
                                Precio ({gem.pricingMode === 'unit' ? '$/Piedra' : '$/ct'})
                              </label>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateGem(
                                    gem.id,
                                    'pricingMode',
                                    gem.pricingMode === 'unit' ? 'carat' : 'unit'
                                  )
                                }
                                className="text-[10px] text-[#2457A6] hover:underline font-semibold"
                              >
                                {gem.pricingMode === 'unit' ? 'A $/ct' : 'A $/Ud'}
                              </button>
                            </div>
                            <input
                              type="number"
                              step="50000"
                              value={gem.price}
                              onChange={(e) =>
                                handleUpdateGem(gem.id, 'price', Number(e.target.value) || 0)
                              }
                              className="w-full px-2.5 py-1.5 text-xs font-mono text-right border border-[#DDE3E0] rounded-lg bg-white font-bold"
                            />
                            <span className="text-[9px] font-mono text-[#66736D] block text-right mt-0.5">
                              {formatCurrency(gem.price)}
                            </span>
                          </div>

                          {/* Subtotal y Botón Eliminar */}
                          <div className="flex items-center justify-between md:justify-end space-x-3 w-full md:w-auto pt-1 md:pt-0">
                            <div className="text-right">
                              <span className="text-[10px] text-[#66736D] block">Subtotal</span>
                              <span className="font-mono font-bold text-xs text-[#17201D]">
                                {formatCurrency(itemSubtotal)}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveGem(gem.id)}
                              className="p-1.5 text-[#9CA9A3] hover:text-[#B42318] transition rounded"
                              title="Eliminar gema"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECCIÓN 3: MANO DE OBRA Y HECHURA (SOLO PERSONALIZADA) */}
              <div className="bg-white rounded-xl border border-[#DDE3E0] p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#DDE3E0] pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-[#E6F5ED] text-[#17734B] flex items-center justify-center font-bold">
                      <Hammer className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#17201D]">
                        3. Mano de Obra y Hechura (Personalizada)
                      </h3>
                      <p className="text-[11px] text-[#66736D]">
                        Ingrese el valor de confección acordado para la pieza y notas técnicas de taller.
                      </p>
                    </div>
                  </div>
                  <Badge variant="success" size="sm">
                    {formatCurrency(craftsmanshipPrice)}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#17201D] mb-1.5">
                      Descripción de la Hechura
                    </label>
                    <input
                      type="text"
                      value={craftsmanshipDescription}
                      onChange={(e) => setCraftsmanshipDescription(e.target.value)}
                      placeholder="Ej: Forja artesanal en frío, calado y terminado espejo"
                      className="w-full px-3 py-2 text-xs border border-[#DDE3E0] rounded-lg focus:outline-none focus:border-[#176B52] bg-white font-medium"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#17201D]">
                        Valor de Mano de Obra (COP)
                      </label>
                      <span className="font-mono text-xs font-bold text-[#17734B]">
                        {formatCurrency(craftsmanshipPrice)}
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#9CA9A3] font-mono">
                        $
                      </span>
                      <input
                        type="number"
                        step="20000"
                        min="0"
                        value={craftsmanshipPrice}
                        onChange={(e) => setCraftsmanshipPrice(Number(e.target.value) || 0)}
                        className="w-full pl-7 pr-3 py-2 text-xs font-mono font-bold text-[#17201D] border border-[#DDE3E0] rounded-lg focus:outline-none focus:border-[#176B52] bg-white"
                        placeholder="850000"
                      />
                    </div>
                    <span className="text-[10px] text-[#66736D] mt-0.5 block">
                      Tarifa directa de taller para esta pieza.
                    </span>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 4: LÍNEAS ADICIONALES LIBRES */}
              <div className="bg-white rounded-xl border border-[#DDE3E0] p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#DDE3E0] pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-[#17201D]">
                      4. Conceptos e Insumos Adicionales ({additionalItems.length})
                    </h3>
                    <p className="text-[11px] text-[#66736D]">
                      Agregue cualquier concepto libre si es necesario (ej: Render 3D, estuche especial, flete).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddAdditionalItem}
                    className="px-2.5 py-1 text-xs font-semibold rounded-md border border-[#DDE3E0] bg-[#F4F6F8] text-[#17201D] hover:bg-[#DDE3E0] transition flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Concepto Libre</span>
                  </button>
                </div>

                {additionalItems.length > 0 && (
                  <div className="space-y-2">
                    {additionalItems.map((it) => (
                      <div
                        key={it.id}
                        className="p-2.5 rounded-lg border border-[#DDE3E0] bg-[#F4F6F8] flex items-center gap-2"
                      >
                        <input
                          type="text"
                          value={it.description}
                          onChange={(e) =>
                            handleUpdateAdditionalItem(it.id, 'description', e.target.value)
                          }
                          placeholder="Descripción del concepto..."
                          className="flex-1 px-2.5 py-1 text-xs border border-[#DDE3E0] rounded bg-white"
                        />
                        <div className="w-16">
                          <input
                            type="number"
                            min="1"
                            value={it.quantity}
                            onChange={(e) =>
                              handleUpdateAdditionalItem(
                                it.id,
                                'quantity',
                                Number(e.target.value) || 0
                              )
                            }
                            className="w-full px-2 py-1 text-xs font-mono text-center border border-[#DDE3E0] rounded bg-white"
                          />
                        </div>
                        <div className="w-28">
                          <input
                            type="number"
                            step="5000"
                            value={it.unitPrice}
                            onChange={(e) =>
                              handleUpdateAdditionalItem(
                                it.id,
                                'unitPrice',
                                Number(e.target.value) || 0
                              )
                            }
                            className="w-full px-2 py-1 text-xs font-mono text-right border border-[#DDE3E0] rounded bg-white"
                          />
                        </div>
                        <span className="font-mono text-xs font-bold text-[#17201D] w-24 text-right">
                          {formatCurrency(it.quantity * it.unitPrice)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAdditionalItem(it.id)}
                          className="p-1 text-[#9CA9A3] hover:text-[#B42318] transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VISTA 2: DESGLOSE COMERCIAL FINAL */}
          {activeTab === 'review' && (
            <div className="bg-white rounded-xl border border-[#DDE3E0] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#DDE3E0] pb-3">
                <div>
                  <h3 className="font-bold text-sm text-[#17201D]">
                    Desglose Compilado de la Cotización Comercial
                  </h3>
                  <p className="text-[11px] text-[#66736D]">
                    Estas son las {compiledQuoteItems.length} líneas detalladas que se guardarán e insertarán en la Orden de Taller.
                  </p>
                </div>
                <Badge variant="gold" size="sm">
                  {formatCurrency(grandTotal)}
                </Badge>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-[520px] text-xs text-left">
                  <thead className="bg-[#F4F6F8] text-[#66736D] uppercase text-[10px] tracking-wider font-semibold border-b border-[#DDE3E0]">
                    <tr>
                      <th className="py-2.5 px-3">Línea Presupuestada</th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap">Cant.</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">Precio Unitario</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDE3E0]">
                    {compiledQuoteItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#F4F6F8]/60">
                        <td className="py-3 px-3 font-medium text-[#17201D]">
                          <span className="block font-bold">{item.description}</span>
                          <span className="text-[10px] uppercase font-bold text-[#9CA9A3]">
                            Categoría: {item.category || 'general'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono whitespace-nowrap">{item.quantity}</td>
                        <td className="py-3 px-3 text-right font-mono text-[#66736D] whitespace-nowrap">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-[#17201D] whitespace-nowrap">
                          {formatCurrency(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-3 border-t border-[#DDE3E0] flex justify-end">
                <div className="text-right space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#66736D] block">
                    Total General de Cotización:
                  </span>
                  <span className="text-2xl font-mono font-bold text-[#17201D]">
                    {formatCurrency(grandTotal)} COP
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Panel Lateral: Liquidación Financiera en Vivo y Aprobación */}
        <div className="space-y-4">
          <div className="bg-[#17211D] text-[#EDF5F2] rounded-2xl border border-[#22332C] p-6 shadow-xl space-y-5">
            <div className="flex items-center space-x-2 text-[#A57525]">
              <Calculator className="w-5 h-5" />
              <h3 className="font-serif font-bold text-base text-[#EDF5F2]">
                Liquidación de Joya
              </h3>
            </div>

            {/* Desglose por Componente con separador de miles */}
            <div className="space-y-2 text-xs border-b border-[#22332C] pb-4">
              <div className="flex justify-between items-start text-[#9CA9A3]">
                <div>
                  <span>Metal Base ({formatGrams(gramsNet)} netos):</span>
                  {includeMerma && grossGrams > 0 && (
                    <span className="block text-[10px] text-[#66736D]">
                      Control taller: {formatGrams(grossGrams)} brutos
                    </span>
                  )}
                </div>
                <span className="font-mono text-[#EDF5F2] font-semibold">
                  {formatCurrency(metalSubtotal)}
                </span>
              </div>
              <div className="flex justify-between text-[#9CA9A3]">
                <span>Gemas & Diamantes ({gems.length}):</span>
                <span className="font-mono text-[#EDF5F2] font-semibold">
                  {formatCurrency(gemsSubtotal)}
                </span>
              </div>
              <div className="flex justify-between text-[#9CA9A3]">
                <span>Mano de Obra Personalizada:</span>
                <span className="font-mono text-[#EDF5F2] font-semibold">
                  {formatCurrency(craftsmanshipPrice)}
                </span>
              </div>
              {additionalSubtotal > 0 && (
                <div className="flex justify-between text-[#9CA9A3]">
                  <span>Conceptos Adicionales:</span>
                  <span className="font-mono text-[#EDF5F2] font-semibold">
                    {formatCurrency(additionalSubtotal)}
                  </span>
                </div>
              )}
            </div>

            {/* Total General con miles claros */}
            <div className="text-center py-2 bg-[#22332C]/50 rounded-xl border border-[#2d4239] p-3">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#9CA9A3] block">
                Valor Total Cotizado (COP)
              </span>
              <span className="text-3xl font-mono font-bold text-[#FAF1DA] tracking-tight block mt-1">
                {formatCurrency(grandTotal)}
              </span>
              <span className="text-[10px] text-[#9CA9A3] mt-1 block">
                Vigencia: {validUntilDays} días calendario
              </span>
            </div>

            {/* Regla de Pagos de Taller (50% / 50%) */}
            <div className="p-3.5 bg-[#17201D] rounded-xl border border-[#2b3d35] space-y-2.5 text-xs">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#A57525] block">
                Condiciones de Pago del Taller
              </span>

              <div className="flex justify-between items-center">
                <span className="text-[#EDF5F2]">Anticipo para Fundición (50%):</span>
                <span className="font-mono font-bold text-[#E6F5ED]">
                  {formatCurrency(Math.round(grandTotal * 0.5))}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#9CA9A3]">Saldo Contra Entrega (50%):</span>
                <span className="font-mono font-semibold text-[#9CA9A3]">
                  {formatCurrency(Math.round(grandTotal * 0.5))}
                </span>
              </div>

              <p className="text-[10px] text-[#66736D] leading-tight pt-1">
                * El anticipo es indispensable para fundir el metal y separar gemas de bodega.
              </p>
            </div>

            {/* Botones de Acción con Alto Contraste */}
            <div className="pt-2 space-y-2.5">
              <Button
                variant="gold"
                size="lg"
                onClick={handleSaveAndApprove}
                isLoading={createQuoteMutation.isPending || approveQuoteMutation.isPending}
                className="w-full font-bold shadow-md hover:shadow-lg transition"
              >
                Aprobar y Generar Orden de Taller
              </Button>

              {/* Botón Guardar Borrador con fondo blanco/crema de alto contraste y texto visible */}
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={createQuoteMutation.isPending}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-[#FAF1DA] text-[#17201D] font-bold text-xs shadow-md border border-white hover:border-[#A57525] transition flex items-center justify-center space-x-2"
              >
                <FileText className="w-4 h-4 text-[#A57525]" />
                <span>Guardar como Borrador Comercial</span>
              </button>
            </div>
          </div>

          {/* Historial Rápido de Cotizaciones */}
          <div className="bg-white rounded-xl border border-[#DDE3E0] p-4 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#17201D] mb-3">
              Cotizaciones Recientes
            </h4>
            <div className="space-y-2 text-xs">
              {quotes.slice(0, 5).map((q) => (
                <div
                  key={q.id}
                  className="p-2.5 rounded-lg bg-[#F4F6F8] flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-[#17201D] block">
                      {q.client?.fullName}
                    </span>
                    <span className="text-[10px] font-mono text-[#66736D]">
                      #{q.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-[#176B52] block">
                      {formatCurrency(q.totalAmount)}
                    </span>
                    <Badge
                      variant={q.status === 'APROBADA' ? 'success' : 'gold'}
                      size="sm"
                    >
                      {q.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

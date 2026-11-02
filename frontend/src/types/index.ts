export type Role = 'ADMIN' | 'ASESOR' | 'JOYERO';

export type OrderStatus = 'CREADO' | 'FABRICACION' | 'CALIDAD' | 'ENTREGADO' | 'CANCELADO';

export type QuoteStatus = 'BORRADOR' | 'ENVIADA' | 'APROBADA' | 'RECHAZADA';

export type PaymentMethod = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';

export type MaterialType =
  | 'ORO_AMARILLO_18K'
  | 'ORO_BLANCO_18K'
  | 'ORO_ROSA_18K'
  | 'ORO_14K'
  | 'ORO_10K'
  | 'PLATA_925'
  | 'PIEDRA_PRECIOSA';

export type MeasurementUnit = 'GRAMOS' | 'KILATES';

export type AttachmentType =
  | 'BOCETO_REFERENCIA'
  | 'RENDER_3D'
  | 'CONTROL_CALIDAD'
  | 'CERTIFICADO';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
}

export interface Client {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  documentId?: string | null;
}

export interface OrderAttachment {
  id: string;
  orderId: string;
  fileUrl: string;
  fileName: string;
  fileType: AttachmentType;
  description?: string | null;
  createdAt: string;
}

export interface Material {
  id: string;
  name: string;
  type: MaterialType;
  unit: MeasurementUnit;
  stock: number;
  minStock: number;
  isLowStock?: boolean;
}

export interface OrderMaterial {
  id: string;
  orderId: string;
  materialId: string;
  material: Material;
  quantity: number;
  createdAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  registeredById: string;
  registeredBy?: { fullName: string };
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNotes?: string | null;
  createdAt: string;
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  userId: string;
  user?: { fullName: string };
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  note?: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  quoteId?: string | null;
  quote?: Quote | null;
  clientId: string;
  client: Client;
  artisanId?: string | null;
  artisan?: { id: string; fullName: string } | null;
  createdById?: string;
  createdBy?: { id: string; fullName: string } | null;
  status: OrderStatus;
  description: string;
  totalPactado: number;
  totalAbonado?: number;
  saldoPendiente?: number;
  estimatedDelivery?: string | null;
  deliveryDate?: string | null;
  materialsUsed?: OrderMaterial[];
  payments?: Payment[];
  statusHistory?: OrderStatusHistory[];
  attachments?: OrderAttachment[];
  materialsCount?: number;
  createdAt: string;
  updatedAt?: string;
  financialSummary?: {
    totalPactado: number;
    totalAbonado: number;
    saldoPendiente: number;
    estaLiquidado: boolean;
  };
}

export interface QuoteItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  category?: 'metal' | 'piedra' | 'mano_obra' | 'engaste' | 'otro';
}

export interface Quote {
  id: string;
  clientId: string;
  client: Client;
  createdById: string;
  createdBy?: { fullName: string };
  status: QuoteStatus;
  totalAmount: number;
  validUntil?: string | null;
  items: QuoteItem[];
  order?: { id: string; status: OrderStatus } | null;
  createdAt: string;
}

export interface DashboardMetrics {
  financiero: {
    totalFacturado: number;
    totalRecaudado: number;
    carteraPendiente: number;
  };
  taller: {
    pedidosActivos: number;
    enFabricacion: number;
    enControlCalidad: number;
    entregasProximos7Dias: number;
  };
  inventario: {
    materialesCriticosCount: number;
    alertasStock: Array<{
      id: string;
      nombre: string;
      stockActual: number;
      stockMinimo: number;
      unidad: string;
    }>;
  };
  comercial: {
    cotizacionesPendientes: number;
  };
}

export interface MetalReturnPayload {
  materialId: string;
  finalPieceWeight: number; // Peso de la joya en gramos (ej. 7.250)
  scrapWeight: number;      // Limalla/sobrante devuelto (ej. 2.300)
  notes?: string;
}

export interface MetalReturnResponse {
  balance: {
    metalEntregado: number;
    pesoJoyaFinal: number;
    limallaRetornada: number;
    mermaTecnica: number;
    porcentajeMerma: string;
    mermaInusual: boolean;
  };
  nuevoStockMaterial: number;
  unidad: string;
  auditId: string;
}

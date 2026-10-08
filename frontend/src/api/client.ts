import {
  MOCK_ORDERS,
  MOCK_MATERIALS,
  MOCK_QUOTES,
  MOCK_DASHBOARD,
  MOCK_USERS,
  MOCK_CLIENTS,
} from './mockData';
import {
  Order,
  Material,
  Quote,
  DashboardMetrics,
  OrderStatus,
  PaymentMethod,
  MetalReturnPayload,
  MetalReturnResponse,
  Client,
  User,
  Role,
} from '../types';

// In-memory reactive stores
let currentOrders: Order[] = [...MOCK_ORDERS];
let currentMaterials: Material[] = [...MOCK_MATERIALS];
let currentQuotes: Quote[] = [...MOCK_QUOTES];

const API_BASE = '/api';

import { REAL_ROLE_TOKENS, DB_USERS } from '../hooks/useAuth';

export const apiClient = {
  getToken(): string {
    const token = localStorage.getItem('alkisu_token');
    if (token && token !== 'undefined' && token !== 'null') {
      return token;
    }
    return REAL_ROLE_TOKENS.ADMIN;
  },

  setToken(token: string) {
    localStorage.setItem('alkisu_token', token);
  },

  clearToken() {
    localStorage.removeItem('alkisu_token');
  },

  // ---- AUTENTICACIÓN ----
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const data = await res.json();
        this.setToken(data.token);
        return data;
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Credenciales inválidas');
    } catch (e: any) {
      if (e.message && e.message !== 'Failed to fetch') {
        throw e;
      }
      // Demo fallback if network is unreachable
      const mock = Object.values(DB_USERS).find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (mock && (password === 'alkisu123' || password === 'admin123')) {
        const token = REAL_ROLE_TOKENS[mock.role];
        this.setToken(token);
        return { token, user: mock };
      }
      throw new Error(e.message || 'Error al iniciar sesión');
    }
  },

  async register(payload: { fullName: string; email: string; password: string; role: Role }): Promise<{ token: string; user: User }> {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return await this.login(payload.email, payload.password);
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al registrar usuario');
    } catch (e: any) {
      if (e.message && e.message !== 'Failed to fetch') {
        throw e;
      }
      const newUser: User = {
        id: `usr-${Date.now()}`,
        fullName: payload.fullName,
        email: payload.email,
        role: payload.role,
      };
      const token = REAL_ROLE_TOKENS[payload.role];
      this.setToken(token);
      return { token, user: newUser };
    }
  },

  // ---- PEDIDOS ----
  async getOrders(params?: { status?: OrderStatus; artisanId?: string; clientId?: string }): Promise<Order[]> {
    try {
      const url = new URL(`${window.location.origin}${API_BASE}/orders`);
      if (params?.status) url.searchParams.set('status', params.status);
      if (params?.artisanId) url.searchParams.set('artisanId', params.artisanId);
      if (params?.clientId) url.searchParams.set('clientId', params.clientId);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${this.getToken()}` },
      });
      if (res.ok) {
        const json = await res.json();
        const list = json.data || json;
        if (Array.isArray(list)) {
          return list;
        }
      }
    } catch {
      // Fallback a store local
    }

    let filtered = [...currentOrders];
    if (params?.status) filtered = filtered.filter((o) => o.status === params.status);
    if (params?.artisanId) filtered = filtered.filter((o) => o.artisanId === params.artisanId);
    if (params?.clientId) filtered = filtered.filter((o) => o.clientId === params.clientId);
    return filtered;
  },

  async getOrder(id: string): Promise<Order> {
    try {
      const res = await fetch(`${API_BASE}/orders/${id}`, {
        headers: { Authorization: `Bearer ${this.getToken()}` },
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }

    const found = currentOrders.find((o) => o.id === id);
    if (!found) throw new Error('Pedido no encontrado');
    return found;
  },

  async updateOrderStatus(id: string, newStatus: OrderStatus, note?: string): Promise<Order> {
    try {
      const res = await fetch(`${API_BASE}/orders/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getToken()}`,
        },
        body: JSON.stringify({ newStatus, note }),
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }

    const orderIndex = currentOrders.findIndex((o) => o.id === id);
    if (orderIndex === -1) throw new Error('Pedido no encontrado');

    const order = currentOrders[orderIndex];

    // Regla de negocio: no entregar con saldo pendiente
    if (newStatus === 'ENTREGADO' && (order.saldoPendiente ?? 0) > 0) {
      throw new Error(`Entrega rechazada: el pedido tiene un saldo pendiente de $${order.saldoPendiente?.toLocaleString()}`);
    }

    const updated: Order = {
      ...order,
      status: newStatus,
      deliveryDate: newStatus === 'ENTREGADO' ? new Date().toISOString() : order.deliveryDate,
      statusHistory: [
        {
          id: `sh-${Date.now()}`,
          orderId: id,
          userId: 'current-user',
          user: { fullName: 'Usuario Activo' },
          fromStatus: order.status,
          toStatus: newStatus,
          note: note || `Estado actualizado a ${newStatus}`,
          createdAt: new Date().toISOString(),
        },
        ...(order.statusHistory || []),
      ],
    };

    currentOrders[orderIndex] = updated;
    return updated;
  },

  async registerMetalReturn(orderId: string, payload: MetalReturnPayload): Promise<MetalReturnResponse> {
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/metal-return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getToken()}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }

    const order = currentOrders.find((o) => o.id === orderId);
    if (!order) throw new Error('Pedido no encontrado');

    const materialUsed = order.materialsUsed?.find((m) => m.materialId === payload.materialId);
    const entregado = materialUsed ? materialUsed.quantity : 11.5;

    const devueltoTotal = payload.finalPieceWeight + payload.scrapWeight;
    if (devueltoTotal > entregado) {
      throw new Error(`El peso devuelto total (${devueltoTotal}g) excede el metal entregado (${entregado}g)`);
    }

    const merma = Number((entregado - devueltoTotal).toFixed(2));
    const porcentajeMerma = ((merma / entregado) * 100).toFixed(2);
    const mermaInusual = parseFloat(porcentajeMerma) > 8.0;

    // Actualizar historial del pedido
    order.statusHistory = [
      {
        id: `sh-${Date.now()}`,
        orderId,
        userId: 'artisan',
        user: { fullName: order.artisan?.fullName || 'Joyero de Mesa' },
        fromStatus: order.status,
        toStatus: order.status,
        note: `Cierre de mesa: Joya ${payload.finalPieceWeight.toFixed(2)}g, Limalla devuelta ${payload.scrapWeight.toFixed(2)}g, Merma ${merma.toFixed(2)}g (${porcentajeMerma}%). ${payload.notes ? `Nota: ${payload.notes}` : ''}`,
        createdAt: new Date().toISOString(),
      },
      ...(order.statusHistory || []),
    ];

    return {
      balance: {
        metalEntregado: entregado,
        pesoJoyaFinal: payload.finalPieceWeight,
        limallaRetornada: payload.scrapWeight,
        mermaTecnica: merma,
        porcentajeMerma: `${porcentajeMerma}%`,
        mermaInusual,
      },
      nuevoStockMaterial: 247.88,
      unidad: 'GRAMOS',
      auditId: `aud-${Date.now()}`,
    };
  },

  async addPayment(orderId: string, data: { amount: number; paymentMethod: PaymentMethod; referenceNotes?: string }): Promise<Order> {
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getToken()}`,
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        return await this.getOrder(orderId);
      }
    } catch {
      // Fallback
    }

    const orderIndex = currentOrders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) throw new Error('Pedido no encontrado');

    const order = currentOrders[orderIndex];
    const totalAbonado = (order.totalAbonado || 0) + data.amount;
    const saldoPendiente = Math.max(0, order.totalPactado - totalAbonado);

    const newPayment = {
      id: `pay-${Date.now()}`,
      orderId,
      registeredById: 'current-user',
      registeredBy: { fullName: 'Caja Alkisu' },
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      referenceNotes: data.referenceNotes,
      createdAt: new Date().toISOString(),
    };

    const updated: Order = {
      ...order,
      totalAbonado,
      saldoPendiente,
      payments: [newPayment, ...(order.payments || [])],
      financialSummary: {
        totalPactado: order.totalPactado,
        totalAbonado,
        saldoPendiente,
        estaLiquidado: saldoPendiente === 0,
      },
    };

    currentOrders[orderIndex] = updated;
    return updated;
  },

  async cancelOrder(orderId: string, reason: string): Promise<Order> {
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getToken()}`,
        },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }

    const orderIndex = currentOrders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) throw new Error('Pedido no encontrado');

    const order = currentOrders[orderIndex];
    if (order.status === 'ENTREGADO') throw new Error('No se puede cancelar una joya ya entregada');

    const updated: Order = {
      ...order,
      status: 'CANCELADO',
      statusHistory: [
        {
          id: `sh-${Date.now()}`,
          orderId,
          userId: 'current-user',
          user: { fullName: 'Administración' },
          fromStatus: order.status,
          toStatus: 'CANCELADO',
          note: `CANCELACIÓN: ${reason}`,
          createdAt: new Date().toISOString(),
        },
        ...(order.statusHistory || []),
      ],
    };

    currentOrders[orderIndex] = updated;
    return updated;
  },

  async addAttachment(orderId: string, file: { fileName: string; fileUrl: string; fileType: any; description?: string }) {
    const orderIndex = currentOrders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) throw new Error('Pedido no encontrado');

    const newAttachment = {
      id: `att-${Date.now()}`,
      orderId,
      fileName: file.fileName,
      fileUrl: file.fileUrl,
      fileType: file.fileType,
      description: file.description,
      createdAt: new Date().toISOString(),
    };

    currentOrders[orderIndex] = {
      ...currentOrders[orderIndex],
      attachments: [...(currentOrders[orderIndex].attachments || []), newAttachment],
    };

    return newAttachment;
  },

  // ---- MATERIALES / BODEGA ----
  async getMaterials(): Promise<Material[]> {
    try {
      const res = await fetch(`${API_BASE}/materials`, {
        headers: { Authorization: `Bearer ${this.getToken()}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json)) {
          return json.map((m: any) => ({
            ...m,
            stock: Number(m.stock),
            minStock: Number(m.minStock),
            isLowStock: Number(m.stock) <= Number(m.minStock),
          }));
        }
      }
    } catch {
      // Fallback
    }
    return currentMaterials.map((m) => ({
      ...m,
      isLowStock: m.stock <= m.minStock,
    }));
  },

  async restockMaterial(id: string, quantity: number, notes?: string): Promise<Material> {
    try {
      const res = await fetch(`${API_BASE}/materials/${id}/restock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getToken()}`,
        },
        body: JSON.stringify({ quantity, notes }),
      });
      if (res.ok) {
        const json = await res.json();
        const mat = json.material || json;
        return {
          ...mat,
          stock: Number(mat.stock),
          minStock: Number(mat.minStock),
          isLowStock: Number(mat.stock) <= Number(mat.minStock),
        };
      }
    } catch {
      // Fallback
    }

    const idx = currentMaterials.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error('Material no encontrado');

    const updated = {
      ...currentMaterials[idx],
      stock: Number((currentMaterials[idx].stock + quantity).toFixed(3)),
    };
    updated.isLowStock = updated.stock <= updated.minStock;

    currentMaterials[idx] = updated;
    return updated;
  },

  // ---- COTIZACIONES ----
  async getQuotes(): Promise<Quote[]> {
    try {
      const res = await fetch(`${API_BASE}/quotes`, {
        headers: { Authorization: `Bearer ${this.getToken()}` },
      });
      if (res.ok) {
        const json = await res.json();
        const list = Array.isArray(json) ? json : json.data;
        if (Array.isArray(list)) return list;
      }
    } catch {
      // Fallback
    }
    return currentQuotes;
  },

  async createQuote(data: { clientId: string; items: any[]; validUntil?: string }): Promise<Quote> {
    try {
      const res = await fetch(`${API_BASE}/quotes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getToken()}`,
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const json = await res.json();
        currentQuotes = [json, ...currentQuotes];
        return json;
      }
    } catch {
      // Fallback
    }

    const client = MOCK_CLIENTS.find((c) => c.id === data.clientId) || MOCK_CLIENTS[0];
    const totalAmount = data.items.reduce((acc, it) => acc + (it.quantity * it.unitPrice), 0);

    const newQuote: Quote = {
      id: `qte-${Date.now()}`,
      clientId: client.id,
      client,
      createdById: 'usr-asesor-1',
      createdBy: { fullName: 'Valeria Morales' },
      status: 'BORRADOR',
      totalAmount,
      validUntil: data.validUntil || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      items: data.items.map((it) => ({
        ...it,
        subtotal: it.quantity * it.unitPrice,
      })),
      createdAt: new Date().toISOString(),
    };

    currentQuotes = [newQuote, ...currentQuotes];
    return newQuote;
  },

  async approveQuote(id: string, artisanId?: string): Promise<{ quote: Quote; order: Order }> {
    try {
      const res = await fetch(`${API_BASE}/quotes/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getToken()}`,
        },
        body: JSON.stringify({ artisanId }),
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }

    const qIdx = currentQuotes.findIndex((q) => q.id === id);
    if (qIdx === -1) throw new Error('Cotización no encontrada');

    const quote = currentQuotes[qIdx];
    quote.status = 'APROBADA';

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      quoteId: quote.id,
      clientId: quote.clientId,
      client: quote.client,
      artisanId: artisanId || 'usr-joyero-1',
      artisan: { id: artisanId || 'usr-joyero-1', fullName: 'Maestro Mateo Rivera' },
      createdById: quote.createdById,
      createdBy: { id: quote.createdById, fullName: 'Valeria Morales' },
      status: 'CREADO',
      description: `Pieza generada desde cotización #${quote.id.slice(-4)}: ${quote.items.map((i) => i.description).join(', ')}`,
      totalPactado: quote.totalAmount,
      totalAbonado: 0,
      saldoPendiente: quote.totalAmount,
      estimatedDelivery: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
      materialsCount: 0,
      createdAt: new Date().toISOString(),
      materialsUsed: [],
      payments: [],
      attachments: [],
      statusHistory: [
        {
          id: `sh-${Date.now()}`,
          orderId: `ord-${Date.now()}`,
          userId: 'usr-asesor-1',
          user: { fullName: 'Valeria Morales' },
          fromStatus: 'CREADO',
          toStatus: 'CREADO',
          note: `Orden de trabajo generada automáticamente desde cotización #${quote.id}`,
          createdAt: new Date().toISOString(),
        },
      ],
      financialSummary: {
        totalPactado: quote.totalAmount,
        totalAbonado: 0,
        saldoPendiente: quote.totalAmount,
        estaLiquidado: false,
      },
    };

    quote.order = { id: newOrder.id, status: 'CREADO' };
    currentOrders = [newOrder, ...currentOrders];

    return { quote, order: newOrder };
  },

  // ---- DASHBOARD ----
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      const res = await fetch(`${API_BASE}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${this.getToken()}` },
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }

    // Dynamic calculation from local store
    let facturado = 0;
    let recaudado = 0;
    let cartera = 0;
    let enFabricacion = 0;
    let enCalidad = 0;

    currentOrders.forEach((o) => {
      facturado += o.totalPactado;
      recaudado += o.totalAbonado || 0;
      if (o.status !== 'ENTREGADO' && o.status !== 'CANCELADO') {
        cartera += o.saldoPendiente || 0;
      }
      if (o.status === 'FABRICACION') enFabricacion++;
      if (o.status === 'CALIDAD') enCalidad++;
    });

    const lowStock = currentMaterials.filter((m) => m.stock <= m.minStock);

    return {
      financiero: {
        totalFacturado: facturado,
        totalRecaudado: recaudado,
        carteraPendiente: cartera,
      },
      taller: {
        pedidosActivos: currentOrders.filter((o) => o.status !== 'ENTREGADO' && o.status !== 'CANCELADO').length,
        enFabricacion,
        enControlCalidad: enCalidad,
        entregasProximos7Dias: 2,
      },
      inventario: {
        materialesCriticosCount: lowStock.length,
        alertasStock: lowStock.map((m) => ({
          id: m.id,
          nombre: m.name,
          stockActual: m.stock,
          stockMinimo: m.minStock,
          unidad: m.unit,
        })),
      },
      comercial: {
        cotizacionesPendientes: currentQuotes.filter((q) => q.status === 'BORRADOR').length,
      },
    };
  },

  // ---- CLIENTES Y USUARIOS ----
  async getClients(): Promise<Client[]> {
    try {
      const res = await fetch(`${API_BASE}/clients`, {
        headers: { Authorization: `Bearer ${this.getToken()}` },
      });
      if (res.ok) {
        const json = await res.json();
        const list = Array.isArray(json) ? json : json.data;
        if (Array.isArray(list) && list.length > 0) {
          return list;
        }
      }
    } catch {
      // Fallback
    }
    return MOCK_CLIENTS;
  },

  async createClient(data: { fullName: string; phone: string; email?: string; documentId?: string }): Promise<Client> {
    try {
      const res = await fetch(`${API_BASE}/clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getToken()}`,
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    const newClient: Client = {
      id: `cli-${Date.now()}`,
      fullName: data.fullName,
      phone: data.phone,
      email: data.email,
      documentId: data.documentId,
    };
    return newClient;
  },

  async getUsers(): Promise<User[]> {
    try {
      const res = await fetch(`${API_BASE}/users`, {
        headers: { Authorization: `Bearer ${this.getToken()}` },
      });
      if (res.ok) {
        const json = await res.json();
        return json.data || json;
      }
    } catch {
      // Fallback
    }
    return MOCK_USERS;
  },
};

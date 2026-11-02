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
  MaterialType,
  MeasurementUnit,
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
import { REAL_ROLE_TOKENS, DB_USERS, isTokenExpired } from '../hooks/useAuth';

// In-memory reactive stores
let currentOrders: Order[] = [...MOCK_ORDERS];
let currentMaterials: Material[] = [...MOCK_MATERIALS];
let currentQuotes: Quote[] = [...MOCK_QUOTES];
let currentClients: Client[] = [...MOCK_CLIENTS];

const rawBase = import.meta.env.VITE_API_URL || '/api';
const API_BASE = rawBase.replace(/\/+$/, '');

export const apiClient = {
  getToken(): string {
    const token = localStorage.getItem('alkisu_token');
    if (token && token !== 'undefined' && token !== 'null') {
      if (isTokenExpired(token)) {
        this.clearToken();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('alkisu:auth_expired'));
        }
        return '';
      }
      return token;
    }
    return '';
  },

  setToken(token: string) {
    localStorage.setItem('alkisu_token', token);
  },

  clearToken() {
    localStorage.removeItem('alkisu_token');
    localStorage.removeItem('alkisu_user');
  },

  async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const token = this.getToken();
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      this.clearToken();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('alkisu:auth_expired'));
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Sesión expirada o token inválido. Inicie sesión de nuevo.');
    }

    if (res.status === 403) {
      const err = await res.clone().json().catch(() => ({}));
      if (err.error && err.error.toLowerCase().includes('token')) {
        this.clearToken();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('alkisu:auth_expired'));
        }
        throw new Error('Token inválido o expirado');
      }
    }

    return res;
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
      const fullUrl = API_BASE.startsWith('http')
        ? `${API_BASE}/orders`
        : `${window.location.origin}${API_BASE}/orders`;
      const url = new URL(fullUrl);
      if (params?.status) url.searchParams.set('status', params.status);
      if (params?.artisanId) url.searchParams.set('artisanId', params.artisanId);
      if (params?.clientId) url.searchParams.set('clientId', params.clientId);
      url.searchParams.set('limit', '100');

      const res = await this.fetchWithAuth(url.toString());
      if (res.ok) {
        const json = await res.json();
        const list = json.data || json;
        if (Array.isArray(list)) {
          currentOrders = list;
          return list;
        }
      }
    } catch (e: any) {
      if (e.message && e.message.includes('Sesión expirada')) throw e;
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
      const res = await this.fetchWithAuth(`${API_BASE}/orders/${id}`);
      if (res.ok) {
        const data = await res.json();
        const existingIdx = currentOrders.findIndex((o) => o.id === id);
        if (existingIdx !== -1) {
          currentOrders[existingIdx] = data;
        } else {
          currentOrders.unshift(data);
        }
        return data;
      }
      if (res.status === 404) throw new Error('Pedido no encontrado');
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al consultar pedido');
    } catch (e: any) {
      if (e.message && e.message !== 'Failed to fetch') throw e;
    }

    const found = currentOrders.find((o) => o.id === id);
    if (!found) throw new Error('Pedido no encontrado');
    return found;
  },

  async updateOrderStatus(id: string, newStatus: OrderStatus, note?: string, artisanId?: string): Promise<Order> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, newStatus, note, artisanId }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.order || data;
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al actualizar estado del pedido');
    } catch (e: any) {
      if (e.message && e.message !== 'Failed to fetch') throw e;
    }

    const orderIndex = currentOrders.findIndex((o) => o.id === id);
    if (orderIndex === -1) throw new Error('Pedido no encontrado');

    const order = currentOrders[orderIndex];

    if (newStatus === 'ENTREGADO' && (order.saldoPendiente ?? 0) > 0) {
      throw new Error(`Entrega rechazada: el pedido tiene un saldo pendiente de $${order.saldoPendiente?.toLocaleString()}`);
    }

    const updated: Order = {
      ...order,
      status: newStatus,
      artisanId: artisanId || order.artisanId,
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

  async assignArtisan(orderId: string, artisanId: string): Promise<Order> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/orders/${orderId}/artisan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artisanId }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.order || data;
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al asignar joyero');
    } catch (e: any) {
      if (e.message && e.message !== 'Failed to fetch') throw e;
    }

    const orderIndex = currentOrders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) throw new Error('Pedido no encontrado');

    const user = Object.values(DB_USERS).find((u) => u.id === artisanId) || {
      id: artisanId,
      fullName: 'Joyero Asignado',
      email: 'joyero@joyeria.com',
      role: 'JOYERO' as Role,
    };

    const updated: Order = {
      ...currentOrders[orderIndex],
      artisanId,
      artisan: user,
      statusHistory: [
        {
          id: `sh-${Date.now()}`,
          orderId,
          userId: 'current-user',
          user: { fullName: 'Administración' },
          fromStatus: currentOrders[orderIndex].status,
          toStatus: currentOrders[orderIndex].status,
          note: `Joyero asignado: ${user.fullName}`,
          createdAt: new Date().toISOString(),
        },
        ...(currentOrders[orderIndex].statusHistory || []),
      ],
    };

    currentOrders[orderIndex] = updated;
    return updated;
  },

  async consumeOrderMaterial(orderId: string, payload: { materialId: string; quantity: number }): Promise<any> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/orders/${orderId}/materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return await res.json();
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al despachar material');
    } catch (e: any) {
      if (e.message && e.message !== 'Failed to fetch') throw e;
    }

    const orderIndex = currentOrders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) throw new Error('Pedido no encontrado');

    const mat = currentMaterials.find((m) => m.id === payload.materialId);
    if (!mat) throw new Error('Material no encontrado');
    if (mat.stock < payload.quantity) throw new Error('Stock insuficiente en bodega');

    mat.stock = Number((mat.stock - payload.quantity).toFixed(3));

    const newMaterialUsage = {
      id: `om-${Date.now()}`,
      orderId,
      materialId: mat.id,
      material: mat,
      quantity: payload.quantity,
      createdAt: new Date().toISOString(),
    };

    currentOrders[orderIndex] = {
      ...currentOrders[orderIndex],
      materialsUsed: [...(currentOrders[orderIndex].materialsUsed || []), newMaterialUsage],
      materialsCount: (currentOrders[orderIndex].materialsCount || 0) + 1,
    };

    return newMaterialUsage;
  },

  async registerMetalReturn(orderId: string, payload: MetalReturnPayload): Promise<MetalReturnResponse> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/orders/${orderId}/metal-return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al registrar liquidación');
    } catch (e: any) {
      if (e.message && e.message !== 'Failed to fetch') throw e;
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
        porcentajeMerma: porcentajeMerma + '%',
        mermaInusual,
      },
      nuevoStockMaterial: 125.4,
      unidad: 'GRAMOS',
      auditId: `aud-${Date.now()}`,
    };
  },

  async addPayment(orderId: string, data: { amount: number; paymentMethod: PaymentMethod; referenceNotes?: string }): Promise<Order> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/orders/${orderId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await this.getOrder(orderId);
        currentOrders = [updated, ...currentOrders.filter((o) => o.id !== orderId)];
        return updated;
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al registrar abono');
    } catch (e: any) {
      if (e.message && e.message !== 'Failed to fetch') throw e;
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
      const res = await this.fetchWithAuth(`${API_BASE}/orders/${orderId}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al cancelar la orden');
    } catch (e: any) {
      if (e.message && e.message !== 'Failed to fetch') throw e;
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

  async uploadFile(file: File, folder: string = 'bocetos'): Promise<{ publicUrl: string; fileName: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const res = await this.fetchWithAuth(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        return {
          publicUrl: json.publicUrl,
          fileName: json.fileName || file.name,
        };
      }
    } catch {
      // Fallback a Base64 data URL
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          publicUrl: reader.result as string,
          fileName: file.name,
        });
      };
      reader.readAsDataURL(file);
    });
  },

  async addAttachment(orderId: string, file: { fileName: string; fileUrl: string; fileType: any; description?: string }) {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/orders/${orderId}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(file),
      });
      if (res.ok) {
        const newAttachment = await res.json();
        const oIdx = currentOrders.findIndex((o) => o.id === orderId);
        if (oIdx !== -1) {
          currentOrders[oIdx] = {
            ...currentOrders[oIdx],
            attachments: [...(currentOrders[oIdx].attachments || []), newAttachment],
          };
        }
        return newAttachment;
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al adjuntar archivo');
    } catch (e: any) {
      if (e.message && e.message !== 'Failed to fetch') throw e;
    }

    const orderIndex = currentOrders.findIndex((o) => o.id === orderId);

    const newAttachment = {
      id: `att-${Date.now()}`,
      orderId,
      fileName: file.fileName,
      fileUrl: file.fileUrl,
      fileType: file.fileType,
      description: file.description,
      createdAt: new Date().toISOString(),
    };

    if (orderIndex !== -1) {
      currentOrders[orderIndex] = {
        ...currentOrders[orderIndex],
        attachments: [...(currentOrders[orderIndex].attachments || []), newAttachment],
      };
    }

    return newAttachment;
  },

  // ---- MATERIALES / BODEGA ----
  async getMaterials(): Promise<Material[]> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/materials`);
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
      const res = await this.fetchWithAuth(`${API_BASE}/materials/${id}/restock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al reabastecer material');
    } catch (e: any) {
      if (e.message && e.message !== 'Failed to fetch') throw e;
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

  async createMaterial(payload: {
    name: string;
    type: MaterialType;
    unit: MeasurementUnit;
    stock: number;
    minStock: number;
  }): Promise<Material> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const json = await res.json();
        currentMaterials = [json, ...currentMaterials];
        return json;
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al registrar material');
    } catch (e: any) {
      if (e.message && e.message !== 'Failed to fetch') throw e;
    }

    const newMat: Material = {
      id: `mat-${Date.now()}`,
      ...payload,
      isLowStock: payload.stock <= payload.minStock,
    };
    currentMaterials = [newMat, ...currentMaterials];
    return newMat;
  },

  async updateMaterial(
    id: string,
    payload: {
      name?: string;
      type?: MaterialType;
      unit?: MeasurementUnit;
      minStock?: number;
      stock?: number;
    }
  ): Promise<Material> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/materials/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const json = await res.json();
        return json;
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al actualizar material');
    } catch (e: any) {
      if (e.message && e.message !== 'Failed to fetch') throw e;
    }

    const idx = currentMaterials.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error('Material no encontrado');

    const updated = {
      ...currentMaterials[idx],
      ...payload,
    };
    updated.isLowStock = updated.stock <= updated.minStock;
    currentMaterials[idx] = updated;
    return updated;
  },

  // ---- CLIENTES ----
  async getClients(): Promise<Client[]> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/clients`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json)) return json;
      }
    } catch {
      // Fallback
    }
    return currentClients;
  },

  async createClient(data: { fullName: string; phone: string; email?: string; documentId?: string }): Promise<Client> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const json = await res.json();
        currentClients = [json, ...currentClients];
        return json;
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al registrar cliente');
    } catch (e: any) {
      if (e.message && e.message !== 'Failed to fetch') throw e;
    }

    const newClient: Client = {
      id: `cli-${Date.now()}`,
      fullName: data.fullName,
      phone: data.phone,
      email: data.email || null,
      documentId: data.documentId || null,
    };
    currentClients = [newClient, ...currentClients];
    return newClient;
  },


  async updateClient(
    id: string,
    data: { fullName?: string; phone?: string; email?: string | null; documentId?: string | null }
  ): Promise<Client> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const json = await res.json();
        const updated = json.client || json.data || json;
        const index = currentClients.findIndex((c) => c.id === id);
        if (index !== -1) {
          currentClients[index] = { ...currentClients[index], ...updated };
        }
        return updated;
      }
      const errJson = await res.json().catch(() => ({}));
      if (errJson.error) throw new Error(errJson.error);
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch')) throw err;
    }

    const index = currentClients.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Cliente no encontrado');

    const updatedClient: Client = {
      ...currentClients[index],
      ...data,
      email: data.email !== undefined ? data.email : currentClients[index].email,
      documentId: data.documentId !== undefined ? data.documentId : currentClients[index].documentId,
    };
    currentClients[index] = updatedClient;
    return updatedClient;
  },

  // ---- COTIZACIONES ----
  async getQuotes(): Promise<Quote[]> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/quotes`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json)) {
          currentQuotes = json;
          return json;
        }
      }
    } catch {
      // Fallback
    }
    return currentQuotes;
  },

  async createQuote(data: { clientId: string; items: any[]; validUntil?: string }): Promise<Quote> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const json = await res.json();
        currentQuotes = [json, ...currentQuotes.filter((q) => q.id !== json.id)];
        return json;
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al crear cotización');
    } catch (e: any) {
      if (e.message && e.message !== 'Failed to fetch') throw e;
    }

    const client = currentClients.find((c) => c.id === data.clientId) || currentClients[0] || MOCK_CLIENTS[0];
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

  async updateQuote(
    id: string,
    data: {
      clientId?: string;
      items?: { description: string; quantity: number; unitPrice: number }[];
      validUntil?: string;
    }
  ): Promise<Quote> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/quotes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        currentQuotes = currentQuotes.map((q) => (q.id === id ? updated : q));
        return updated;
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al actualizar cotización');
    } catch (e: any) {
      if (e.message && e.message !== 'Failed to fetch') throw e;
    }

    const qIdx = currentQuotes.findIndex((q) => q.id === id);
    if (qIdx === -1) throw new Error('Cotización no encontrada');
    const existing = currentQuotes[qIdx];
    const totalAmount = data.items
      ? data.items.reduce((acc, it) => acc + it.quantity * it.unitPrice, 0)
      : existing.totalAmount;

    const updated: Quote = {
      ...existing,
      clientId: data.clientId || existing.clientId,
      totalAmount,
      validUntil: data.validUntil || existing.validUntil,
      items: data.items
        ? data.items.map((it, idx) => ({
            id: `item-${Date.now()}-${idx}`,
            quoteId: id,
            description: it.description,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            subtotal: it.quantity * it.unitPrice,
          }))
        : existing.items,
    };

    currentQuotes[qIdx] = updated;
    return updated;
  },

  async deleteQuote(id: string): Promise<void> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/quotes/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al eliminar cotización');
      }
    } catch (e: any) {
      if (e.message && e.message !== 'Failed to fetch') throw e;
    }

    currentQuotes = currentQuotes.filter((q) => q.id !== id);
  },

  async approveQuote(id: string, artisanId?: string): Promise<{ quote: Quote; order: Order }> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/quotes/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artisanId }),
      });
      if (res.ok) {
        const data = await res.json();
        const createdOrder: Order = data.order;
        if (createdOrder) {
          // Mantener sincronizado en el array local
          currentOrders = [createdOrder, ...currentOrders.filter((o) => o.id !== createdOrder.id)];
          const qIdx = currentQuotes.findIndex((q) => q.id === id);
          if (qIdx !== -1) {
            currentQuotes[qIdx] = {
              ...currentQuotes[qIdx],
              status: 'APROBADA',
              order: { id: createdOrder.id, status: createdOrder.status },
            };
          }
        }
        return {
          quote: data.quote || (currentQuotes.find((q) => q.id === id) as Quote),
          order: createdOrder,
        };
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al aprobar la cotización');
    } catch (e: any) {
      if (e.message && e.message !== 'Failed to fetch') throw e;
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
      artisanId: artisanId || undefined,
      artisan: artisanId ? { id: artisanId, fullName: 'Joyero Asignado' } : undefined,
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
      const res = await this.fetchWithAuth(`${API_BASE}/dashboard/stats`);
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }

    let facturado = 0;
    let cobrado = 0;
    let saldoPorCobrar = 0;
    let enFabricacion = 0;
    let enCalidad = 0;

    currentOrders.forEach((o) => {
      facturado += o.totalPactado;
      const abonos = o.totalAbonado ?? (o.payments?.reduce((acc, p) => acc + p.amount, 0) || 0);
      cobrado += abonos;
      saldoPorCobrar += Math.max(0, o.totalPactado - abonos);
      if (o.status === 'FABRICACION') enFabricacion++;
      if (o.status === 'CALIDAD') enCalidad++;
    });

    const matCriticos = currentMaterials.filter((m) => m.stock <= m.minStock);

    return {
      financiero: {
        totalFacturado: facturado,
        totalRecaudado: cobrado,
        carteraPendiente: saldoPorCobrar,
      },
      taller: {
        pedidosActivos: currentOrders.filter((o) => o.status !== 'ENTREGADO' && o.status !== 'CANCELADO').length,
        enFabricacion,
        enControlCalidad: enCalidad,
        entregasProximos7Dias: 2,
      },
      inventario: {
        materialesCriticosCount: matCriticos.length,
        alertasStock: matCriticos.map((m) => ({
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

  // ---- USUARIOS ----
  async getUsers(): Promise<User[]> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/users`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json)) return json;
      }
    } catch {
      // Fallback
    }
    return Object.values(DB_USERS);
  },

  // ---- AUDITORÍA ----
  async getAuditLogs(): Promise<any[]> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/audit`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json)) return json;
      }
    } catch {
      // Fallback
    }
    return [];
  },
};

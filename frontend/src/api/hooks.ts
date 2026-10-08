import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import { OrderStatus, PaymentMethod, MetalReturnPayload } from '../types';

export function useOrders(params?: { status?: OrderStatus; artisanId?: string; clientId?: string }) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: () => apiClient.getOrders(params),
  });
}

export function useOrder(id: string | null) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => (id ? apiClient.getOrder(id) : null),
    enabled: !!id,
  });
}

export function useMaterials() {
  return useQuery({
    queryKey: ['materials'],
    queryFn: () => apiClient.getMaterials(),
  });
}

export function useQuotes() {
  return useQuery({
    queryKey: ['quotes'],
    queryFn: () => apiClient.getQuotes(),
  });
}

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboardMetrics'],
    queryFn: () => apiClient.getDashboardMetrics(),
  });
}

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: () => apiClient.getClients(),
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.getUsers(),
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newStatus, note }: { id: string; newStatus: OrderStatus; note?: string }) =>
      apiClient.updateOrderStatus(id, newStatus, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });
}

export function useRegisterMetalReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, payload }: { orderId: string; payload: MetalReturnPayload }) =>
      apiClient.registerMetalReturn(orderId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });
}

export function useAddPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      amount,
      paymentMethod,
      referenceNotes,
    }: {
      orderId: string;
      amount: number;
      paymentMethod: PaymentMethod;
      referenceNotes?: string;
    }) => apiClient.addPayment(orderId, { amount, paymentMethod, referenceNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      apiClient.cancelOrder(orderId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });
}

export function useRestockMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quantity, notes }: { id: string; quantity: number; notes?: string }) =>
      apiClient.restockMaterial(id, quantity, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });
}

export function useCreateMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      type: any;
      unit: any;
      stock: number;
      minStock: number;
    }) => apiClient.createMaterial(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });
}

export function useUpdateMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        name?: string;
        type?: any;
        unit?: any;
        minStock?: number;
        stock?: number;
      };
    }) => apiClient.updateMaterial(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });
}

export function useCreateQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { clientId: string; items: any[]; validUntil?: string }) =>
      apiClient.createQuote(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });
}

export function useApproveQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, artisanId }: { id: string; artisanId?: string }) =>
      apiClient.approveQuote(id, artisanId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });
}

export function useAddAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      file,
    }: {
      orderId: string;
      file: { fileName: string; fileUrl: string; fileType: any; description?: string };
    }) => apiClient.addAttachment(orderId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { fullName: string; phone: string; email?: string; documentId?: string }) =>
      apiClient.createClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { fullName?: string; phone?: string; email?: string | null; documentId?: string | null };
    }) => apiClient.updateClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useAuditLogs() {
  return useQuery({
    queryKey: ['auditLogs'],
    queryFn: () => apiClient.getAuditLogs(),
  });
}


/**
 * Formateador de moneda estricto para alta joyería
 * Muestra separadores de miles y el símbolo de moneda de forma clara y sin ambigüedades.
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  if (isNaN(num)) return '$ 0';
  
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Precisión numérica de balanza de orfebre
 * Los inputs y lecturas de metal deben permitir tres decimales (step="0.001") y formatearse como "0.000 g"
 */
export function formatGrams(grams: number | string | null | undefined, unit: string = 'g'): string {
  const num = typeof grams === 'string' ? parseFloat(grams) : (grams ?? 0);
  if (isNaN(num)) return `0.00 ${unit}`;
  return `${num.toFixed(2)} ${unit}`;
}

/**
 * Formato de fecha estándar para el taller
 */
export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return 'Sin fecha';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Fecha inválida';
  
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Calcula el estado de semáforo de entrega de la joya:
 * - 'expired' (rojo): fecha ya pasada
 * - 'warning' (amarillo): faltan 3 días o menos
 * - 'normal' (verde): tiempo adecuado
 */
export function getDeliverySLA(deliveryDateStr: string | Date | null | undefined): {
  status: 'expired' | 'warning' | 'normal' | 'none';
  label: string;
  badgeClass: string;
} {
  if (!deliveryDateStr) {
    return {
      status: 'none',
      label: 'Sin entrega pactada',
      badgeClass: 'bg-surface-gray text-text-muted border-surface-border',
    };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(deliveryDateStr);
  if (isNaN(target.getTime())) {
    return {
      status: 'none',
      label: 'Sin entrega pactada',
      badgeClass: 'bg-surface-gray text-text-muted border-surface-border',
    };
  }
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: 'expired',
      label: `Vencido hace ${Math.abs(diffDays)}d`,
      badgeClass: 'bg-[#FDECEA] text-[#B42318] border-[#FDECEA] font-medium',
    };
  }

  if (diffDays <= 3) {
    return {
      status: 'warning',
      label: diffDays === 0 ? '¡Entrega HOY!' : `Entrega en ${diffDays}d`,
      badgeClass: 'bg-[#FFF4D6] text-[#9A6700] border-[#FFF4D6] font-medium',
    };
  }

  return {
    status: 'normal',
    label: `Entrega en ${diffDays}d`,
    badgeClass: 'bg-[#E6F5ED] text-[#17734B] border-[#E6F5ED]',
  };
}

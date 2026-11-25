export interface AlertaStockBajo {
  materialName: string;
  remainingStock: number;
  unit: string;
}

/** Puerto de salida: la aplicación no conoce al proveedor de correo. */
export interface INotificacionService {
  enviarAlertaStockBajo(alerta: AlertaStockBajo): Promise<void>;
}

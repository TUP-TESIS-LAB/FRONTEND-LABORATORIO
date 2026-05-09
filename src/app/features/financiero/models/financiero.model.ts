export interface Pago {
  id: string;
  monto: number;
  fecha: string;
  metodo: 'efectivo' | 'transferencia' | 'tarjeta' | 'cobertura';
  protocoloId: string;
}

export interface Cobertura {
  id: string;
  nombre: string;
  planes: Plan[];
}

export interface Plan {
  id: string;
  nombre: string;
  coberturaId: string;
}

export interface Movimiento {
  id: string;
  tipo: 'ingreso' | 'egreso';
  monto: number;
  descripcion: string;
  fecha: string;
  sucursalId: string;
}

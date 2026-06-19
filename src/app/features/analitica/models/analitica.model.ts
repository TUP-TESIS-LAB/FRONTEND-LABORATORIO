export interface Protocolo {
  id: string;
  numero: string;
  pacienteId: string;
  fecha: string;
  estado: 'pendiente' | 'en_proceso' | 'finalizado';
}

export interface Turno {
  id: string;
  pacienteId: string;
  fecha: string;
  hora: string;
  estado: 'pendiente' | 'presente' | 'llamado' | 'atendido' | 'ausente';
  sucursalId: string;
}

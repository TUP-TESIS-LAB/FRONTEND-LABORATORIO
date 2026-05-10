export interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string;
  email?: string;
  telefono?: string;
}

export interface Protocolo {
  id: string;
  numero: string;
  pacienteId: string;
  fecha: string;
  estado: 'pendiente' | 'en_proceso' | 'finalizado';
}

export interface Nbu {
  id: string;
  codigo: string;
  descripcion: string;
  precio: number;
}

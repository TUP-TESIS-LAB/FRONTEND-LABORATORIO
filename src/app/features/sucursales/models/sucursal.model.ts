export interface Sucursal {
  id: string;
  nombre: string;
  direccion: string;
  activa: boolean;
}

export interface Area {
  id: string;
  nombre: string;
  sucursalId: string;
}

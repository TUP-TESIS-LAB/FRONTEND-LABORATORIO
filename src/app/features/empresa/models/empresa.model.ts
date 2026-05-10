export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  roles: string[];
  activo: boolean;
}

export interface Rol {
  id: string;
  nombre: string;
  permisos: string[];
}

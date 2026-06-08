import { MenuItem } from 'primeng/api';

export interface TableColumn {
  field: string;
  header: string;
  align?: 'left' | 'right' | 'center';
}

export interface TableAction {
  key: string;
  /** PrimeIcons name, e.g. 'pi-file-pdf'. Puede ser función por fila. */
  icon: string | ((row: unknown) => string);
  /** Tooltip + aria-label. Puede ser función por fila. */
  label: string | ((row: unknown) => string);
  /** 'danger' | 'warn' | 'success' | etc. Puede ser función por fila. */
  severity?: string | ((row: unknown) => string);
  /**
   * 'button' (default): emite (action).
   * 'menu': abre un p-menu popup; los items se definen en menuItems.
   */
  type?: 'button' | 'menu';
  /** Ítems del menú popup. Solo aplica cuando type='menu'. */
  menuItems?: MenuItem[] | ((row: unknown) => MenuItem[]);
}

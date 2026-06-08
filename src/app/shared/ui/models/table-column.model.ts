export interface TableColumn {
  field: string;
  header: string;
  align?: 'left' | 'right' | 'center';
}

export interface TableAction {
  key: string;
  icon: string;       // PrimeIcons name, e.g. 'pi-file-pdf'
  label: string;
  severity?: string;  // 'danger' | 'secondary' | etc.
}

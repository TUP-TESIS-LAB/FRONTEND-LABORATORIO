import { Pipe, PipeTransform } from '@angular/core';
import { TenantStatus } from './tenant.model';

@Pipe({ name: 'tenantStatus', standalone: true })
export class TenantStatusPipe implements PipeTransform {
  transform(value: TenantStatus | null | undefined): string {
    if (value === 'ACTIVE') return 'Activo';
    if (value === 'INACTIVE') return 'Inactivo';
    return '—';
  }
}

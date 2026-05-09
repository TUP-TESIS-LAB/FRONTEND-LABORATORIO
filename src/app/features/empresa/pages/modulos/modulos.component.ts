import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TenantStore } from '@core/tenant/tenant.store';

@Component({
  selector: 'app-modulos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2>Módulos activos</h2>
    <ul>
      @for (mod of tenantStore.config()?.modules ?? []; track mod) {
        <li>{{ mod }}</li>
      }
    </ul>
  `,
})
export class ModulosComponent {
  protected readonly tenantStore = inject(TenantStore);
}

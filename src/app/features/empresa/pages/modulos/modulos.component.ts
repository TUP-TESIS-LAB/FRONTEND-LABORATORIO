import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectTenantConfig } from '@core/tenant/store/tenant.selectors';

@Component({
  selector: 'app-modulos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2>Módulos activos</h2>
    <ul>
      @for (mod of tenantConfig()?.modules ?? []; track mod) {
        <li>{{ mod }}</li>
      }
    </ul>
  `,
})
export class ModulosComponent {
  protected readonly tenantConfig = inject(Store).selectSignal(selectTenantConfig);
}

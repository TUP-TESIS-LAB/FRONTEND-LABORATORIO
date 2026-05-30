import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TableModule } from 'primeng/table';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';

export interface ResumenPlanView {
  code: string;
  name: string;
  acronym: string;
  validFromDate: string;
  nbuLabel: string;
  ubValue: number;
  coveragePercentage: number;
  iva: number;
}

export interface ResumenView {
  code: string;
  name: string;
  acronym: string;
  insurerTypeLabel: string;
  cuit: string;
  authorizationUrl: string;
  description: string;
  contacts: { label: string; value: string }[];
  plans: ResumenPlanView[];
}

@Component({
  selector: 'os-resumen-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TableModule, CurrencyArPipe],
  template: `
    <div class="max-w-4xl space-y-5">
      <section>
        <h3 class="text-base font-semibold mb-2">Aseguradora</h3>
        <div class="grid grid-cols-3 gap-3">
          <div><div class="text-xs text-surface-500">Código</div><div>{{ data().code }}</div></div>
          <div><div class="text-xs text-surface-500">Sigla</div><div>{{ data().acronym }}</div></div>
          <div><div class="text-xs text-surface-500">Tipo</div><div>{{ data().insurerTypeLabel }}</div></div>
          <div class="col-span-2"><div class="text-xs text-surface-500">Nombre</div><div>{{ data().name }}</div></div>
          <div><div class="text-xs text-surface-500">CUIT</div><div>{{ data().cuit }}</div></div>
          @if (data().authorizationUrl) {
            <div class="col-span-3"><div class="text-xs text-surface-500">URL de autorización</div><div>{{ data().authorizationUrl }}</div></div>
          }
          @if (data().description) {
            <div class="col-span-3"><div class="text-xs text-surface-500">Descripción</div><div>{{ data().description }}</div></div>
          }
        </div>
      </section>

      @if (data().contacts.length) {
        <section>
          <h3 class="text-base font-semibold mb-2">Contactos</h3>
          <ul class="space-y-1">
            @for (c of data().contacts; track c.label) {
              <li class="text-sm">{{ c.label }}: {{ c.value }}</li>
            }
          </ul>
        </section>
      }

      <section>
        <h3 class="text-base font-semibold mb-2">Planes y convenios</h3>
        <p-table [value]="data().plans" dataKey="code">
          <ng-template pTemplate="header">
            <tr><th>Código</th><th>Nombre</th><th>Sigla</th><th>Vigente desde</th><th>NBU</th><th>Valor U.B.</th><th>% Cob.</th><th>IVA</th></tr>
          </ng-template>
          <ng-template pTemplate="body" let-p>
            <tr>
              <td>{{ p.code }}</td><td>{{ p.name }}</td><td>{{ p.acronym }}</td>
              <td>{{ p.validFromDate }}</td><td>{{ p.nbuLabel }}</td>
              <td>{{ p.ubValue | currencyAr }}</td><td>{{ p.coveragePercentage }}%</td><td>{{ p.iva }}%</td>
            </tr>
          </ng-template>
        </p-table>
      </section>
    </div>
  `,
})
export class ResumenStepComponent {
  readonly data = input.required<ResumenView>();
}

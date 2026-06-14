import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { ValidationResultVM, ValidationOutcome } from '../../models/postanalitica.model';

export interface ValidatePayload { resultId: number; determinationId: number; outcome: ValidationOutcome; }
export interface ValidateAllPayload { resultId: number; outcome: ValidationOutcome; }

const OUTCOMES: ValidationOutcome[] = ['PASS', 'WARNING', 'FAIL'];

@Component({
  selector: 'app-validation-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="flex flex-col gap-4">
      @for (res of results(); track res.resultId) {
        <section class="border rounded">
          <header class="px-3 py-2 bg-gray-50 flex items-center justify-between">
            <span class="text-sm font-semibold">Resultado #{{ res.resultId }}</span>
            <span class="text-xs font-semibold uppercase">{{ res.status }}</span>
          </header>
          <table class="w-full text-sm">
            <thead>
              <tr><th class="text-left p-2">Determinación</th><th class="p-2">Automático</th><th class="p-2">Validación</th></tr>
            </thead>
            <tbody>
              @for (row of res.rows; track row.determinationId) {
                <tr>
                  <td class="p-2">{{ row.name }}</td>
                  <td class="p-2 text-center">{{ row.aggregateOutcome ?? '—' }}</td>
                  <td class="p-2 text-center">
                    @for (o of outcomes; track o) {
                      <button type="button" class="px-2 py-1 mx-0.5 rounded border text-xs"
                              [class.font-bold]="row.manualOutcome === o"
                              [attr.aria-label]="'Validar ' + row.name + ' como ' + o"
                              (click)="onValidate(res.resultId, row.determinationId, o)">{{ o }}</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
          <div class="px-3 py-2 flex items-center justify-end gap-2 border-t">
            <button type="button" class="px-2 py-1 rounded border text-xs" (click)="onValidateAll(res.resultId, 'PASS')">
              Validar todas como PASS
            </button>
            <button type="button" class="px-3 py-1 rounded bg-green-600 text-white text-xs font-semibold"
                    [disabled]="!canSign(res)" title="Próximamente">
              Firmar
            </button>
          </div>
        </section>
      }
      @if (!results().length) {
        <p class="text-sm opacity-60">Todavía no hay estudio para este protocolo. Cargá y marcá resultados primero.</p>
      }
    </div>
  `,
})
export class ValidationTableComponent {
  readonly results = input.required<ValidationResultVM[]>();
  readonly validate = output<ValidatePayload>();
  readonly validateAll = output<ValidateAllPayload>();

  readonly outcomes = OUTCOMES;

  onValidate(resultId: number, determinationId: number, outcome: ValidationOutcome): void {
    this.validate.emit({ resultId, determinationId, outcome });
  }
  onValidateAll(resultId: number, outcome: ValidationOutcome): void {
    this.validateAll.emit({ resultId, outcome });
  }
  canSign(res: ValidationResultVM): boolean { return res.status === 'VALIDATED'; }
}

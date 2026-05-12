import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { AutoCompleteModule, AutoCompleteCompleteEvent, AutoCompleteSelectEvent } from 'primeng/autocomplete';
import { Patient } from '../../models/patient.model';
import { PatientService } from '../../services/patient.service';
import { DniPipe } from '@shared/pipes/dni.pipe';
import { AgePipe } from '@shared/pipes/age.pipe';

@Component({
  selector: 'pat-search-autocomplete',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AutoCompleteModule, DniPipe, AgePipe],
  template: `
    <p-autocomplete
      [suggestions]="suggestions()"
      (completeMethod)="onComplete($event)"
      (onSelect)="onSelect($event)"
      [delay]="300"
      placeholder="Buscar por nombre o DNI…"
      optionLabel="lastName"
      [forceSelection]="true">
      <ng-template let-p pTemplate="item">
        <div class="flex flex-col py-1">
          <div class="font-medium">{{ p.lastName }}, {{ p.firstName }}</div>
          <div class="text-xs text-surface-500">
            DNI {{ p.dni | dni }} · {{ p.gender }} · {{ (p.birthDate | age) ?? '?' }} años
          </div>
        </div>
      </ng-template>
    </p-autocomplete>
  `,
})
export class PatientSearchAutocompleteComponent {
  readonly selected = output<Patient>();
  private readonly svc = inject(PatientService);
  readonly suggestions = signal<Patient[]>([]);

  onComplete(e: AutoCompleteCompleteEvent): void {
    const q = e.query?.trim();
    if (!q) { this.suggestions.set([]); return; }
    this.svc.search({ q, state: 'active', page: 0, size: 10 }).subscribe((res) => {
      this.suggestions.set(res.content);
    });
  }

  onSelect(e: AutoCompleteSelectEvent): void {
    this.selected.emit(e.value as Patient);
  }
}

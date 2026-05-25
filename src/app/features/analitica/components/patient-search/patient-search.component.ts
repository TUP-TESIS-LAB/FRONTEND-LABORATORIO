import {
  ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Patient } from '@features/pacientes/models/patient.model';
import { PatientService } from '@features/pacientes/services/patient.service';

@Component({
  selector: 'lab-patient-search',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ButtonModule, InputTextModule],
  template: `
    <div class="flex flex-col gap-2">
      <label class="text-sm font-medium">Buscar paciente por DNI</label>
      <div class="flex gap-2">
        <input pInputText
               type="text"
               inputmode="numeric"
               placeholder="32.456.789"
               [(ngModel)]="dniInput"
               (keyup.enter)="searchByDni(dniInput)"
               [disabled]="loading()" />
        <p-button label="Buscar"
                  (onClick)="searchByDni(dniInput)"
                  [loading]="loading()" />
      </div>

      @if (patient(); as p) {
        <div class="bg-[var(--ds-surface-2,#f8fafc)] rounded-md p-3">
          <div class="font-semibold">{{ p.lastName }}, {{ p.firstName }}</div>
          <div class="text-xs opacity-70">DNI {{ p.dni }} · Nac. {{ p.birthDate }} · {{ p.gender }}</div>
        </div>
      } @else if (error()) {
        <div class="text-sm text-[var(--color-danger,#ef4444)]">{{ error() }}</div>
      }
    </div>
  `,
})
export class PatientSearchComponent implements OnInit {
  private readonly patients = inject(PatientService);

  readonly initialDni = input<string | null>(null);
  readonly patientSelected = output<Patient>();
  readonly notFound = output<string>();

  protected dniInput = '';
  readonly patient = signal<Patient | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const dni = this.initialDni();
    if (dni) {
      this.dniInput = dni;
      // Auto-search on mount (came from "/pacientes/nuevo" redirect). NO emit notFound
      // — si el paciente sigue sin existir limpiamos silenciosamente y dejamos que el
      // usuario re-tipee. Emitir notFound acá re-dispararía el redirect en loop.
      this.doSearch(dni, /* emitNotFound */ false);
    }
  }

  /** Manual search via Buscar button / Enter. Sí emite notFound (dispara el redirect). */
  searchByDni(dni: string): void {
    this.doSearch(dni, /* emitNotFound */ true);
  }

  private doSearch(dni: string, emitNotFound: boolean): void {
    const cleaned = (dni ?? '').replace(/\D/g, '');
    if (!cleaned) {
      // Limpio la card del paciente anterior para que el template no muestre selección stale
      // mientras el usuario tipea algo inválido encima.
      this.patient.set(null);
      this.error.set('Ingresá un DNI');
      return;
    }
    this.error.set(null);
    // Reseteo la selección anterior al inicio de una nueva búsqueda — evita que la UI
    // muestre el paciente viejo mientras la HTTP está en vuelo.
    this.patient.set(null);
    this.loading.set(true);
    this.patients
      .search({ state: 'active', page: 0, size: 1, q: cleaned })
      .subscribe({
        next: (page) => {
          this.loading.set(false);
          const match = page.content.find((p) => String(p.dni) === cleaned);
          if (match) {
            this.patient.set(match);
            this.patientSelected.emit(match);
          } else {
            this.patient.set(null);
            if (emitNotFound) {
              this.notFound.emit(cleaned);
            }
          }
        },
        error: () => {
          this.loading.set(false);
          // Si la HTTP falla limpio la card vieja también, para que la UI no muestre
          // selección obsoleta mientras se ve el mensaje de error.
          this.patient.set(null);
          this.error.set('Error al buscar el paciente');
        },
      });
  }

  setPatient(p: Patient): void {
    this.patient.set(p);
  }

  clear(): void {
    this.patient.set(null);
    this.dniInput = '';
    this.error.set(null);
  }
}

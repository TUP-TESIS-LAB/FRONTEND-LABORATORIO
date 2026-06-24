import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';

import { PatientService } from '../../../pacientes/services/patient.service';
import { createPatientPortalAccount } from '../../../pacientes/store/patient.actions';
import { registerGuardian } from '../../store/atencion/atencion.actions';

export type PortalAccessMode = 'choose' | 'propio' | 'responsable';

export const GUARDIAN_BONDS = [
  'MADRE', 'PADRE', 'HERMANO', 'HERMANA', 'HIJO', 'HIJA', 'TUTOR', 'OTROS',
] as const;

@Component({
  selector: 'lab-portal-access-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    SelectModule,
    InputTextModule,
  ],
  template: `
    <p-dialog
      [visible]="visible()"
      (onHide)="onHide()"
      [modal]="true"
      [draggable]="false"
      [style]="{ width: '520px' }"
      [header]="dialogHeader()">

      <!-- ── Pantalla: choose ─────────────────────────────────────────────── -->
      @if (modo() === 'choose') {
        <p class="text-sm opacity-70 mb-4">
          ¿Quién gestionará el portal de este paciente?
        </p>
        <div class="flex flex-col gap-3">
          <p-button
            label="El propio paciente"
            icon="pi pi-user"
            [disabled]="!patientHasEmail()"
            (onClick)="selectModo('propio')"
            styleClass="w-full justify-start"
          />
          @if (!patientHasEmail()) {
            <p class="text-xs text-red-500 -mt-2">
              El paciente no tiene email registrado. No es posible crear su acceso portal.
            </p>
          }
          <p-button
            label="Un responsable / familiar"
            icon="pi pi-users"
            severity="secondary"
            (onClick)="selectModo('responsable')"
            styleClass="w-full justify-start"
          />
        </div>
      }

      <!-- ── Pantalla: propio ─────────────────────────────────────────────── -->
      @if (modo() === 'propio') {
        <p class="text-sm opacity-70 mb-4">
          Se enviará un email al paciente para que active su cuenta portal.
        </p>
      }

      <!-- ── Pantalla: responsable ─────────────────────────────────────────── -->
      @if (modo() === 'responsable') {
        <div class="flex flex-col gap-3">

          <!-- DNI del responsable -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">DNI del responsable</label>
            <input
              pInputText
              type="text"
              [(ngModel)]="dniValue"
              placeholder="Ej: 30123456"
              (blur)="lookupDni()"
              class="w-full"
            />
          </div>

          @if (resolving()) {
            <p class="text-xs opacity-60">Buscando paciente...</p>
          }

          <!-- Nombre -->
          <div class="flex gap-2">
            <div class="flex flex-col gap-1 flex-1">
              <label class="text-sm font-medium">Nombre</label>
              <input
                pInputText
                type="text"
                [(ngModel)]="firstNameValue"
                [disabled]="prefilled()"
                placeholder="Nombre"
                class="w-full"
              />
            </div>
            <div class="flex flex-col gap-1 flex-1">
              <label class="text-sm font-medium">Apellido</label>
              <input
                pInputText
                type="text"
                [(ngModel)]="lastNameValue"
                [disabled]="prefilled()"
                placeholder="Apellido"
                class="w-full"
              />
            </div>
          </div>

          <!-- Email -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">Email</label>
            <input
              pInputText
              type="email"
              [(ngModel)]="emailValue"
              [disabled]="emailPrefilled()"
              placeholder="correo@ejemplo.com"
              class="w-full"
            />
          </div>

          <!-- Vínculo -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">Vínculo con el paciente</label>
            <p-select
              [options]="bondOptions"
              [(ngModel)]="bondValue"
              placeholder="Seleccionar vínculo"
              styleClass="w-full"
              appendTo="body"
            />
          </div>
        </div>
      }

      <!-- ── Footer único (conmuta por modo; un solo pTemplate para que PrimeNG lo refresque) ── -->
      <ng-template pTemplate="footer">
        @if (modo() === 'choose') {
          <p-button label="Cancelar" severity="secondary" [text]="true" (onClick)="onHide()" />
        } @else if (modo() === 'propio') {
          <p-button label="Volver" severity="secondary" [text]="true" (onClick)="selectModo('choose')" />
          <p-button label="Confirmar" (onClick)="confirmPropio()" />
        } @else {
          <p-button label="Volver" severity="secondary" [text]="true" (onClick)="selectModo('choose')" />
          <p-button
            label="Confirmar"
            [disabled]="!responsableValid()"
            (onClick)="confirmResponsable()"
          />
        }
      </ng-template>

    </p-dialog>
  `,
})
export class PortalAccessDialogComponent {
  private readonly store = inject(Store);
  private readonly patientService = inject(PatientService);

  // ── Inputs / outputs ────────────────────────────────────────────────────────
  readonly visible        = input<boolean>(false);
  readonly patientId      = input<number | null>(null);
  readonly patientHasEmail = input<boolean>(false);
  readonly closed         = output<void>();

  // ── State ────────────────────────────────────────────────────────────────────
  readonly modo          = signal<PortalAccessMode>('choose');
  readonly resolving     = signal(false);
  readonly prefilled     = signal(false);
  readonly emailPrefilled = signal(false);

  // Form values (public so tests can inspect via signals)
  readonly firstName = signal('');
  readonly lastName  = signal('');
  readonly email     = signal('');
  readonly bond      = signal('');

  // Two-way ngModel bridges (needed for [(ngModel)] in template)
  get dniValue(): string { return this._dni(); }
  set dniValue(v: string) { this.setDni(v); }

  get firstNameValue(): string { return this.firstName(); }
  set firstNameValue(v: string) { this.firstName.set(v); }

  get lastNameValue(): string { return this.lastName(); }
  set lastNameValue(v: string) { this.lastName.set(v); }

  get emailValue(): string { return this.email(); }
  set emailValue(v: string) { this.email.set(v); }

  get bondValue(): string { return this.bond(); }
  set bondValue(v: string) { this.bond.set(v); }

  private readonly _dni = signal('');
  /** DNI that was used in the last successful prefill lookup. */
  private _prefilledForDni: string | null = null;

  // ── Bonds ────────────────────────────────────────────────────────────────────
  readonly bonds = [...GUARDIAN_BONDS];
  readonly bondOptions = this.bonds.map((b) => ({ label: b, value: b }));

  // ── Computed helpers ─────────────────────────────────────────────────────────
  dialogHeader(): string {
    if (this.modo() === 'propio') return 'Acceso portal — Paciente';
    if (this.modo() === 'responsable') return 'Acceso portal — Responsable';
    return '¿Quién gestiona el portal?';
  }

  responsableValid(): boolean {
    return (
      this._dni().trim().length > 0 &&
      this.firstName().trim().length > 0 &&
      this.lastName().trim().length > 0 &&
      this.email().trim().length > 0 &&
      this.bond().length > 0
    );
  }

  // ── Public API (called from template + tests) ────────────────────────────────
  selectModo(modo: PortalAccessMode): void {
    this.modo.set(modo);
    if (modo === 'choose' || modo === 'responsable') {
      this._resetResponsableForm();
    }
  }

  setDni(dni: string): void {
    this._dni.set(dni);
    // If the DNI changed from the one we last prefilled, clear stale prefill data.
    if (this._prefilledForDni !== null && dni !== this._prefilledForDni) {
      this._clearPrefill();
    }
  }

  setBond(b: string): void {
    this.bond.set(b);
  }

  async lookupDni(): Promise<void> {
    const dni = this._dni().trim();
    if (!dni) return;

    this.resolving.set(true);
    try {
      const exists = await firstValueFrom(this.patientService.existsByDni(dni));
      if (exists) {
        const patient = await firstValueFrom(this.patientService.getByDni(dni));
        this.firstName.set(patient.firstName);
        this.lastName.set(patient.lastName);
        this.prefilled.set(true);
        this._prefilledForDni = dni;

        const emailContact = patient.contacts?.find(
          (c) => c.contactType === 'EMAIL' && c.active,
        );
        if (emailContact) {
          this.email.set(emailContact.contactValue);
          this.emailPrefilled.set(true);
        } else {
          this.email.set('');
          this.emailPrefilled.set(false);
        }
      } else {
        this._prefilledForDni = null;
        this.prefilled.set(false);
        this.emailPrefilled.set(false);
      }
    } finally {
      this.resolving.set(false);
    }
  }

  confirmPropio(): void {
    const id = this.patientId();
    if (id == null) return;
    this.store.dispatch(createPatientPortalAccount({ id }));
    this.closed.emit();
  }

  confirmResponsable(): void {
    if (!this.responsableValid()) return;
    const patientId = this.patientId();
    if (patientId == null) return;
    this.store.dispatch(
      registerGuardian({
        firstName: this.firstName(),
        lastName: this.lastName(),
        email: this.email(),
        document: this._dni(),
        patientId,
        bond: this.bond(),
      }),
    );
    this.closed.emit();
  }

  onHide(): void {
    this._resetAll();
    this.closed.emit();
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  /** Clear prefill flags and name/email fields when the DNI changes mid-session. */
  private _clearPrefill(): void {
    this.prefilled.set(false);
    this.emailPrefilled.set(false);
    this.firstName.set('');
    this.lastName.set('');
    this.email.set('');
    this._prefilledForDni = null;
  }

  private _resetResponsableForm(): void {
    this._prefilledForDni = null;
    this._dni.set('');
    this.firstName.set('');
    this.lastName.set('');
    this.email.set('');
    this.bond.set('');
    this.prefilled.set(false);
    this.emailPrefilled.set(false);
    this.resolving.set(false);
  }

  private _resetAll(): void {
    this.modo.set('choose');
    this._resetResponsableForm();
  }
}

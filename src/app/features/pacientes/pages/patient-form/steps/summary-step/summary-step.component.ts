import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { NgClass } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { COVERAGE_PLAN_CATALOG } from '../../../../models/coverage-plans.catalog';
import { AgePipe } from '@shared/pipes/age.pipe';

export interface SummaryAddressView {
  street?: string; streetNumber?: string; apartment?: string;
  neighborhood?: string; city?: string; province?: string; zipCode?: string;
}
export interface SummaryContactView {
  contactType?: 'PHONE' | 'EMAIL';
  contactValue?: string;
}
export interface SummaryCoverageView {
  planId?: number | null;
  memberNumber?: string;
  isPrimary?: boolean;
}
export interface SummaryView {
  firstName?: string;
  lastName?: string;
  dni?: string;
  birthDate?: Date | string | null;
  gender?: string | null;
  sexAtBirth?: string | null;
  mobile?: string;
  email?: string;
  extraContacts: SummaryContactView[];
  address: SummaryAddressView;
  coverages: SummaryCoverageView[];
}

const GENDER_LABEL: Record<string, string> = {
  FEMALE: 'Femenino', MALE: 'Masculino', OTHER: 'Otro', NOT_SPECIFIED: 'No especificado',
};
const SEX_LABEL: Record<string, string> = {
  FEMALE: 'Femenino', MALE: 'Masculino', INTERSEX: 'Intersex',
};
/**
 * Iconos PrimeIcons (NO emojis Unicode). Mapeo de ContactType al nombre de la
 * clase pi-*. Se usa para renderizar el ícono al lado del valor en el resumen.
 */
const CONTACT_ICON_CLASS: Record<string, string> = {
  PHONE: 'pi-phone',
  EMAIL: 'pi-envelope',
};

@Component({
  selector: 'pat-summary-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, NgClass],
  providers: [AgePipe],
  template: `
    <div class="flex flex-col gap-3 max-w-4xl">
      <h2 class="pat-step__title">Resumen</h2>
      <p class="pat-step__hint">Revisá los datos antes de registrar. Tocá "Editar" para volver al paso correspondiente.</p>

      <section class="pat-summary__card">
        <div class="pat-summary__head">
          <span class="pat-summary__title">Identidad</span>
          <p-button label="Editar" [text]="true" size="small" (onClick)="editStep.emit(0)" />
        </div>
        <div class="pat-summary__body">
          <strong>{{ fullName() || '—' }}</strong>
          <span class="pat-summary__sep">·</span>
          <span>DNI {{ data().dni || '—' }}</span>
          <span class="pat-summary__sep">·</span>
          <span>{{ birthLine() }}</span>
          <span class="pat-summary__sep">·</span>
          <span>{{ genderLabel() }}</span>
          @if (sexLabel()) {
            <span class="pat-summary__sep">·</span>
            <span>Sexo: {{ sexLabel() }}</span>
          }
        </div>
        <div class="pat-summary__body pat-summary__body--muted">
          <span class="pat-summary__contact"><i class="pi pi-phone"></i>{{ data().mobile || '—' }}</span>
          <span class="pat-summary__sep">·</span>
          <span class="pat-summary__contact"><i class="pi pi-envelope"></i>{{ data().email || '—' }}</span>
          @for (c of data().extraContacts; track $index) {
            <span class="pat-summary__sep">·</span>
            <span class="pat-summary__contact">
              <i class="pi" [ngClass]="contactIconClass(c.contactType)"></i>{{ c.contactValue }}
            </span>
          }
        </div>
      </section>

      <section class="pat-summary__card">
        <div class="pat-summary__head">
          <span class="pat-summary__title">Dirección</span>
          <p-button label="Editar" [text]="true" size="small" (onClick)="editStep.emit(1)" />
        </div>
        <div class="pat-summary__body">
          @if (addressLine()) { {{ addressLine() }} } @else { <em class="text-surface-500">Sin dirección cargada</em> }
        </div>
      </section>

      <section class="pat-summary__card">
        <div class="pat-summary__head">
          <span class="pat-summary__title">Coberturas</span>
          <p-button label="Editar" [text]="true" size="small" (onClick)="editStep.emit(2)" />
        </div>
        <div class="pat-summary__body">
          @if (coverageLines().length === 0) {
            <em class="text-surface-500">Sin coberturas — el paciente quedará como particular</em>
          } @else {
            @for (line of coverageLines(); track $index) {
              <div>
                @if (line.primary) { <strong>{{ line.text }}</strong> · <span class="text-xs text-primary-600">principal</span> }
                @else { {{ line.text }} }
              </div>
            }
          }
        </div>
      </section>
    </div>
  `,
  styles: [`
    .pat-summary__card { background:#fff; border:1px solid var(--p-surface-200, #e5e7eb); border-radius:8px; padding:14px 18px; display:flex; flex-direction:column; gap:6px; }
    .pat-summary__head { display:flex; align-items:center; justify-content:space-between; }
    .pat-summary__title { font-size:13px; font-weight:600; color:var(--ds-text, #1a1a2e); text-transform:uppercase; letter-spacing:0.4px; }
    .pat-summary__body { font-size:14px; color:var(--ds-text, #1a1a2e); display:flex; flex-wrap:wrap; gap:4px; align-items:baseline; }
    .pat-summary__body--muted { color:var(--ds-text-muted, #6b7280); font-size:13px; }
    .pat-summary__sep { color:var(--ds-text-muted, #6b7280); opacity:0.5; }
    .pat-summary__contact { display:inline-flex; align-items:center; gap:6px; }
    .pat-summary__contact .pi { color: var(--brand-secondary, #1976d2); font-size: 13px; }
  `],
})
export class SummaryStepComponent {
  readonly data = input.required<SummaryView>();
  readonly editStep = output<number>();

  private readonly agePipe = inject(AgePipe);

  readonly fullName = computed(() => {
    const d = this.data();
    const parts = [d.lastName, d.firstName].filter(Boolean);
    return parts.length ? `${d.lastName}, ${d.firstName}` : '';
  });

  readonly birthLine = computed(() => {
    const b = this.data().birthDate;
    if (!b) return '—';
    const d = b instanceof Date ? b : new Date(b);
    if (Number.isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const mon = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    // Reusa el AgePipe del proyecto (calcula edad exacta comparando mes/dia,
    // sin off-by-one cerca del cumple como pasaba con 365.25 dias).
    const iso = `${year}-${mon}-${day}`;
    const age = this.agePipe.transform(iso);
    return age != null ? `${day}/${mon}/${year} (${age}a)` : `${day}/${mon}/${year}`;
  });

  readonly genderLabel = computed(() => GENDER_LABEL[this.data().gender ?? ''] ?? '—');
  readonly sexLabel = computed(() => SEX_LABEL[this.data().sexAtBirth ?? ''] ?? '');

  readonly addressLine = computed(() => {
    const a = this.data().address;
    const street = [a.street, a.streetNumber].filter(Boolean).join(' ');
    const apt = a.apartment ? `${a.apartment}` : '';
    const head = [street, apt].filter(Boolean).join(', ');
    const tail = [a.neighborhood, a.city, a.province].filter(Boolean).join(', ');
    const cp = a.zipCode ? `CP ${a.zipCode}` : '';
    return [head, tail, cp].filter(Boolean).join(' · ');
  });

  readonly coverageLines = computed(() => {
    return this.data().coverages.map((c) => {
      const plan = COVERAGE_PLAN_CATALOG.find((p) => p.planId === c.planId);
      const planLabel = plan?.label ?? `Plan ${c.planId ?? '?'}`;
      const member = c.memberNumber ? ` · N° ${c.memberNumber}` : '';
      return { text: `${planLabel}${member}`, primary: !!c.isPrimary };
    });
  });

  /** Devuelve la clase pi-* correspondiente al tipo de contacto. */
  contactIconClass(type?: 'PHONE' | 'EMAIL'): string {
    return CONTACT_ICON_CLASS[type ?? 'PHONE'] ?? 'pi-circle';
  }
}

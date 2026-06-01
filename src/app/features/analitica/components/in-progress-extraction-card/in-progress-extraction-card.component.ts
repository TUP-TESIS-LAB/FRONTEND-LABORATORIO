import { CommonModule, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Output,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, startWith } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InExtractionItem } from '../../models/extraction.model';

/**
 * Card grande del paciente en curso. Reemplaza la tabla de "Mis extracciones"
 * de la v1. Sólo renderiza los campos que el backend devuelve hoy — sin
 * inventar edad, gender, OS label ni nombres de análisis.
 *
 * Estado vacío (sin paciente) muestra dashed border + icono `pi-inbox`.
 */
@Component({
  selector: 'app-in-progress-extraction-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ButtonModule],
  providers: [DatePipe],
  template: `
    @if (patient(); as p) {
      <article class="pcard" [attr.aria-label]="'Extracción en curso de ' + p.patientFullName">
        <div class="avatar">{{ initials() }}</div>
        <div class="info">
          <div class="row1">
            <h3 class="name">{{ p.patientFullName }}</h3>
            @if (p.isUrgent) {
              <span class="urgent">URGENTE</span>
            }
          </div>
          <div class="meta">
            <span class="kv"><strong>DNI</strong> {{ p.patientDni }}</span>
            <span class="kv"><strong>Orden</strong> {{ p.attentionNumber }}</span>
            <span class="kv"><strong>{{ p.analysisCount }}</strong> análisis</span>
          </div>
        </div>
        <div class="right">
          <div class="timer">
            en curso desde <strong>{{ startedLabel() }}</strong>
            <span class="since">({{ minutesElapsed() }} min)</span>
          </div>
          <div class="box-pill"><i class="pi pi-box"></i> Box {{ p.attentionBox }}</div>
          <div class="actions">
            <p-button
              label="Cancelar"
              icon="pi pi-times"
              severity="danger"
              [outlined]="true"
              size="small"
              [disabled]="mutating()"
              (onClick)="cancelClicked.emit()"
            />
            <p-button
              label="Finalizar"
              icon="pi pi-check"
              severity="success"
              size="small"
              [disabled]="mutating()"
              (onClick)="endClicked.emit()"
            />
          </div>
        </div>
      </article>
    } @else {
      <article class="pcard-empty" aria-label="Sin extracción en curso">
        <i class="pi pi-inbox"></i>
        <div class="h">Sin extracción en curso</div>
        <div class="d">Cuando tomes un paciente de la cola va a aparecer acá con todos sus datos.</div>
      </article>
    }
  `,
  styles: [`
    :host { display: block; }

    .pcard {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px 22px;
      display: grid;
      grid-template-columns: 72px 1fr auto;
      gap: 18px;
      align-items: center;
      box-shadow: 0 1px 3px rgba(15,23,42,.04);
    }
    .avatar {
      width: 72px; height: 72px;
      border-radius: 50%;
      background: #a7f3d0;
      color: #065f46;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 700;
    }
    .info { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
    .row1 { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .name { font-size: 19px; font-weight: 700; color: #0f172a; margin: 0; }
    .urgent {
      background: #fee2e2;
      color: #dc2626;
      font-size: 10px;
      font-weight: 700;
      padding: 3px 9px;
      border-radius: 10px;
      letter-spacing: .5px;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      font-size: 12.5px;
      color: #64748b;
    }
    .meta .kv strong { color: #0f172a; font-weight: 600; margin-right: 2px; }

    .right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 10px;
      min-width: 200px;
    }
    .timer {
      font-size: 11px;
      color: #64748b;
      text-align: right;
    }
    .timer strong {
      font-size: 17px;
      color: #0f172a;
      font-weight: 700;
      display: block;
      line-height: 1.1;
    }
    .timer .since {
      color: #0891b2;
      font-weight: 600;
      display: block;
      margin-top: 2px;
    }
    .box-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #ccfbf1;
      color: #0f766e;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
    }
    .actions { display: flex; gap: 8px; }

    .pcard-empty {
      background: #fff;
      border: 1px dashed #e2e8f0;
      border-radius: 12px;
      padding: 28px;
      text-align: center;
      color: #64748b;
    }
    .pcard-empty i {
      font-size: 32px;
      color: #0891b2;
      opacity: .55;
      display: block;
      margin-bottom: 8px;
    }
    .pcard-empty .h {
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .pcard-empty .d { font-size: 12px; }
  `],
})
export class InProgressExtractionCardComponent {
  readonly patient = input<InExtractionItem | null>(null);
  readonly mutating = input<boolean>(false);

  @Output() readonly cancelClicked = new EventEmitter<void>();
  @Output() readonly endClicked = new EventEmitter<void>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly now = signal<number>(Date.now());

  readonly initials = computed(() => initialsOf(this.patient()?.patientFullName ?? ''));

  readonly startedLabel = computed(() => {
    const p = this.patient();
    if (!p?.extractionStartedAt) return '—';
    const d = new Date(p.extractionStartedAt);
    if (Number.isNaN(d.getTime())) return '—';
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  readonly minutesElapsed = computed(() => {
    const p = this.patient();
    if (!p?.extractionStartedAt) return 0;
    const started = new Date(p.extractionStartedAt).getTime();
    if (Number.isNaN(started)) return 0;
    const diffMs = this.now() - started;
    return Math.max(0, Math.floor(diffMs / 60_000));
  });

  constructor() {
    interval(60_000)
      .pipe(startWith(0), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.now.set(Date.now()));
  }
}

/**
 * Devuelve las iniciales para el avatar.
 * - "Sosa, Mariana" → "SM" (apellido + primer nombre).
 * - "Mariana Sosa" → "MS" (primeras dos palabras).
 * - "Maria" → "M".
 * - "" → "?".
 */
export function initialsOf(fullName: string): string {
  const name = (fullName ?? '').trim();
  if (!name) return '?';
  if (name.includes(',')) {
    const [last, rest] = name.split(',', 2);
    const a = first(last);
    const b = first(rest);
    return ((a + b) || '?').toUpperCase();
  }
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return first(parts[0]).toUpperCase();
  return (first(parts[0]) + first(parts[1])).toUpperCase();
}

function first(s: string | undefined): string {
  return (s ?? '').trim().charAt(0);
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

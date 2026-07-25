import { ChangeDetectionStrategy, Component, computed, Input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import type { Sample } from '../../models/sample.model';
import type { Transition, TransitionDest } from '../../models/transition.model';

@Component({
  selector: 'app-muestras-transition-dialog',
  standalone: true,
  imports: [FormsModule, NgClass],
  template: `
<div class="backdrop" (click)="onCancel()"></div>
<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title">
  <header class="dlg-header" [attr.data-color]="transition.color">
    <span class="icon"><i class="pi" [ngClass]="transition.icon"></i></span>
    <div>
      <h2 id="dlg-title">{{ transition.label }}</h2>
      <p>{{ transition.desc }}</p>
    </div>
    <button type="button" class="close" (click)="onCancel()" aria-label="Cerrar">
      <i class="pi pi-times"></i>
    </button>
  </header>

  <div class="dlg-body">
    <aside class="lot">
      <h3 class="label">{{ samples.length }} muestras en el lote</h3>
      <ul>
        @for (s of samples; track s.id) {
          <li>
            <span class="code">{{ s.barcode }}</span>
            <span class="meta">{{ s.study }} · {{ s.branch }}</span>
            @if (s.urgent) {
              <span class="urg">URG</span>
            }
          </li>
        }
      </ul>
    </aside>

    <section class="form">
      <div class="flow">
        <span class="state-badge src">{{ sourceLabel() }}</span>
        <span class="arrow">→</span>
        <span class="state-badge dest" [attr.data-color]="transition.color">
          {{ transition.toLabel }}
        </span>
        <span class="count">{{ samples.length }} muestras</span>
      </div>

      @if (needsSucursal()) {
        <label class="field">
          <span>Sucursal de destino <em>obligatorio</em></span>
          <select [ngModel]="dest().sucursal" (ngModelChange)="dest.update(d => ({ ...d, sucursal: $event }))">
            <option [ngValue]="undefined" disabled selected>Elegí una sucursal…</option>
            @for (b of branches; track b) {
              <option [ngValue]="b">{{ b }}</option>
            }
          </select>
        </label>
      }

      @if (areaFixedBranch()) {
        <label class="field readonly">
          <span>Sucursal de destino</span>
          <input type="text" [value]="currentBranch" readonly />
        </label>
      }

      @if (needsArea()) {
        <label class="field">
          <span>Área / sección <em>obligatorio</em></span>
          <select [ngModel]="dest().area" (ngModelChange)="dest.update(d => ({ ...d, area: $event }))">
            <option [ngValue]="undefined" disabled selected>Elegí un área…</option>
            @for (a of areas; track a) {
              <option [ngValue]="a">{{ a }}</option>
            }
          </select>
        </label>
      }

      @if (needsLab()) {
        <label class="field">
          <span>Laboratorio externo <em>obligatorio</em></span>
          <select [ngModel]="dest().lab" (ngModelChange)="dest.update(d => ({ ...d, lab: $event }))">
            <option [ngValue]="undefined" disabled selected>Elegí un laboratorio…</option>
            @for (l of labs; track l.id) {
              <option [ngValue]="l.id">{{ l.name }}</option>
            }
          </select>
        </label>
      }

      <label class="field">
        <span>Observaciones</span>
        <textarea
          rows="4"
          [ngModel]="note()"
          (ngModelChange)="note.set($event)"
          [placeholder]="transition.reason ?? 'Observaciones (opcional)'"
        ></textarea>
      </label>
    </section>
  </div>

  <footer class="dlg-footer">
    <button type="button" class="btn-secondary" (click)="onCancel()">Cancelar</button>
    <button
      type="button"
      class="btn-primary"
      [attr.data-color]="transition.color"
      [disabled]="!canConfirm()"
      (click)="onConfirm()"
    >
      Confirmar · {{ samples.length }} muestras
    </button>
  </footer>
</div>
  `,
  styles: [`
:host { display: contents; }

.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(28,30,55,.4);
  z-index: 200;
}

.dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 201;
  width: 768px;
  max-width: calc(100vw - 32px);
  max-height: 92vh;
  background: var(--card, #fff);
  border-radius: 16px;
  box-shadow: var(--shadow-lg, 0 24px 60px rgba(28,30,55,.22));
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dlg-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--line, #e8e9f0);
}

.dlg-header .icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eceef3;
  color: #5b6170;
}

.dlg-header[data-color="green"] .icon { background: #e3f6ec; color: #0f8a55; }
.dlg-header[data-color="red"]   .icon { background: #fdebeb; color: #d83a3a; }
.dlg-header[data-color="amber"] .icon { background: #fcf1dd; color: #b5740c; }
.dlg-header[data-color="blue"]  .icon { background: #e8f0ff; color: #2563eb; }
.dlg-header[data-color="purple"] .icon { background: #f1ecfe; color: #7a4ddb; }
.dlg-header[data-color="slate"] .icon { background: #eceef3; color: #5b6170; }

.dlg-header h2 { margin: 0; font-size: 16px; font-weight: 600; }
.dlg-header p  { margin: 2px 0 0; font-size: 13px; color: var(--muted, #7c8092); }

.dlg-header .close {
  margin-left: auto;
  background: transparent;
  border: 0;
  cursor: pointer;
  color: var(--muted, #7c8092);
  padding: 8px;
  border-radius: 8px;
}

.dlg-body {
  display: grid;
  grid-template-columns: 286px 1fr;
  flex: 1;
  overflow: hidden;
}

.lot {
  background: #fafbfd;
  border-right: 1px solid var(--line, #e8e9f0);
  padding: 14px 16px;
  overflow-y: auto;
}

.lot .label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted, #7c8092);
  margin: 0 0 8px;
}

.lot ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }

.lot li {
  background: #fff;
  border: 1px solid var(--line, #e8e9f0);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  position: relative;
}

.lot .code { font-family: 'Roboto Mono', monospace; font-weight: 500; color: var(--ink, #22243a); }
.lot .meta { color: var(--muted, #7c8092); }
.lot .urg { position: absolute; top: 8px; right: 8px; font-size: 9px; font-weight: 700; background: #fdebeb; color: #d83a3a; padding: 2px 5px; border-radius: 3px; }

.form {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
}

.flow {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.flow .arrow { color: var(--muted, #7c8092); font-size: 16px; }
.flow .count { color: var(--muted, #7c8092); margin-left: auto; }

.state-badge {
  padding: 4px 10px; border-radius: 8px; font-weight: 600;
}

.state-badge.src { background: #eceef3; color: #5b6170; }
.state-badge.dest[data-color="green"]  { background: #e3f6ec; color: #0f8a55; }
.state-badge.dest[data-color="red"]    { background: #fdebeb; color: #d83a3a; }
.state-badge.dest[data-color="amber"]  { background: #fcf1dd; color: #b5740c; }
.state-badge.dest[data-color="blue"]   { background: #e8f0ff; color: #2563eb; }
.state-badge.dest[data-color="purple"] { background: #f1ecfe; color: #7a4ddb; }
.state-badge.dest[data-color="slate"]  { background: #eceef3; color: #5b6170; }

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field span {
  font-size: 12px;
  font-weight: 500;
  color: var(--ink-2, #4a4d63);
}

.field span em {
  font-style: normal;
  font-weight: 600;
  font-size: 10px;
  color: #d83a3a;
  margin-left: 6px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.field select, .field input[type="text"], .field textarea {
  background: #fff;
  border: 1px solid var(--line, #e8e9f0);
  border-radius: 10px;
  padding: 10px 12px;
  font-family: inherit;
  font-size: 13.5px;
  color: var(--ink, #22243a);
  resize: vertical;
  min-height: 38px;
}

.field textarea { min-height: 90px; }

.field.readonly input[type="text"] {
  background: #fafbfd;
  border-style: dashed;
  color: var(--muted, #7c8092);
}

.dlg-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--line, #e8e9f0);
}

.dlg-footer button {
  height: 40px;
  padding: 0 16px;
  border-radius: 10px;
  border: 1px solid transparent;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.dlg-footer button:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-secondary {
  background: #fff;
  color: var(--ink-2, #4a4d63);
  border-color: var(--line, #e8e9f0);
}

.btn-primary {
  background: var(--brand, #4b4ddb);
  color: #fff;
}

.btn-primary[data-color="green"]  { background: #0f8a55; }
.btn-primary[data-color="red"]    { background: #d83a3a; }
.btn-primary[data-color="amber"]  { background: #b5740c; }
.btn-primary[data-color="blue"]   { background: #2563eb; }
.btn-primary[data-color="purple"] { background: #7a4ddb; }
.btn-primary[data-color="slate"]  { background: #5b6170; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransitionDialogComponent {
  @Input() transition!: Transition;
  @Input() samples: Sample[] = [];
  @Input() currentBranch: string = '';
  @Input() branches: ReadonlyArray<string> = [];
  @Input() areas: ReadonlyArray<string> = [];
  @Input() labs: ReadonlyArray<{ id: number; name: string }> = [];

  readonly confirm = output<{ dest: TransitionDest; note: string }>();
  readonly cancel = output<void>();

  readonly dest = signal<TransitionDest>({});
  readonly note = signal<string>('');

  readonly canConfirm = computed(() => {
    const fields = this.transition?.fields ?? [];
    const d = this.dest();
    return fields.every(f => {
      if (f === 'sucursal') return !!d.sucursal;
      if (f === 'area' || f === 'areaFixed') return !!d.area;
      // lab es un id numérico (KAN-226/227): != null en vez de !! para no descartar el id 0.
      if (f === 'lab') return d.lab != null;
      return true;
    });
  });

  readonly needsSucursal = computed(() => (this.transition?.fields ?? []).includes('sucursal'));
  readonly needsArea = computed(() => {
    const fields = this.transition?.fields ?? [];
    return fields.includes('area') || fields.includes('areaFixed');
  });
  readonly areaFixedBranch = computed(() => (this.transition?.fields ?? []).includes('areaFixed'));
  readonly needsLab = computed(() => (this.transition?.fields ?? []).includes('lab'));

  // Label del estado origen del lote (todas las muestras del lote están en el mismo estado).
  readonly sourceLabel = computed(() => {
    const ss = this.samples;
    if (!ss || ss.length === 0) return '';
    const labels: Record<Sample['state'], string> = {
      collected: 'Recolectada', transito: 'En tránsito', processing: 'En proceso',
      completed: 'Completada', derived: 'Derivada', rejected: 'Rechazada',
      lost: 'Perdida', discarded: 'Descartada',
    };
    return labels[ss[0].state];
  });

  onConfirm(): void {
    if (!this.canConfirm()) return;
    this.confirm.emit({ dest: this.dest(), note: this.note() });
  }

  onCancel(): void {
    this.cancel.emit();
  }
}

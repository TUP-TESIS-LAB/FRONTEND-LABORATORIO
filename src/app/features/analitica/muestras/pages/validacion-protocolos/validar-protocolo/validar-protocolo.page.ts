import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  SECCIONES, findProtocolo,
  type AnalisisProtocolo, type Determinacion, type SeccionKey,
} from '../../../data/validacion-protocolos.mock';

type FirmaEstado = 'no' | 'parcial' | 'total';

/**
 * Pantalla interna "Validar y firmar" de un protocolo (detalle del subtab Validación).
 * Accordion de análisis con tabla de determinaciones; validación manual por análisis y
 * firma electrónica parcial/total. Todo en memoria (mock) — sin backend ni store.
 */
@Component({
  selector: 'app-validar-protocolo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './validar-protocolo.page.html',
  styleUrl: './validar-protocolo.page.scss',
})
export class ValidarProtocoloPage {
  private readonly route = inject(ActivatedRoute);

  readonly p = findProtocolo(this.route.snapshot.paramMap.get('protocolId'));

  /** Análisis validados (arranca con los ya firmados). */
  readonly vset = signal<ReadonlySet<string>>(
    new Set(this.p.analisis.filter(a => a.firmado).map(a => a.id)),
  );
  /** Accordion: todos abiertos al entrar. */
  readonly expanded = signal<ReadonlySet<string>>(new Set(this.p.analisis.map(a => a.id)));
  readonly firma = signal<FirmaEstado>(
    this.p.analisis.every(a => a.firmado) ? 'total'
      : this.p.analisis.some(a => a.firmado) ? 'parcial'
        : 'no',
  );
  readonly toast = signal('');
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  /** Iniciales del paciente para el avatar. */
  readonly initials = this.p.paciente
    .replace(',', '').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

  readonly allVal = computed(() => this.p.analisis.every(a => this.vset().has(a.id)));
  readonly someVal = computed(() => this.vset().size > 0);
  readonly nVal = computed(() => this.vset().size);

  // --- accordion ---
  isOpen(id: string): boolean { return this.expanded().has(id); }
  toggle(id: string): void {
    this.expanded.update(set => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // --- validación ---
  isVal(id: string): boolean { return this.vset().has(id); }

  validar(a: AnalisisProtocolo, ev?: Event): void {
    ev?.stopPropagation();
    this.vset.update(set => new Set(set).add(a.id));
    this.flash('Análisis validado · ' + a.nombre);
  }

  validarTodo(): void {
    this.vset.set(new Set(this.p.analisis.map(a => a.id)));
    this.flash('Todos los análisis validados');
  }

  editar(a: AnalisisProtocolo, ev?: Event): void {
    ev?.stopPropagation();
    this.flash('Editar resultados · ' + a.nombre);
  }

  /** Validación automática: dentro de rango (sin flag). */
  autoOf(x: Determinacion): boolean { return !x.flag; }

  estadoAn(a: AnalisisProtocolo): [string, string] {
    return this.isVal(a.id) ? ['st-analisis', 'Validado'] : ['st-parcial', 'Validando'];
  }

  // --- firma ---
  firmaBadge(): [string, string] {
    const f = this.firma();
    if (f === 'total') return ['st-cargado', 'Firma total'];
    if (f === 'parcial') return ['st-parcial', 'Firma parcial'];
    return ['st-sin', 'No firmada'];
  }

  firmarParcial(): void {
    if (!this.someVal()) return;
    this.firma.set(this.allVal() ? 'total' : 'parcial');
    this.flash('Firma parcial registrada · ' + this.nVal() + ' análisis');
  }

  firmarTotal(): void {
    if (!this.allVal()) return;
    this.firma.set('total');
    this.flash('Protocolo firmado · firma total');
  }

  secLabel(k: SeccionKey): string { return SECCIONES[k].label; }
  secHue(k: SeccionKey): number { return SECCIONES[k].hue; }

  valorClass(x: Determinacion): string {
    return 'vt-v' + (x.flag === 'H' ? ' flag-h' : x.flag === 'L' ? ' flag-l' : '');
  }

  private flash(m: string): void {
    this.toast.set(m);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(''), 2200);
  }
}

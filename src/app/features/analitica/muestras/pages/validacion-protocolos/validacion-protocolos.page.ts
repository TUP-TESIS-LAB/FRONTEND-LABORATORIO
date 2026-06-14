import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import {
  PROTOCOLOS, SECCIONES, FILTROS,
  detsDe, firmadosDe, estadoProt, badgeProt,
  type Protocolo, type SeccionKey, type EstadoProtocolo,
} from '../../data/validacion-protocolos.mock';

/**
 * Pantalla "Validación" (subtab de Muestras). Listado de protocolos con resultados
 * cargados, pendientes de firma bioquímica. Cada fila expande para ver sus análisis;
 * "Validar"/"Ver" navega al detalle full-page (validar-protocolo).
 *
 * UI con datos mock en memoria — sin backend ni store (ver validacion-protocolos.mock.ts).
 */
@Component({
  selector: 'app-validacion-protocolos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent],
  templateUrl: './validacion-protocolos.page.html',
  styleUrl: './validacion-protocolos.page.scss',
})
export class ValidacionProtocolosPage {
  private readonly router = inject(Router);

  readonly FILTROS = FILTROS;
  readonly detsDe = detsDe;
  readonly firmadosDe = firmadosDe;
  readonly estadoProt = estadoProt;
  readonly badgeProt = badgeProt;

  readonly protos = signal<Protocolo[]>(PROTOCOLOS);
  readonly expanded = signal<ReadonlySet<string>>(new Set());
  readonly q = signal('');
  readonly filtro = signal<'todos' | EstadoProtocolo>('todos');

  // --- contadores por estado de firma ---
  readonly cSin = computed(() => this.protos().filter(p => estadoProt(p) === 'sin').length);
  readonly cParcial = computed(() => this.protos().filter(p => estadoProt(p) === 'parcial').length);
  readonly cTotal = computed(() => this.protos().filter(p => estadoProt(p) === 'total').length);

  readonly visibles = computed<Protocolo[]>(() => {
    const q = this.q().trim().toLowerCase();
    const f = this.filtro();
    return this.protos().filter(p => {
      if (f !== 'todos' && estadoProt(p) !== f) return false;
      if (!q) return true;
      return (p.paciente + ' ' + p.id).toLowerCase().includes(q);
    });
  });

  isOpen(id: string): boolean { return this.expanded().has(id); }

  toggle(id: string): void {
    this.expanded.update(set => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  setQ(v: string): void { this.q.set(v); }
  setFiltro(v: 'todos' | EstadoProtocolo): void { this.filtro.set(v); }

  secLabel(k: SeccionKey): string { return SECCIONES[k].label; }
  secHue(k: SeccionKey): number { return SECCIONES[k].hue; }

  validar(p: Protocolo, ev: Event): void {
    ev.stopPropagation();
    this.router.navigate(['/analitica/validacion', p.id]);
  }
}

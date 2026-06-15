import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { calcularEdad } from '@shared/utils/calcular-edad';
import {
  estadoFirmaListado, badgeFirmaListado, badgeResultado,
  type ValidationListRow, type EstadoFirmaListado, type DetalleResultado,
} from '../../models/postanalitica.model';
import { PostanaliticaApiService } from '../../services/postanalitica-api.service';
import { loadValidacionProtocolos } from '../../store/validacion-protocolos/validacion-protocolos.actions';
import {
  selectValidacionRows, selectValidacionPending,
} from '../../store/validacion-protocolos/validacion-protocolos.selectors';

const FILTROS: ReadonlyArray<{ id: 'todos' | EstadoFirmaListado; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'sin', label: 'Sin firma' },
  { id: 'parcial', label: 'Firma parcial' },
  { id: 'listo', label: 'Listo para firmar' },
  { id: 'cerrado', label: 'Cerrados' },
];

@Component({
  selector: 'app-validacion-protocolos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, DatePipe],
  templateUrl: './validacion-protocolos.page.html',
  styleUrl: './validacion-protocolos.page.scss',
})
export class ValidacionProtocolosPage implements OnInit {
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly api = inject(PostanaliticaApiService);

  readonly FILTROS = FILTROS;
  readonly estadoFirmaListado = estadoFirmaListado;
  readonly badgeFirmaListado = badgeFirmaListado;
  readonly badgeResultado = badgeResultado;

  readonly rows = this.store.selectSignal(selectValidacionRows);
  readonly pending = this.store.selectSignal(selectValidacionPending);

  readonly q = signal('');
  readonly filtro = signal<'todos' | EstadoFirmaListado>('todos');

  // GAP-8: expandible lazy — cache de análisis por protocolo + filas abiertas.
  readonly expanded = signal<ReadonlySet<number>>(new Set());
  readonly analisis = signal<ReadonlyMap<number, DetalleResultado[]>>(new Map());
  readonly loadingAnalisis = signal<ReadonlySet<number>>(new Set());

  // GAP-5: contadores por estado, distinguiendo accionables de cerrados.
  readonly cSin = computed(() => this.rows().filter(r => estadoFirmaListado(r.currentStatus) === 'sin').length);
  readonly cParcial = computed(() => this.rows().filter(r => estadoFirmaListado(r.currentStatus) === 'parcial').length);
  readonly cListo = computed(() => this.rows().filter(r => estadoFirmaListado(r.currentStatus) === 'listo').length);
  readonly cCerrado = computed(() => this.rows().filter(r => estadoFirmaListado(r.currentStatus) === 'cerrado').length);

  readonly visibles = computed<ValidationListRow[]>(() => {
    const q = this.q().trim().toLowerCase();
    const f = this.filtro();
    return this.rows().filter(r => {
      if (f !== 'todos' && estadoFirmaListado(r.currentStatus) !== f) return false;
      if (!q) return true;
      return (r.patientName + ' ' + r.protocolCode).toLowerCase().includes(q);
    });
  });

  ngOnInit(): void {
    this.store.dispatch(loadValidacionProtocolos());
  }

  setQ(v: string): void { this.q.set(v); }
  setFiltro(v: 'todos' | EstadoFirmaListado): void { this.filtro.set(v); }
  edad(r: ValidationListRow): number | null { return calcularEdad(r.patientBirthDate); }

  // --- GAP-8: expandible de análisis (cerrado por defecto, carga lazy) ---
  isOpen(protocolId: number): boolean { return this.expanded().has(protocolId); }
  analisisDe(protocolId: number): DetalleResultado[] | undefined { return this.analisis().get(protocolId); }
  isLoadingAnalisis(protocolId: number): boolean { return this.loadingAnalisis().has(protocolId); }

  toggle(r: ValidationListRow, ev?: Event): void {
    ev?.stopPropagation();
    const id = r.protocolId;
    const isOpen = this.expanded().has(id);
    this.expanded.update(s => { const n = new Set(s); isOpen ? n.delete(id) : n.add(id); return n; });
    if (!isOpen && !this.analisis().has(id) && !this.loadingAnalisis().has(id)) {
      this.cargarAnalisis(id);
    }
  }

  private cargarAnalisis(protocolId: number): void {
    this.loadingAnalisis.update(s => new Set(s).add(protocolId));
    this.api.getDetalle(protocolId).subscribe({
      next: detalle => {
        this.analisis.update(m => new Map(m).set(protocolId, detalle.results));
        this.loadingAnalisis.update(s => { const n = new Set(s); n.delete(protocolId); return n; });
      },
      error: () => {
        this.analisis.update(m => new Map(m).set(protocolId, []));
        this.loadingAnalisis.update(s => { const n = new Set(s); n.delete(protocolId); return n; });
      },
    });
  }

  validar(r: ValidationListRow, ev: Event): void {
    ev.stopPropagation();
    this.router.navigate(['/analitica/validacion', r.protocolId], {
      state: { patientName: r.patientName, patientSex: r.patientSex, patientBirthDate: r.patientBirthDate },
    });
  }
}

import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { calcularEdad } from '@shared/utils/calcular-edad';
import {
  estadoFirmaDe, badgeFirma,
  type ValidationListRow, type EstadoFirma,
} from '../../models/postanalitica.model';
import { loadValidacionProtocolos } from '../../store/validacion-protocolos/validacion-protocolos.actions';
import {
  selectValidacionRows, selectValidacionPending,
} from '../../store/validacion-protocolos/validacion-protocolos.selectors';

const FILTROS: ReadonlyArray<{ id: 'todos' | EstadoFirma; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'sin', label: 'Sin firma' },
  { id: 'parcial', label: 'Firma parcial' },
  { id: 'total', label: 'Firma total' },
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

  readonly FILTROS = FILTROS;
  readonly estadoFirmaDe = estadoFirmaDe;
  readonly badgeFirma = badgeFirma;

  readonly rows = this.store.selectSignal(selectValidacionRows);
  readonly pending = this.store.selectSignal(selectValidacionPending);

  readonly q = signal('');
  readonly filtro = signal<'todos' | EstadoFirma>('todos');

  readonly cSin = computed(() => this.rows().filter(r => estadoFirmaDe(r.currentStatus) === 'sin').length);
  readonly cParcial = computed(() => this.rows().filter(r => estadoFirmaDe(r.currentStatus) === 'parcial').length);
  readonly cTotal = computed(() => this.rows().filter(r => estadoFirmaDe(r.currentStatus) === 'total').length);

  readonly visibles = computed<ValidationListRow[]>(() => {
    const q = this.q().trim().toLowerCase();
    const f = this.filtro();
    return this.rows().filter(r => {
      if (f !== 'todos' && estadoFirmaDe(r.currentStatus) !== f) return false;
      if (!q) return true;
      return (r.patientName + ' ' + r.protocolCode).toLowerCase().includes(q);
    });
  });

  ngOnInit(): void {
    this.store.dispatch(loadValidacionProtocolos());
  }

  setQ(v: string): void { this.q.set(v); }
  setFiltro(v: 'todos' | EstadoFirma): void { this.filtro.set(v); }
  edad(r: ValidationListRow): number | null { return calcularEdad(r.patientBirthDate); }

  validar(r: ValidationListRow, ev: Event): void {
    ev.stopPropagation();
    this.router.navigate(['/analitica/validacion', r.protocolId], {
      state: { patientName: r.patientName, patientSex: r.patientSex, patientBirthDate: r.patientBirthDate },
    });
  }
}

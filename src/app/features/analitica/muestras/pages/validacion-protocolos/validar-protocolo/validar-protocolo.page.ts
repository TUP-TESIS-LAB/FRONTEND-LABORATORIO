import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { calcularEdad } from '@shared/utils/calcular-edad';
import { estadoFirmaDe, badgeFirma } from '../../../models/postanalitica.model';
import type { DetalleResultado, DetalleDeterminacion } from '../../../models/postanalitica.model';
import { loadDetalle, validarTodo, firmarResultado, firmarEstudio } from '../../../store/validacion-detalle/validacion-detalle.actions';
import { selectDetalle, selectDetalleLoading, selectDetalleSaving } from '../../../store/validacion-detalle/validacion-detalle.selectors';

@Component({
  selector: 'app-validar-protocolo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './validar-protocolo.page.html',
  styleUrl: './validar-protocolo.page.scss',
})
export class ValidarProtocoloPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  readonly badgeFirma = badgeFirma;
  readonly estadoFirmaDe = estadoFirmaDe;

  readonly detalle = this.store.selectSignal(selectDetalle);
  readonly loading = this.store.selectSignal(selectDetalleLoading);
  readonly saving = this.store.selectSignal(selectDetalleSaving);

  readonly protocolId = Number(this.route.snapshot.paramMap.get('protocolId'));
  readonly expanded = signal<ReadonlySet<number>>(new Set());

  readonly results = computed<DetalleResultado[]>(() => this.detalle()?.results ?? []);
  readonly studyStatus = computed(() => this.detalle()?.study.currentStatus ?? 'PENDING');
  readonly canSignStudy = computed(() => this.studyStatus() === 'READY_FOR_SIGNATURE');
  readonly edad = computed(() => calcularEdad(this.detalle()?.patientBirthDate ?? null));

  ngOnInit(): void {
    const st = (this.router.getCurrentNavigation()?.extras.state ?? history.state) as
      { patientName?: string; patientSex?: string | null; patientBirthDate?: string | null };
    this.store.dispatch(loadDetalle({
      protocolId: this.protocolId,
      patientName: st?.patientName, patientSex: st?.patientSex, patientBirthDate: st?.patientBirthDate,
    }));
    this.expanded.set(new Set(this.results().map(r => r.resultId)));
  }

  isOpen(id: number): boolean { return this.expanded().has(id); }
  toggle(id: number): void { this.expanded.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  canSignResult(r: DetalleResultado): boolean { return r.status === 'VALIDATED'; }
  outOf(d: DetalleDeterminacion): boolean { return d.outOfRange; }

  validarTodo(r: DetalleResultado, ev?: Event): void {
    ev?.stopPropagation();
    this.store.dispatch(validarTodo({ resultId: r.resultId, outcome: 'PASS' }));
  }
  firmarResultado(r: DetalleResultado, ev?: Event): void {
    ev?.stopPropagation();
    if (confirm('¿Firmar este resultado como bioquímico?')) this.store.dispatch(firmarResultado({ resultId: r.resultId }));
  }
  firmarEstudio(): void {
    if (confirm('¿Firmar el estudio completo? Esta acción lo cierra.')) this.store.dispatch(firmarEstudio({ protocolId: this.protocolId }));
  }
}

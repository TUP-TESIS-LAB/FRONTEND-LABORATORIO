import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { calcularEdad } from '@shared/utils/calcular-edad';
import { humanizeBackendError } from '@shared/utils/error-messages';
import { badgeFirma, badgeResultado } from '../../../models/postanalitica.model';
import type { DetalleResultado, DetalleDeterminacion } from '../../../models/postanalitica.model';
import { loadDetalle, validarTodo, firmarResultado, firmarEstudio } from '../../../store/validacion-detalle/validacion-detalle.actions';
import { selectDetalle, selectDetalleLoading, selectDetalleSaving, selectDetalleError } from '../../../store/validacion-detalle/validacion-detalle.selectors';

@Component({
  selector: 'app-validar-protocolo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ToastModule],
  providers: [MessageService],
  templateUrl: './validar-protocolo.page.html',
  styleUrl: './validar-protocolo.page.scss',
})
export class ValidarProtocoloPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly messages = inject(MessageService);

  readonly badgeFirma = badgeFirma;
  readonly badgeResultado = badgeResultado;

  readonly detalle = this.store.selectSignal(selectDetalle);
  readonly loading = this.store.selectSignal(selectDetalleLoading);
  readonly saving = this.store.selectSignal(selectDetalleSaving);
  private readonly error = this.store.selectSignal(selectDetalleError);

  readonly protocolId = Number(this.route.snapshot.paramMap.get('protocolId'));
  readonly expanded = signal<ReadonlySet<number>>(new Set());

  readonly results = computed<DetalleResultado[]>(() => this.detalle()?.results ?? []);
  readonly studyStatus = computed(() => this.detalle()?.study.currentStatus ?? 'PENDING');
  readonly canSignStudy = computed(() => this.studyStatus() === 'READY_FOR_SIGNATURE');
  readonly edad = computed(() => calcularEdad(this.detalle()?.patientBirthDate ?? null));
  readonly firmaBadge = computed(() => badgeFirma(this.studyStatus()));

  constructor() {
    let lastSig: string | null = null;
    effect(() => {
      const err = this.error();
      const sig = err ? `${(err as { status?: unknown }).status}:${(err as { message?: unknown }).message}` : null;
      if (sig && sig !== lastSig) {
        lastSig = sig;
        this.messages.add({ severity: 'error', summary: 'Error',
          detail: humanizeBackendError(err, { fallback: 'No pudimos completar la operación. Probá de nuevo.' }), life: 5000 });
      }
    });
  }

  ngOnInit(): void {
    const st = (this.router.getCurrentNavigation()?.extras.state ?? history.state) as
      { patientName?: string; patientSex?: string | null; patientBirthDate?: string | null };
    this.store.dispatch(loadDetalle({
      protocolId: this.protocolId,
      patientName: st?.patientName, patientSex: st?.patientSex, patientBirthDate: st?.patientBirthDate,
    }));
  }

  isOpen(id: number): boolean { return this.expanded().size === 0 || this.expanded().has(id); }
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

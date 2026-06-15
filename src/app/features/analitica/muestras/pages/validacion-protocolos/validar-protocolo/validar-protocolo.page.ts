import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { calcularEdad } from '@shared/utils/calcular-edad';
import { humanizeBackendError } from '@shared/utils/error-messages';
import { badgeFirma, badgeResultado } from '../../../models/postanalitica.model';
import type { DetalleResultado, DetalleDeterminacion } from '../../../models/postanalitica.model';
import { loadDetalle, validarTodo, firmarEstudio } from '../../../store/validacion-detalle/validacion-detalle.actions';
import { selectDetalle, selectDetalleLoading, selectDetalleSaving, selectDetalleError } from '../../../store/validacion-detalle/validacion-detalle.selectors';
import { FirmarEstudioModalComponent } from '../../../components/firmar-estudio-modal/firmar-estudio-modal.component';

@Component({
  selector: 'app-validar-protocolo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ToastModule, FirmarEstudioModalComponent],
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
  /** Acordeón: arranca con TODOS abiertos; toggle agrega/quita de forma coherente. */
  readonly expanded = signal<ReadonlySet<number>>(new Set());
  /** Modal de confirmación de firma de estudio. */
  readonly firmarModalOpen = signal(false);

  readonly results = computed<DetalleResultado[]>(() => this.detalle()?.results ?? []);
  readonly studyStatus = computed(() => this.detalle()?.study.currentStatus ?? 'PENDING');
  readonly isClosed = computed(() => this.studyStatus() === 'CLOSED');
  /** Puede firmar el estudio mientras no esté cerrado y haya al menos un resultado validado. */
  readonly canOpenFirmaModal = computed(() =>
    !this.isClosed() && this.results().some(r => r.status === 'VALIDATED'));
  readonly firmaBadge = computed(() => badgeFirma(this.studyStatus()));

  // Datos del paciente: prioriza el header del backend (GAP-4); fallback a router.state.
  readonly patientName = computed(() => this.detalle()?.study.patientName ?? this.detalle()?.patientName ?? null);
  readonly patientSex = computed(() => this.detalle()?.study.patientSex ?? this.detalle()?.patientSex ?? null);
  readonly edad = computed(() =>
    calcularEdad(this.detalle()?.study.patientBirthDate ?? this.detalle()?.patientBirthDate ?? null));

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

    // Cuando llegan los resultados, abrir todas las filas por defecto (una sola vez por carga).
    let lastSeenIds = '';
    effect(() => {
      const ids = this.results().map(r => r.resultId);
      const sig = ids.join(',');
      if (sig && sig !== lastSeenIds) {
        lastSeenIds = sig;
        this.expanded.set(new Set(ids));
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

  isOpen(id: number): boolean { return this.expanded().has(id); }
  toggle(id: number): void {
    this.expanded.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  /** Nombre a mostrar del análisis (GAP-4); fallback al id si el back no lo trae. */
  nombreAnalisis(r: DetalleResultado): string {
    return r.analysisName ?? `Resultado #${r.resultId}`;
  }

  canValidate(r: DetalleResultado): boolean {
    return !this.isClosed() && r.status !== 'SIGNED' && r.status !== 'VALIDATED';
  }
  canEdit(r: DetalleResultado): boolean { return !this.isClosed() && r.status !== 'SIGNED'; }
  outOf(d: DetalleDeterminacion): boolean { return d.outOfRange; }

  /** GAP-9: "Validar" deja el resultado VALIDATED (validate-all con PASS). */
  validar(r: DetalleResultado, ev?: Event): void {
    ev?.stopPropagation();
    if (!this.canValidate(r)) return;
    this.store.dispatch(validarTodo({ resultId: r.resultId, outcome: 'PASS' }));
  }

  /** GAP-9: "Editar" lleva a Cargar resultados de ese protocolo. */
  editar(r: DetalleResultado, ev?: Event): void {
    ev?.stopPropagation();
    if (!this.canEdit(r)) return;
    this.router.navigate(['/analitica/procesamiento/cargar'], { queryParams: { protocols: this.protocolId } });
  }

  // --- Firma de estudio: abre modal de confirmación; el modal orquesta la firma. ---
  abrirFirmaModal(): void { if (this.canOpenFirmaModal()) this.firmarModalOpen.set(true); }
  cerrarFirmaModal(): void { this.firmarModalOpen.set(false); }
  confirmarFirma(): void {
    this.firmarModalOpen.set(false);
    this.store.dispatch(firmarEstudio({ protocolId: this.protocolId }));
  }
}

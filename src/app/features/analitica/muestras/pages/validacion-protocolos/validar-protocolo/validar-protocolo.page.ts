import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { calcularEdad } from '@shared/utils/calcular-edad';
import { badgeFirma, badgeResultado, esPendiente } from '../../../models/postanalitica.model';
import type { DetalleResultado, DetalleDeterminacion, ValidationOutcome } from '../../../models/postanalitica.model';
import { loadDetalle, validarTodo, firmarEstudio, verPdf } from '../../../store/validacion-detalle/validacion-detalle.actions';
import { selectDetalle, selectDetalleLoading, selectDetalleSaving, selectDetallePdfLoading } from '../../../store/validacion-detalle/validacion-detalle.selectors';
import { FirmarEstudioModalComponent } from '../../../components/firmar-estudio-modal/firmar-estudio-modal.component';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { ModuleKey } from '@core/models/module-key.enum';

@Component({
  selector: 'app-validar-protocolo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FirmarEstudioModalComponent],
  templateUrl: './validar-protocolo.page.html',
  styleUrl: './validar-protocolo.page.scss',
})
export class ValidarProtocoloPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly moduleRegistry = inject(ModuleRegistry);

  /** La columna "Validación Automática" solo se muestra si el módulo autovalidación está activo. */
  readonly autoValidacionActiva = computed(() => this.moduleRegistry.isActive(ModuleKey.Autovalidacion));

  readonly badgeFirma = badgeFirma;
  readonly badgeResultado = badgeResultado;
  readonly esPendiente = esPendiente;

  readonly detalle = this.store.selectSignal(selectDetalle);
  readonly loading = this.store.selectSignal(selectDetalleLoading);
  readonly saving = this.store.selectSignal(selectDetalleSaving);
  readonly pdfLoading = this.store.selectSignal(selectDetallePdfLoading);

  readonly protocolId = Number(this.route.snapshot.paramMap.get('protocolId'));
  /**
   * Acordeón: arranca con TODOS abiertos; toggle agrega/quita de forma coherente.
   * La clave es string (no resultId) porque los pendientes no traen resultId real.
   */
  readonly expanded = signal<ReadonlySet<string>>(new Set());
  /** Modal de confirmación de firma de estudio. */
  readonly firmarModalOpen = signal(false);

  readonly results = computed<DetalleResultado[]>(() => this.detalle()?.results ?? []);
  readonly studyStatus = computed(() => this.detalle()?.study.currentStatus ?? 'PENDING');
  readonly isClosed = computed(() => this.studyStatus() === 'CLOSED');
  /**
   * Habilita "Firmar estudio" mientras el estudio no esté cerrado y quede algo que firmar.
   *
   * Hay dos casos distintos y antes sólo se contemplaba el primero:
   *  1. Quedan resultados en VALIDATED → el modal los firma uno a uno.
   *  2. Ya están TODOS los resultados firmados y falta sólo la firma del estudio, que es
   *     exactamente el estado READY_FOR_SIGNATURE. Acá no hay ningún VALIDATED, así que la
   *     condición vieja apagaba el botón justo en el estado donde más se lo necesita: el
   *     estudio quedaba sin poder cerrarse y sin informe final para el paciente.
   *
   * El effect de firma ya resolvía bien el caso 2 (calcula `quedanTodosFirmados` y agrega
   * `signStudy`), pero el guard no dejaba llegar hasta él.
   */
  readonly canOpenFirmaModal = computed(() =>
    !this.isClosed()
    && (this.results().some(r => r.status === 'VALIDATED')
        || this.studyStatus() === 'READY_FOR_SIGNATURE'));
  readonly firmaBadge = computed(() => badgeFirma(this.studyStatus()));
  /**
   * El estudio tiene al menos un informe firmado disponible (parcial o cerrado).
   * El back genera-si-falta el PDF, así que basta con que esté firmado para que
   * "Ver PDF" devuelva el documento.
   */
  readonly estaFirmado = computed(() => {
    const st = this.studyStatus();
    return st === 'PARTIALLY_SIGNED' || st === 'CLOSED';
  });

  // Datos del paciente: prioriza el header del backend (GAP-4); fallback a router.state.
  readonly patientName = computed(() => this.detalle()?.study.patientName ?? this.detalle()?.patientName ?? null);
  readonly patientSex = computed(() => this.detalle()?.study.patientSex ?? this.detalle()?.patientSex ?? null);
  readonly edad = computed(() =>
    calcularEdad(this.detalle()?.study.patientBirthDate ?? this.detalle()?.patientBirthDate ?? null));

  constructor() {
    // El toast de error de carga/validación/firma se emite desde el effect (NotificationService).
    // Cuando llegan los resultados, abrir todas las filas por defecto (una sola vez por carga).
    let lastSeenIds = '';
    effect(() => {
      const keys = this.results().map((r, i) => this.rowKey(r, i));
      const sig = keys.join(',');
      if (sig && sig !== lastSeenIds) {
        lastSeenIds = sig;
        this.expanded.set(new Set(keys));
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

  /**
   * Clave estable de la fila para track/acordeón. Los pendientes no traen
   * `resultId` real, así que se identifican por índice + nombre.
   */
  rowKey(r: DetalleResultado, i: number): string {
    return esPendiente(r) ? `p-${i}-${r.analysisName ?? ''}` : `r-${r.resultId}`;
  }

  isOpen(key: string): boolean { return this.expanded().has(key); }
  toggle(key: string): void {
    this.expanded.update(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

  /** Nombre a mostrar del análisis (GAP-4); fallback al id si el back no lo trae. */
  nombreAnalisis(r: DetalleResultado): string {
    return r.analysisName ?? `Resultado #${r.resultId}`;
  }

  /** Traduce el sexo crudo del back (MALE/FEMALE/INTERSEX) a español; valor crudo si no mapea. */
  sexoLabel(value: string | null): string {
    switch (value) {
      case 'MALE': return 'Masculino';
      case 'FEMALE': return 'Femenino';
      case 'INTERSEX': return 'Intersex';
      default: return value ?? '';
    }
  }

  /** Traduce el outcome de validación (PASS/WARNING/FAIL) a español. */
  outcomeLabel(o: ValidationOutcome | null): string {
    switch (o) {
      case 'PASS': return 'Correcto';
      case 'WARNING': return 'Advertencia';
      case 'FAIL': return 'Fuera de rango';
      default: return '';
    }
  }

  /** Badge de estado de la fila: neutro ("Pendiente") para pendientes; estado normal para el resto. */
  badgeAnalisis(r: DetalleResultado): [string, string] {
    return esPendiente(r) ? ['st-sin', 'Pendiente'] : badgeResultado(r.status);
  }

  /**
   * Completitud del resultado (Parte 2 — gate de validación). Un resultado está
   * completo cuando todas sus determinaciones tienen valor cargado; el back lo
   * expone en `isComplete`. Degradación suave: si llega undefined/null (back viejo
   * sin desplegar), se trata como completo para NO bloquear de más.
   */
  esCompleto(r: DetalleResultado): boolean {
    return r.isComplete !== false;
  }

  /**
   * El resultado está en un estado en el que la acción "Validar" aplica
   * (no cerrado, no firmado, no ya validado). Independiente de la completitud:
   * sirve para decidir si MOSTRAR el botón (que luego se deshabilita si falta
   * cargar determinaciones).
   */
  esValidable(r: DetalleResultado): boolean {
    if (esPendiente(r)) return false; // un pendiente no se valida (sin resultado todavía)
    return !this.isClosed() && r.status !== 'SIGNED' && r.status !== 'VALIDATED';
  }

  canValidate(r: DetalleResultado): boolean {
    return this.esValidable(r) && this.esCompleto(r);
  }
  canEdit(r: DetalleResultado): boolean {
    if (esPendiente(r)) return false; // sin resultado: nada para editar
    return !this.isClosed() && r.status !== 'SIGNED';
  }
  outOf(d: DetalleDeterminacion): boolean { return d.outOfRange; }

  /**
   * Valor critico (panic value): el motor lo marca FAIL, no WARNING. No es lo mismo que "alterado"
   * — un potasio de 6.2 con riesgo de arritmia y uno de 5.2 no pueden verse igual. Se distingue en
   * rojo pleno para que salte a la vista antes de firmar.
   */
  esCritico(d: DetalleDeterminacion): boolean { return d.aggregateOutcome === 'FAIL'; }

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

  /** Descarga el informe firmado del estudio y lo abre (vía effect verPdf$). */
  verPdf(): void {
    if (!this.estaFirmado() || this.pdfLoading()) return;
    this.store.dispatch(verPdf({ protocolId: this.protocolId }));
  }
}

# Impresión de estudio con auditoría — Plan de implementación

> **Jira:** [KAN-211](https://exequielsantoro.atlassian.net/browse/KAN-211)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la secretaría (y el resto del staff clínico) pueda imprimir desde el historial de paciente el PDF de resultado ya firmado de un protocolo, sin ver el valor clínico en pantalla, con auditoría de quién imprimió y cuándo.

**Architecture:** Backend en el módulo `atencion` (dueño del historial): nuevo endpoint + `PrintPatientReportUseCase` que reusa el puerto cross-módulo `PortalReportQueryPort` de `postanalitica` (extendido con un método que no filtra por tipo de reporte) para descargar el PDF más reciente, y persiste una fila de auditoría en una tabla nueva propia de `atencion`. Frontend: botón en la fila expandida del historial de paciente que descarga el blob y lo abre en pestaña nueva (mismo patrón ya usado para "Ver PDF" en validación), más un indicador de última impresión leído del mismo historial.

**Tech Stack:** Spring Boot / JPA / Flyway / MySQL-H2 (Backend); Angular 21 standalone + signals + PrimeNG (Frontend).

## Global Constraints

- Repos y ramas: **Backend** en `c:\Users\tobia\Desktop\TUP\TESIS\Backend\.worktrees\print-report-audit` (branch `feat/print-report-audit`, desde `development`); **Frontend** en `c:\Users\tobia\Desktop\TUP\TESIS\FRONTEND-LABORATORIO\.worktrees\print-report-audit` (branch `feat/print-report-audit`, desde `development`). Todos los comandos de cada tarea asumen `cd` a la raíz de ese worktree.
- Regla #4 (ambos CLAUDE.md): todo mensaje de error visible al usuario va en español, sin FQCN/stack traces/nombres de clase. Los `DomainException` propios pueden propagar `getMessage()` porque ya están en español.
- No usar `@PreAuthorize` a nivel de método sin verificar que overridea correctamente el de clase (`SecretaryAttentionController` tiene `@PreAuthorize("hasAnyRole('SECRETARIA', 'ADMINISTRADOR')")` a nivel de clase — otros métodos ya widen/narrow con su propio `@PreAuthorize` de método).
- Java: seguir el layout `domain → application → infrastructure → presentation` existente en `modules/analitica/atencion` y `modules/analitica/postanalitica`.
- Angular: no usar NgRx store para esta pantalla — el historial de paciente (`patient-detail.page.ts`) ya usa un `signal` + `PatientHistoryService` inyectado directo, sin store/effects (precedente local ya establecido); seguir ese mismo patrón para la acción de imprimir, no forzar el patrón NgRx global.
- Todo migration Flyway nuevo: **verificar el máximo real de `Vnnn` en `src/main/resources/db/migration` al momento de crear el archivo** (no asumir el número de este plan es el final — al momento de escribir este plan el máximo era `V1072`, así que se usa `V1074` para dejar margen a otros PRs en curso, pero hay que re-chequear antes de aplicar).

---
## Parte B — Frontend (`FRONTEND-LABORATORIO/.worktrees/print-report-audit`)

### Task 0: Portar los 5 fixes de historial/form ya hechos hoy (adaptados a la estructura actual)

`development` ya tiene un refactor de header (`ui-page-header` / `PageHeaderComponent`) que la rama vieja `feat/pacientes-rework` no tenía todavía — esta tarea aplica el mismo cambio conceptual sobre la estructura ACTUAL de estos archivos (leída y verificada en este worktree), no un cherry-pick literal del commit viejo.

**Files:**
- Modify: `src/app/features/pacientes/pages/patient-detail/patient-detail.page.ts`
- Modify: `src/app/features/pacientes/models/patient-history.model.ts`
- Modify: `src/app/features/pacientes/pages/patient-form/patient-form.page.ts`

**Interfaces:**
- Produces: `PatientHistoryAnalysis.analysisName: string | null`, `PatientHistoryItem.copaymentAmount`/`authorizationNumber: string | null` — consumidos por Task 3 más adelante (no romper esta forma).

- [ ] **Step 1: Rename de columna + fix del N+1 de nombre de análisis (`patient-detail.page.ts`)**

Reemplazar:
```ts
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DniPipe } from '@shared/pipes/dni.pipe';
```
por:
```ts
import { DniPipe } from '@shared/pipes/dni.pipe';
```

Reemplazar:
```ts
import { AnalysisService } from '@features/analitica/services/analysis.service';
import {
  loadPatient, loadPatientFailure, clearSelectedPatient, togglePatientActive,
} from '../../store/patient.actions';
```
por:
```ts
import {
  loadPatient, loadPatientFailure, clearSelectedPatient, togglePatientActive,
} from '../../store/patient.actions';
```

Reemplazar:
```ts
  private readonly historyService = inject(PatientHistoryService);
  private readonly analysisService = inject(AnalysisService);
  readonly canMutate = this.perms.canMutate;
```
por:
```ts
  private readonly historyService = inject(PatientHistoryService);
  readonly canMutate = this.perms.canMutate;
```

Reemplazar:
```ts
  readonly history = signal<PatientHistoryItem[]>([]);
  private readonly analysisNameById = signal<ReadonlyMap<number, string>>(new Map());
  readonly historyColumns: readonly TableColumn[] = [
```
por:
```ts
  readonly history = signal<PatientHistoryItem[]>([]);
  readonly historyColumns: readonly TableColumn[] = [
```

Reemplazar el método completo:
```ts
  /** Carga el historial y resuelve los nombres de los análisis (el BE devuelve sólo el id). */
  private loadHistory(patientId: number): void {
    this.historyService.getHistory(patientId).subscribe({
      next: (items) => {
        this.history.set(items);
        const ids = [...new Set(items.flatMap((i) => i.analyses.map((a) => a.analysisId)))];
        if (ids.length === 0) return;
        forkJoin(
          ids.map((id) => this.analysisService.getById(id).pipe(catchError(() => of(null)))),
        ).subscribe((details) => {
          const map = new Map<number, string>();
          details.forEach((d, idx) => { if (d) map.set(ids[idx], d.name); });
          this.analysisNameById.set(map);
        });
      },
      error: () => { /* historial vacío; no se expone el error al usuario */ },
    });
  }

  /** Nombre del análisis resuelto por id (fallback "#id" mientras carga). */
  analysisName(id: number): string {
    return this.analysisNameById().get(id) ?? `#${id}`;
  }
```
por:
```ts
  private loadHistory(patientId: number): void {
    this.historyService.getHistory(patientId).subscribe({
      next: (items) => this.history.set(items),
      error: () => { /* historial vacío; no se expone el error al usuario */ },
    });
  }
```

En el template, reemplazar:
```
                        <tr><th>Análisis</th><th class="cv-center">Valor</th><th>Estado</th></tr>
                      </thead>
                      <tbody>
                        @for (a of row.analyses; track a.analysisId) {
                          <tr>
                            <td>{{ analysisName(a.analysisId) }}</td>
```
por:
```
                        <tr><th>Análisis</th><th class="cv-center">Importe cobrado</th><th>Estado</th></tr>
                      </thead>
                      <tbody>
                        @for (a of row.analyses; track a.analysisId) {
                          <tr>
                            <td>{{ a.analysisName ?? ('#' + a.analysisId) }}</td>
```

- [ ] **Step 2: Grid de dirección label/valor + copago/N° autorización en el detalle**

Reemplazar:
```
              <div class="mt-4 pt-3 border-t">
                <div class="text-xs text-surface-500 mb-1">Domicilio</div>
                <div>{{ addressLine(p) || 'Sin domicilio cargado' }}</div>
              </div>
```
por:
```
              <div class="mt-4 pt-3 border-t">
                <div class="text-xs text-surface-500 mb-2">Domicilio</div>
                @if (primaryAddress(p); as a) {
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3">
                    <div><div class="text-xs text-surface-500">Calle</div><div>{{ a.street || '—' }}</div></div>
                    <div><div class="text-xs text-surface-500">Número</div><div>{{ a.streetNumber || '—' }}</div></div>
                    <div><div class="text-xs text-surface-500">Piso/Depto</div><div>{{ a.apartment || '—' }}</div></div>
                    <div><div class="text-xs text-surface-500">Barrio</div><div>{{ a.neighborhood || '—' }}</div></div>
                    <div><div class="text-xs text-surface-500">Ciudad</div><div>{{ a.city || '—' }}</div></div>
                    <div><div class="text-xs text-surface-500">Provincia</div><div>{{ a.province || '—' }}</div></div>
                    <div><div class="text-xs text-surface-500">Código postal</div><div>{{ a.zipCode || '—' }}</div></div>
                  </div>
                } @else {
                  <div class="cv-muted">Sin domicilio cargado</div>
                }
              </div>
```

Reemplazar el método:
```ts
  /** Domicilio del paciente en una línea (primera dirección). */
  addressLine(p: Patient): string {
    const a = p.addresses[0];
    if (!a) return '';
    const head = [a.street, a.streetNumber].filter(Boolean).join(' ');
    const tail = [a.neighborhood, a.city, a.province].filter(Boolean).join(', ');
    return [head, tail].filter(Boolean).join(' · ');
  }
```
por:
```ts
  /** Dirección a mostrar: activa+primaria → activa → primera cargada. */
  primaryAddress(p: Patient): Address | undefined {
    return p.addresses.find((a) => a.active && a.isPrimary) ?? p.addresses.find((a) => a.active) ?? p.addresses[0];
  }
```

Actualizar el import de modelos, de:
```ts
import { ContactType, Patient } from '../../models/patient.model';
```
a:
```ts
import { Address, ContactType, Patient } from '../../models/patient.model';
```

En el template, reemplazar:
```
                  <ng-template uiRowExpansion let-row>
                    <div class="text-xs text-surface-500 mb-2 font-medium">
                      Protocolo {{ row.protocolId ? ('P-' + row.protocolId) : '—' }}
                    </div>
```
por:
```
                  <ng-template uiRowExpansion let-row>
                    <div class="flex flex-wrap gap-x-6 gap-y-1 mb-2">
                      <div class="text-xs font-medium text-surface-700">
                        Protocolo {{ row.protocolId ? ('P-' + row.protocolId) : '—' }}
                      </div>
                      <div class="text-xs text-surface-500">
                        Copago: {{ row.copaymentAmount != null ? (row.copaymentAmount | currencyAr) : '—' }}
                      </div>
                      <div class="text-xs text-surface-500">
                        N° autorización: {{ row.authorizationNumber ?? '—' }}
                      </div>
                    </div>
```

- [ ] **Step 3: Modelo `patient-history.model.ts`**

Reemplazar:
```ts
// Historial de atenciones de un paciente (GET /api/v1/attentions/patient/{id}/history).
// El BE devuelve analysisId; el nombre lo resuelve el front con AnalysisService.

export type DeliveryStatus = 'DELIVERED' | 'IN_PROCESS' | 'PENDING' | 'CANCELED';

export interface PatientHistoryAnalysis {
  analysisId: number;
  /** Precio cobrado (snapshot). null en atenciones previas al feature. */
  chargedPrice: number | null;
  deliveryStatus: DeliveryStatus | null;
}

export interface PatientHistoryItem {
  attentionId: number;
  attentionNumber: string;
  createdAt: string | null;
  attentionState: string | null;
  protocolId: number | null;
  insurancePlanId: number | null;
  analysisCount: number;
  /** Importe total (snapshot + copago). null si la atención no tiene snapshot. */
  total: number | null;
  analyses: PatientHistoryAnalysis[];
}
```
por:
```ts
// Historial de atenciones de un paciente (GET /api/v1/attentions/patient/{id}/history).

export type DeliveryStatus = 'DELIVERED' | 'IN_PROCESS' | 'PENDING' | 'CANCELED';

export interface PatientHistoryAnalysis {
  analysisId: number;
  analysisName: string | null;
  /** Precio cobrado (snapshot). null en atenciones previas al feature. */
  chargedPrice: number | null;
  deliveryStatus: DeliveryStatus | null;
}

export interface PatientHistoryItem {
  attentionId: number;
  attentionNumber: string;
  createdAt: string | null;
  attentionState: string | null;
  protocolId: number | null;
  insurancePlanId: number | null;
  analysisCount: number;
  /** Importe total (snapshot + copago). null si la atención no tiene snapshot. */
  total: number | null;
  copaymentAmount: number | null;
  authorizationNumber: string | null;
  /** true si hay al menos un informe firmado (parcial o final) disponible para imprimir. */
  reportAvailable: boolean;
  lastPrintedAt: string | null;
  lastPrintedBy: string | null;
  analyses: PatientHistoryAnalysis[];
}
```

(Los campos `reportAvailable`/`lastPrintedAt`/`lastPrintedBy` los agrega esta tarea porque el modelo es un solo archivo — se usan recién en Task 2/3, pero conviene declararlos ya para no volver a tocar este archivo dos veces.)

- [ ] **Step 4: Navegación `returnTo` — botón Editar del detalle**

En `patient-detail.page.ts`, reemplazar:
```
            <a [routerLink]="['/pacientes', p.id, 'editar']">
              <p-button severity="secondary" [outlined]="true" label="Editar" />
            </a>
```
por:
```
            <a [routerLink]="['/pacientes', p.id, 'editar']" [queryParams]="{ returnTo: '/pacientes/' + p.id }">
              <p-button severity="secondary" [outlined]="true" label="Editar" />
            </a>
```

- [ ] **Step 5: Navegación `returnTo` — `onBack()` de `patient-form.page.ts`**

Reemplazar:
```ts
  onBack(): void {
    if (!this.form.dirty) {
      this.router.navigate(['/pacientes']);
      return;
    }
    this.confirm.confirm({
      header: '¿Descartar cambios?',
      message: 'Vas a perder los cambios sin guardar.',
      acceptLabel: 'Descartar',
      rejectLabel: 'Seguir editando',
      accept: () => this.router.navigate(['/pacientes']),
    });
  }
```
por:
```ts
  private navigateBack(): void {
    const target = this.returnTo();
    if (target && target.startsWith('/')) {
      this.router.navigateByUrl(target);
    } else {
      this.router.navigateByUrl('/pacientes');
    }
  }

  onBack(): void {
    if (!this.form.dirty) {
      this.navigateBack();
      return;
    }
    this.confirm.confirm({
      header: '¿Descartar cambios?',
      message: 'Vas a perder los cambios sin guardar.',
      acceptLabel: 'Descartar',
      rejectLabel: 'Seguir editando',
      accept: () => this.navigateBack(),
    });
  }
```

(El handler de éxito ya existente en el constructor —líneas 287-297— ya respeta `returnTo` con el patrón `target && target.startsWith('/')`; no hace falta tocarlo, solo `onBack()` lo tenía roto.)

- [ ] **Step 6: Verificar tipos**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: sin errores (exit 0).

- [ ] **Step 7: Commit**

```bash
git add src/app/features/pacientes/pages/patient-detail/patient-detail.page.ts src/app/features/pacientes/models/patient-history.model.ts src/app/features/pacientes/pages/patient-form/patient-form.page.ts
git commit -m "feat(pacientes): pulido de historial, domicilio y navegacion post-edicion"
```

---

### Task 1: Servicio de impresión + gating del botón en el historial

**Files:**
- Modify: `src/app/features/pacientes/services/patient-history.service.ts`
- Modify: `src/app/features/pacientes/pages/patient-detail/patient-detail.page.ts`

**Interfaces:**
- Produces: `PatientHistoryService.printReport(patientId: number, protocolId: number): Observable<Blob>` — usado por el componente.

- [ ] **Step 1: Agregar el método al servicio**

En `patient-history.service.ts`, agregar:
```ts
  /** Descarga el PDF del informe más reciente disponible (parcial o final) de un protocolo. */
  printReport(patientId: number, protocolId: number): Observable<Blob> {
    return this.http.get(`/api/v1/attentions/patient/${patientId}/protocol/${protocolId}/report-print`, {
      responseType: 'blob',
    });
  }
```

- [ ] **Step 2: Botón "Imprimir estudio" + confirm de reimpresión + apertura del PDF**

En `patient-detail.page.ts`, dentro del `<ng-template uiRowExpansion let-row>`, después del bloque de copago/N° autorización agregado en Task 0 y antes de la tabla `hist-detail`, agregar:

```
                    @if (row.reportAvailable) {
                      <div class="mb-2 flex items-center gap-2">
                        <p-button
                          size="small"
                          icon="pi pi-print"
                          label="Imprimir estudio"
                          [outlined]="true"
                          (onClick)="printReport(row)" />
                        @if (row.lastPrintedBy) {
                          <span class="text-xs text-surface-500"
                                [pTooltip]="'Impreso el ' + (row.lastPrintedAt | date:'dd/MM/yy HH:mm') + ' por ' + row.lastPrintedBy">
                            <i class="pi pi-check-circle text-green-600"></i> Impreso
                          </span>
                        }
                      </div>
                    }
```

Agregar `TooltipModule` de PrimeNG a los imports del componente (`import { TooltipModule } from 'primeng/tooltip';` y sumarlo al array `imports` del `@Component`).

Agregar el método al componente (junto a `coverageLabel`):
```ts
  printReport(row: PatientHistoryItem): void {
    if (row.protocolId == null) return;
    const patientId = this.patient()?.id;
    if (patientId == null) return;
    if (row.lastPrintedBy) {
      this.confirm.confirm({
        header: 'Reimprimir estudio',
        message: `Ya se imprimió el ${row.lastPrintedAt} por ${row.lastPrintedBy}. ¿Reimprimir igual?`,
        acceptLabel: 'Reimprimir',
        rejectLabel: 'Cancelar',
        accept: () => this.downloadAndOpenReport(patientId, row.protocolId!),
      });
    } else {
      this.downloadAndOpenReport(patientId, row.protocolId);
    }
  }

  private downloadAndOpenReport(patientId: number, protocolId: number): void {
    this.historyService.printReport(patientId, protocolId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        this.loadHistory(patientId);
      },
      error: () => { /* toast genérico ya cubierto por el interceptor global de errores HTTP */ },
    });
  }
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/app/features/pacientes/services/patient-history.service.ts src/app/features/pacientes/pages/patient-detail/patient-detail.page.ts
git commit -m "feat(pacientes): boton de impresion de estudio + indicador de ultima impresion"
```

---

### Task 2: Verificación manual end-to-end

No hay test automatizado de UI para este flujo en el repo (el historial no tiene spec propio, ver memoria `project_pacientes-rework`). Verificar a mano:

- [ ] **Step 1:** Levantar BE (worktree `print-report-audit`) + FE (worktree `print-report-audit`) contra MySQL local, siguiendo `project_worktree-launcher`.
- [ ] **Step 2:** Loguear como usuario con rol `SECRETARIA`, ir a un paciente con al menos una atención con protocolo firmado (parcial o final).
- [ ] **Step 3:** Confirmar que en la fila expandida aparece "Imprimir estudio" solo si `reportAvailable`, que al clickear se abre el PDF en pestaña nueva, y que tras eso aparece el indicador "Impreso" con tooltip.
- [ ] **Step 4:** Clickear "Imprimir estudio" de nuevo sobre la misma fila y confirmar que aparece el diálogo de reimpresión.
- [ ] **Step 5:** Loguear como un rol sin permiso (ej. `EXTRACTOR`) y confirmar que el endpoint devuelve 403 (probar con la request directa si ese rol no tiene ni siquiera acceso a la pantalla de pacientes).

No hace falta commit en este task (es solo verificación).

# TV de Extracción Implementation Plan

> **Jira:** [KAN-78](https://exequielsantoro.atlassian.net/browse/KAN-78)
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear pantalla pública `/display/extraccion/:tenantSlug/:branchId` análoga a la TV de atención existente, con datos mockeados, paleta verde, badge `EXTRACCIÓN`, `→ Box N` por entry, botón "Simular llamada" y modificación mínima a la TV de atención (badge `ATENCIÓN`).

**Architecture:** Componente duplicado (no compartido) en `features/turnos/pages/tv-extraccion/`. Servicio mock local `TvExtraccionMockService` con `signal`-backed snapshot mutable. Ruta nueva en `app.routes.ts`. Badge compartido por clase CSS entre ambas TVs.

**Tech Stack:** Angular 21 standalone + signals + OnPush, Vitest + jsdom, PrimeNG (dialog/icons), rxjs interval polling.

**Spec base:** `docs/superpowers/specs/2026-06-04-tv-extraccion-design.md`

---

## File Structure

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/app/features/turnos/models/public-display.model.ts` | Modificar | Agregar `boxNumber?: number` opcional a `PublicQueueEntry` |
| `src/app/features/turnos/pages/tv-extraccion/tv-extraccion-mock.service.ts` | Crear | Servicio mock con snapshot reactivo + `simulateNewCall()` |
| `src/app/features/turnos/pages/tv-extraccion/tv-extraccion-mock.service.spec.ts` | Crear | Tests del mock: snapshot inicial + simulación |
| `src/app/features/turnos/pages/tv-extraccion/tv-extraccion.page.ts` | Crear | Componente página (copia adaptada de `sala-espera.page.ts`) |
| `src/app/features/turnos/pages/tv-extraccion/tv-extraccion.page.html` | Crear | Template con badge verde + `→ Box N` + botón simular |
| `src/app/features/turnos/pages/tv-extraccion/tv-extraccion.page.scss` | Crear | Estilos paleta verde + posición del botón simulador |
| `src/app/features/turnos/pages/tv-extraccion/tv-extraccion.page.spec.ts` | Crear | Smoke: render OK, badge presente, click simular llama al mock |
| `src/app/features/turnos/pages/sala-espera/sala-espera.page.html` | Modificar | Agregar `<div class="tv-badge tv-badge--atencion">` |
| `src/app/features/turnos/pages/sala-espera/sala-espera.page.scss` | Modificar | Estilos compartidos `.tv-badge` + variante atención |
| `src/app/app.routes.ts` | Modificar | Agregar ruta `display/extraccion/:tenantSlug/:branchId` |
| `src/app/layout/sidebar/sidebar.nav.ts` | Modificar | Agregar entry external "TV extracción" en la sección Core clínico |

---

## Convención de commits

Todos los commits siguen `<tipo>(<scope>): <descripción> (KAN-78)`. El ticket ya está creado (KAN-78).

---

## Task 1: Modelo — agregar `boxNumber` opcional

**Files:**
- Modify: `src/app/features/turnos/models/public-display.model.ts:3-10`

- [ ] **Step 1: Modificar el modelo**

```ts
// src/app/features/turnos/models/public-display.model.ts
import { QueueStatus } from './queue-status.enum';

export interface PublicQueueEntry {
  id: number;
  publicCode: string;
  status: QueueStatus;
  lastCalledAt: string | null;
  callCount: number;
  createdAt: string;
  /**
   * Box de extracción asignado al paciente.
   * Por ahora mockeado en frontend (`TvExtraccionMockService`).
   * Backend agregará el campo cuando exista el modelo `Branch.boxes`.
   */
  boxNumber?: number;
}
```

(El resto del archivo — `OpenWindow` y `DisplaySnapshot` — queda igual.)

- [ ] **Step 2: Verificar que TypeScript compila**

Run: `cd "C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO" && npm run build`
Expected: build OK (la sala-espera actual no usa `boxNumber`, así que no rompe).

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO"
git add src/app/features/turnos/models/public-display.model.ts
git commit -m "feat(turnos): agregar boxNumber opcional a PublicQueueEntry (KAN-78)"
```

---

## Task 2: Mock Service — TDD

**Files:**
- Create: `src/app/features/turnos/pages/tv-extraccion/tv-extraccion-mock.service.ts`
- Test: `src/app/features/turnos/pages/tv-extraccion/tv-extraccion-mock.service.spec.ts`

- [ ] **Step 1: Escribir el spec que falla**

```ts
// src/app/features/turnos/pages/tv-extraccion/tv-extraccion-mock.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { TvExtraccionMockService } from './tv-extraccion-mock.service';

describe('TvExtraccionMockService', () => {
  let service: TvExtraccionMockService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TvExtraccionMockService);
  });

  it('fetchSnapshot returns 6 entries with boxNumber 1..3', async () => {
    const snap = await firstValueFrom(service.fetchSnapshot('lab-demo', 1001));
    expect(snap.entries.length).toBe(6);
    expect(snap.entries.every(e => e.boxNumber !== undefined && e.boxNumber >= 1 && e.boxNumber <= 3)).toBe(true);
    expect(snap.branchName).toBe('Sucursal Centro');
    expect(snap.openWindow).toEqual({ startTime: '08:00', endTime: '18:00' });
  });

  it('simulateNewCall prepends a new entry with lastCalledAt set to now', async () => {
    const before = await firstValueFrom(service.fetchSnapshot('lab-demo', 1001));
    const beforeFirstId = before.entries[0].id;

    service.simulateNewCall();

    const after = await firstValueFrom(service.fetchSnapshot('lab-demo', 1001));
    expect(after.entries.length).toBe(7);
    expect(after.entries[0].id).not.toBe(beforeFirstId);
    expect(after.entries[0].lastCalledAt).toBeTruthy();
    expect(after.entries[0].boxNumber).toBeGreaterThanOrEqual(1);
    expect(after.entries[0].boxNumber).toBeLessThanOrEqual(3);
  });

  it('listPublicBranches returns a single mock branch', async () => {
    const branches = await firstValueFrom(service.listPublicBranches('lab-demo'));
    expect(branches.length).toBe(1);
    expect(branches[0].id).toBe(1001);
  });
});
```

- [ ] **Step 2: Correr el spec para verificar que falla**

Run: `cd "C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO" && npx vitest run src/app/features/turnos/pages/tv-extraccion/tv-extraccion-mock.service.spec.ts`
Expected: FAIL — "Cannot find module './tv-extraccion-mock.service'".

- [ ] **Step 3: Implementar el servicio**

```ts
// src/app/features/turnos/pages/tv-extraccion/tv-extraccion-mock.service.ts
import { Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { DisplaySnapshot, PublicQueueEntry } from '../../models/public-display.model';
import { QueueStatus } from '../../models/queue-status.enum';
import { PublicBranch } from '../../services/public-display.service';

/**
 * Mock de la TV de extracción. Reemplaza a `PublicDisplayService` hasta que
 * exista el endpoint `/public/display/extraccion/:tenant/:branch/queue`.
 *
 * El snapshot vive en un signal mutable; `simulateNewCall()` lo muta para
 * que el componente (vía polling) detecte el cambio y dispare el beep.
 */
@Injectable({ providedIn: 'root' })
export class TvExtraccionMockService {
  private nextId = 1000;
  private readonly snapshot = signal<DisplaySnapshot>(this.buildInitialSnapshot());

  fetchSnapshot(_tenantSlug: string, _branchId: number): Observable<DisplaySnapshot> {
    return of(this.snapshot()).pipe(delay(30));
  }

  listPublicBranches(_tenantSlug: string): Observable<PublicBranch[]> {
    return of([
      { id: 1001, code: 'LAB-CENTRO', description: 'Sucursal Centro' },
    ]);
  }

  /** Dispara desde el botón "Simular llamada" del componente. */
  simulateNewCall(): void {
    const next = this.buildNewEntry();
    this.snapshot.update(snap => ({
      ...snap,
      entries: [next, ...snap.entries].slice(0, 12),
    }));
  }

  private buildInitialSnapshot(): DisplaySnapshot {
    const baseTime = Date.now();
    const entries: PublicQueueEntry[] = Array.from({ length: 6 }, (_, i) => ({
      id: ++this.nextId,
      publicCode: `EX-${String(i + 1).padStart(3, '0')}`,
      status: QueueStatus.CALLED,
      lastCalledAt: new Date(baseTime - (i + 1) * 60_000).toISOString(),
      callCount: 1,
      createdAt: new Date(baseTime - (i + 1) * 300_000).toISOString(),
      boxNumber: (i % 3) + 1,
    }));
    return {
      tenantName: 'Laboratorio Demo',
      branchName: 'Sucursal Centro',
      serverTime: this.hhmm(new Date()),
      openWindow: { startTime: '08:00', endTime: '18:00' },
      entries,
    };
  }

  private buildNewEntry(): PublicQueueEntry {
    const id = ++this.nextId;
    return {
      id,
      publicCode: `EX-${String(id % 1000).padStart(3, '0')}`,
      status: QueueStatus.CALLED,
      lastCalledAt: new Date().toISOString(),
      callCount: 1,
      createdAt: new Date().toISOString(),
      boxNumber: Math.floor(Math.random() * 3) + 1,
    };
  }

  private hhmm(d: Date): string {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
}
```

- [ ] **Step 4: Verificar que `QueueStatus.CALLED` existe**

Run: `cd "C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO" && grep -nE "^\\s*(CALLED|WAITING|ATTENDED)" src/app/features/turnos/models/queue-status.enum.ts`
Expected: ver `CALLED = ...` listado. Si el enum usa otro nombre, ajustar el servicio.

- [ ] **Step 5: Correr el spec — pasa**

Run: `cd "C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO" && npx vitest run src/app/features/turnos/pages/tv-extraccion/tv-extraccion-mock.service.spec.ts`
Expected: PASS — 3 tests verdes.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/turnos/pages/tv-extraccion/tv-extraccion-mock.service.ts \
        src/app/features/turnos/pages/tv-extraccion/tv-extraccion-mock.service.spec.ts
git commit -m "feat(turnos): TvExtraccionMockService con snapshot reactivo (KAN-78)"
```

---

## Task 3: Component Page — TS + HTML + SCSS

**Files:**
- Create: `src/app/features/turnos/pages/tv-extraccion/tv-extraccion.page.ts`
- Create: `src/app/features/turnos/pages/tv-extraccion/tv-extraccion.page.html`
- Create: `src/app/features/turnos/pages/tv-extraccion/tv-extraccion.page.scss`

- [ ] **Step 1: Crear el componente TS**

```ts
// src/app/features/turnos/pages/tv-extraccion/tv-extraccion.page.ts
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, EMPTY, interval, startWith, switchMap, tap } from 'rxjs';
import { DialogModule } from 'primeng/dialog';
import { DisplaySnapshot, PublicQueueEntry } from '../../models/public-display.model';
import { PublicBranch } from '../../services/public-display.service';
import { EmptyStateComponent } from '../sala-espera/empty-state.component';
import { ClosedStateComponent } from '../sala-espera/closed-state.component';
import { AdCarouselComponent } from '../sala-espera/ad-carousel.component';
import { TvExtraccionMockService } from './tv-extraccion-mock.service';

@Component({
  selector: 'app-tv-extraccion-page',
  standalone: true,
  imports: [DatePipe, DialogModule, EmptyStateComponent, ClosedStateComponent, AdCarouselComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tv-extraccion.page.html',
  styleUrl: './tv-extraccion.page.scss',
})
export class TvExtraccionPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(TvExtraccionMockService);
  private destroyRef = inject(DestroyRef);

  protected tenantSlug = this.route.snapshot.paramMap.get('tenantSlug') ?? '';
  protected branchId = Number(this.route.snapshot.paramMap.get('branchId') ?? '');

  protected snapshot = signal<DisplaySnapshot | null>(null);
  protected lastSuccessfulFetch = signal<number>(0);
  protected previousMostRecentCalledId = signal<number | null>(null);
  protected firstAttemptDone = signal(false);

  protected dialogOpen = signal(false);
  protected dialogLoading = signal(false);
  protected dialogError = signal<string | null>(null);
  protected branchOptions = signal<PublicBranch[]>([]);

  protected readonly audioUnlocked = signal<boolean>(
    typeof sessionStorage !== 'undefined' && sessionStorage.getItem('tv-audio-unlocked') === '1',
  );

  protected connectionLost = computed(() => {
    const last = this.lastSuccessfulFetch();
    return last > 0 && Date.now() - last > 15000;
  });

  protected calledEntries = computed<PublicQueueEntry[]>(() => {
    const entries = this.snapshot()?.entries ?? [];
    return entries
      .filter(e => !!e.lastCalledAt)
      .sort((a, b) => (b.lastCalledAt ?? '').localeCompare(a.lastCalledAt ?? ''));
  });

  private static readonly PAGE_SIZE = 5;
  private static readonly ROTATE_MS = 15000;

  protected currentPage = signal<number>(0);

  protected totalPages = computed<number>(() => {
    const n = this.calledEntries().length;
    return n === 0 ? 0 : Math.ceil(n / TvExtraccionPage.PAGE_SIZE);
  });

  protected visibleEntries = computed<PublicQueueEntry[]>(() => {
    const all = this.calledEntries();
    const start = this.currentPage() * TvExtraccionPage.PAGE_SIZE;
    return all.slice(start, start + TvExtraccionPage.PAGE_SIZE);
  });

  protected viewMode = computed<'loading' | 'queue' | 'empty' | 'closed' | 'error'>(() => {
    const snap = this.snapshot();
    if (!snap) return this.firstAttemptDone() ? 'error' : 'loading';
    if (this.isClosed(snap)) return 'closed';
    if ((snap.entries ?? []).length === 0) return 'empty';
    return 'queue';
  });

  constructor() {
    effect(() => {
      const list = this.calledEntries();
      const mostRecent = list[0] ?? null;
      if (mostRecent && mostRecent.id !== this.previousMostRecentCalledId()) {
        this.playBeep();
        this.previousMostRecentCalledId.set(mostRecent.id);
      }
    });

    effect(() => {
      const total = this.totalPages();
      if (this.currentPage() >= total) this.currentPage.set(0);
    });
  }

  ngOnInit(): void {
    if (!this.tenantSlug || !this.branchId) return;

    interval(3000)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.service.fetchSnapshot(this.tenantSlug, this.branchId).pipe(
            tap(() => this.firstAttemptDone.set(true)),
            catchError(() => {
              this.firstAttemptDone.set(true);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(snap => {
        this.snapshot.set(snap);
        this.lastSuccessfulFetch.set(Date.now());
      });

    interval(TvExtraccionPage.ROTATE_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const total = this.totalPages();
        if (total > 1) this.currentPage.set((this.currentPage() + 1) % total);
      });
  }

  /** Botón debug: prepende una entry random al mock. Remover cuando el endpoint real esté integrado. */
  onSimulate(): void {
    this.service.simulateNewCall();
  }

  openBranchDialog(): void {
    this.dialogOpen.set(true);
    this.dialogError.set(null);
    this.dialogLoading.set(true);
    this.service.listPublicBranches(this.tenantSlug).subscribe({
      next: branches => {
        this.branchOptions.set(branches);
        this.dialogLoading.set(false);
        if (branches.length === 0) {
          this.dialogError.set(`No hay sucursales registradas para el tenant "${this.tenantSlug}". Verificá la URL.`);
        }
      },
      error: () => {
        this.dialogLoading.set(false);
        this.dialogError.set('No se pudo cargar la lista de sucursales. Reintentá.');
      },
    });
  }

  selectBranch(branch: PublicBranch): void {
    this.dialogOpen.set(false);
    this.router.navigate(['/display/extraccion', this.tenantSlug, branch.id]);
  }

  unlockAudio(): void {
    const a = new Audio('/assets/audio/beep-extraccion.mp3');
    a.volume = 0;
    a.play().then(() => {
      this.audioUnlocked.set(true);
      sessionStorage.setItem('tv-audio-unlocked', '1');
    }).catch(err => {
      console.warn('[tv-extraccion] audio unlock failed', err);
      this.audioUnlocked.set(true);
      sessionStorage.setItem('tv-audio-unlocked', '1');
    });
  }

  private isClosed(snap: DisplaySnapshot): boolean {
    if (!snap.openWindow) return false;
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return hhmm < snap.openWindow.startTime || hhmm > snap.openWindow.endTime;
  }

  private playBeep(): void {
    try {
      const audio = new Audio('/assets/audio/beep-extraccion.mp3');
      audio.play().catch(err => console.warn('[tv-extraccion] beep blocked or missing asset:', err));
    } catch (e) {
      console.warn('[tv-extraccion] beep error:', e);
    }
  }
}
```

- [ ] **Step 2: Crear el template HTML**

```html
<!-- src/app/features/turnos/pages/tv-extraccion/tv-extraccion.page.html -->
@if (!tenantSlug || !branchId) {
  <div class="invalid-url">URL inválida — falta tenantSlug o branchId</div>
} @else {
  <div class="display-page display-page--extraccion">
    @if (!audioUnlocked()) {
      <div class="audio-overlay" (click)="unlockAudio()">
        <div class="audio-overlay-content">
          <i class="pi pi-volume-up" style="font-size: 4rem;"></i>
          <h2>Click para activar sonido</h2>
          <p>Hacé click en cualquier parte de la pantalla para habilitar las notificaciones sonoras.</p>
        </div>
      </div>
    }

    <main class="cola-section">
      <div class="tv-badge tv-badge--extraccion">
        <span class="tv-badge__dot"></span>EXTRACCIÓN
      </div>

      @if (connectionLost()) {
        <div class="banner-disconnected">
          <i class="pi pi-wifi" style="margin-right: 0.5rem;"></i>
          Reconectando...
        </div>
      }

      @switch (viewMode()) {
        @case ('loading') {
          <div class="loading">Cargando...</div>
        }
        @case ('error') {
          <div class="error-state">
            <i class="pi pi-exclamation-triangle"></i>
            <h2>Sin conexión con la sucursal</h2>
            <p>
              No se pudo cargar la sucursal <strong>#{{ branchId }}</strong>
              del tenant <strong>{{ tenantSlug }}</strong>.
            </p>
            <button type="button" class="error-state__btn" (click)="openBranchDialog()">
              <i class="pi pi-th-large"></i>
              Cambiar sucursal
            </button>
          </div>
        }
        @case ('empty') {
          <app-empty-state
            [serverTime]="snapshot()?.serverTime ?? ''"
            [branchName]="snapshot()?.branchName ?? ''" />
        }
        @case ('closed') {
          <app-closed-state [reopenTime]="snapshot()?.openWindow?.startTime ?? ''" />
        }
        @case ('queue') {
          <div class="layout">
            <div class="proximos">
              <h2>Pasar a extracción:</h2>
              @if (calledEntries().length === 0) {
                <div class="empty-state">
                  <i class="pi pi-info-circle"></i>
                  <span>Aún no se llamó a ningún paciente hoy</span>
                </div>
              } @else {
                <ul>
                  @for (e of visibleEntries(); track e.id) {
                    <li>
                      <span class="code">{{ e.publicCode }}</span>
                      <span class="box">→ Box {{ e.boxNumber ?? '?' }}</span>
                      @if (e.lastCalledAt) {
                        <span class="hour">{{ e.lastCalledAt | date:'HH:mm':'America/Argentina/Buenos_Aires' }}</span>
                      }
                    </li>
                  }
                </ul>
                @if (totalPages() > 1) {
                  <div class="page-indicator">
                    @for (p of [].constructor(totalPages()); track $index) {
                      <span class="dot" [class.active]="$index === currentPage()"></span>
                    }
                  </div>
                }
              }
            </div>
          </div>
        }
      }

      <!-- Botón debug: simular un nuevo llamado (mockup). TODO: remover cuando exista endpoint real. -->
      <button type="button" class="tv-simulate-btn" (click)="onSimulate()" data-testid="simulate-btn">
        <i class="pi pi-bell"></i>
        Simular llamada
      </button>
    </main>

    <aside class="ad-section">
      <app-ad-carousel />
    </aside>
  </div>

  <p-dialog
    [visible]="dialogOpen()"
    (visibleChange)="dialogOpen.set($event)"
    [modal]="true"
    [closable]="true"
    [draggable]="false"
    [resizable]="false"
    header="Elegir sucursal"
    styleClass="ui-tv-branch-dialog">
    @if (dialogLoading()) {
      <div class="tv-dialog-loading">Cargando sucursales...</div>
    } @else if (dialogError(); as err) {
      <div class="tv-dialog-error">
        <i class="pi pi-info-circle"></i>
        <p>{{ err }}</p>
      </div>
    } @else {
      <ul class="tv-branch-list">
        @for (b of branchOptions(); track b.id) {
          <li>
            <button type="button" class="tv-branch-list__item" (click)="selectBranch(b)">
              <span class="tv-branch-list__code">{{ b.code }}</span>
              <span class="tv-branch-list__name">{{ b.description }}</span>
              <i class="pi pi-chevron-right"></i>
            </button>
          </li>
        }
      </ul>
    }
  </p-dialog>
}
```

- [ ] **Step 3: Crear el SCSS**

```scss
// src/app/features/turnos/pages/tv-extraccion/tv-extraccion.page.scss
@use '../sala-espera/sala-espera.page' as *;

// Variables locales — verde semántico de extracción.
$extraccion-green: #059669;
$extraccion-bg: #ecfdf5;

:host {
  display: block;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

// ─── Layout principal — fondo tinte verde claro en lugar de gris ──────────
.display-page--extraccion {
  background: $extraccion-bg;

  .cola-section {
    position: relative; // contenedor del botón simulador y del badge
    background: $extraccion-bg;
  }

  // code (publicCode grande) hardcodeado verde — no depende del brand del tenant
  .proximos .code {
    color: $extraccion-green;
  }

  // page indicator activo en verde
  .proximos .page-indicator .dot.active {
    background: $extraccion-green;
  }
}

// ─── Badge "EXTRACCIÓN" ───────────────────────────────────────────────────
// Estilos base de .tv-badge viven en sala-espera.page.scss (compartidos).
// Acá solo la variante de color.
.tv-badge--extraccion {
  color: $extraccion-green;

  .tv-badge__dot {
    background: $extraccion-green;
  }
}

// ─── Entry: agregado "→ Box N" ────────────────────────────────────────────
.proximos li .box {
  font-size: clamp(1.5rem, 2.5vw, 2.25rem);
  font-weight: 600;
  color: $extraccion-green;
  opacity: 0.85;
  margin: 0 0.75rem;
  white-space: nowrap;
}

// ─── Botón "Simular llamada" (debug/mockup) ───────────────────────────────
// TODO: remover cuando el endpoint real esté integrado.
.tv-simulate-btn {
  position: absolute;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: $extraccion-green;
  background: white;
  border: 1px solid rgba($extraccion-green, 0.4);
  border-radius: 999px;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 150ms, transform 80ms;

  &:hover  { opacity: 1; }
  &:active { transform: scale(0.97); }

  .pi { font-size: 0.95rem; }
}
```

> Nota: el `@use '../sala-espera/sala-espera.page' as *;` re-exporta los estilos compartidos (layout 70/30, `.proximos`, `.audio-overlay`, etc.). Si Angular CLI no resuelve la importación (depende de la versión), reemplazar por una copia del SCSS y borrar el `@use`.

- [ ] **Step 4: Verificar que el componente compila standalone**

Run: `cd "C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO" && npm run build`
Expected: build OK. Si falla por `@use` no resuelto, hacer fallback: copiar el SCSS completo de `sala-espera.page.scss` al de `tv-extraccion.page.scss` y mantener sólo las overrides.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/turnos/pages/tv-extraccion/tv-extraccion.page.ts \
        src/app/features/turnos/pages/tv-extraccion/tv-extraccion.page.html \
        src/app/features/turnos/pages/tv-extraccion/tv-extraccion.page.scss
git commit -m "feat(turnos): TvExtraccionPage (mockup UI, paleta verde, boton simular) (KAN-78)"
```

---

## Task 4: Component Spec — smoke

**Files:**
- Create: `src/app/features/turnos/pages/tv-extraccion/tv-extraccion.page.spec.ts`

- [ ] **Step 1: Escribir el spec**

```ts
// src/app/features/turnos/pages/tv-extraccion/tv-extraccion.page.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { TvExtraccionPage } from './tv-extraccion.page';
import { TvExtraccionMockService } from './tv-extraccion-mock.service';

describe('TvExtraccionPage', () => {
  let fixture: any;
  let mockService: TvExtraccionMockService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [TvExtraccionPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ tenantSlug: 'lab-demo', branchId: '1001' }) },
          },
        },
      ],
    });
    fixture = TestBed.createComponent(TvExtraccionPage);
    mockService = TestBed.inject(TvExtraccionMockService);
    fixture.detectChanges();
    // Esperar el primer fetch del mock (delay 30ms).
    await new Promise(r => setTimeout(r, 60));
    fixture.detectChanges();
  });

  it('renders the EXTRACCIÓN badge', () => {
    const badge = fixture.nativeElement.querySelector('.tv-badge--extraccion');
    expect(badge).not.toBeNull();
    expect(badge.textContent).toContain('EXTRACCIÓN');
  });

  it('renders entries with → Box N text', () => {
    const boxes = fixture.nativeElement.querySelectorAll('.proximos li .box');
    expect(boxes.length).toBeGreaterThan(0);
    expect(boxes[0].textContent).toMatch(/→ Box [123]/);
  });

  it('clicking the simulate button calls simulateNewCall on the mock', () => {
    const spy = vi.spyOn(mockService, 'simulateNewCall');
    const btn = fixture.nativeElement.querySelector('[data-testid="simulate-btn"]');
    expect(btn).not.toBeNull();
    btn.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Correr el spec**

Run: `cd "C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO" && npx vitest run src/app/features/turnos/pages/tv-extraccion/tv-extraccion.page.spec.ts`
Expected: PASS — 3 tests verdes. Si el primer fetch no terminó (timing), aumentar el delay del `await` a 100ms.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/turnos/pages/tv-extraccion/tv-extraccion.page.spec.ts
git commit -m "test(turnos): smoke spec de TvExtraccionPage (KAN-78)"
```

---

## Task 5: Modificar TV de atención — badge

**Files:**
- Modify: `src/app/features/turnos/pages/sala-espera/sala-espera.page.html:15` (al inicio del `<main class="cola-section">`)
- Modify: `src/app/features/turnos/pages/sala-espera/sala-espera.page.scss` (al final del archivo)

- [ ] **Step 1: Agregar el badge al template**

En `src/app/features/turnos/pages/sala-espera/sala-espera.page.html`, justo después de `<main class="cola-section">` y antes del `@if (connectionLost())`:

```html
    <main class="cola-section">
      <div class="tv-badge tv-badge--atencion">
        <span class="tv-badge__dot"></span>ATENCIÓN
      </div>

      @if (connectionLost()) {
```

- [ ] **Step 2: Agregar los estilos `.tv-badge` compartidos al final del SCSS de sala-espera**

```scss
// ─── Badge identificador (TV atención / TV extracción) ─────────────────────
// Compartido por ambas TVs. Variante de color en cada componente.
.tv-badge {
  position: absolute;
  top: 1rem;
  left: 1.5rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  z-index: 5;
  pointer-events: none;

  &__dot {
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 50%;
    background: currentColor;
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.06);
  }
}

.tv-badge--atencion {
  color: var(--brand-primary, #2563eb);
}

// El badge requiere position:relative en el contenedor.
.cola-section {
  position: relative;
}
```

> Nota sobre el `:host ::ng-deep` y scoping: como tanto sala-espera como tv-extraccion son componentes standalone con SCSS view-encapsulated, **no** se comparte realmente la clase entre ambos via Angular. Sin embargo, ambos archivos definen el mismo `.tv-badge` con su variante: sala-espera tiene `.tv-badge--atencion`, tv-extraccion redefine `.tv-badge` + `.tv-badge--extraccion` (vía el `@use` o copia). Si el `@use` no funcionó, copiar este bloque también al SCSS de tv-extraccion.

- [ ] **Step 3: Build OK**

Run: `cd "C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO" && npm run build`
Expected: build OK. Si SCSS error, revisar `position: relative` en `.cola-section` (no duplicar).

- [ ] **Step 4: Commit**

```bash
git add src/app/features/turnos/pages/sala-espera/sala-espera.page.html \
        src/app/features/turnos/pages/sala-espera/sala-espera.page.scss
git commit -m "feat(turnos): badge ATENCION en sala-espera TV (KAN-78)"
```

---

## Task 6: Registrar la ruta en `app.routes.ts`

**Files:**
- Modify: `src/app/app.routes.ts:128-132`

- [ ] **Step 1: Agregar la ruta**

Justo después del bloque `path: 'display/:tenantSlug/:branchId'` (línea 128-132), insertar:

```ts
  {
    path: 'display/extraccion/:tenantSlug/:branchId',
    loadComponent: () =>
      import('./features/turnos/pages/tv-extraccion/tv-extraccion.page').then((m) => m.TvExtraccionPage),
  },
```

Resultado esperado del bloque:

```ts
  {
    path: 'display/:tenantSlug/:branchId',
    loadComponent: () =>
      import('./features/turnos/pages/sala-espera/sala-espera.page').then((m) => m.SalaEsperaPage),
  },

  {
    path: 'display/extraccion/:tenantSlug/:branchId',
    loadComponent: () =>
      import('./features/turnos/pages/tv-extraccion/tv-extraccion.page').then((m) => m.TvExtraccionPage),
  },

  {
    path: 'turnos/totem',
```

> **Importante**: la ruta más específica (`display/extraccion/...`) **no choca** con la genérica (`display/:tenantSlug/:branchId`) porque Angular Router intenta match exacto antes de los param-based. Pero por claridad, dejar la específica primero o segunda — no importa el orden funcional acá.

- [ ] **Step 2: Probar manualmente que la ruta resuelve**

Run: `cd "C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO" && npm start -- --port 4200`
Abrir en el browser: `http://localhost:4200/display/extraccion/lab-demo/1001`
Expected: ve la pantalla TV de extracción con badge verde y 6 entries.

- [ ] **Step 3: Commit**

```bash
git add src/app/app.routes.ts
git commit -m "feat(turnos): registrar ruta /display/extraccion/:tenant/:branch (KAN-78)"
```

---

## Task 7: Agregar link en sidebar nav

**Files:**
- Modify: `src/app/layout/sidebar/sidebar.nav.ts:71-79`

- [ ] **Step 1: Agregar la entry external**

Justo después del bloque "TV sala de espera" (línea 71-79), insertar:

```ts
      {
        kind: 'external',
        label: 'TV extracción',
        icon: 'pi pi-desktop',
        href: '/display/extraccion/lab-demo/1001',
        chip: 'Smoke',
      },
```

Resultado esperado:

```ts
      {
        kind: 'external',
        label: 'TV sala de espera',
        icon: 'pi pi-desktop',
        href: '/display/lab-demo/1001',
        chip: 'Smoke',
      },
      {
        kind: 'external',
        label: 'TV extracción',
        icon: 'pi pi-desktop',
        href: '/display/extraccion/lab-demo/1001',
        chip: 'Smoke',
      },
      {
        kind: 'external',
        label: 'Tótem',
```

- [ ] **Step 2: Verificar visualmente**

Recargar el browser (frontend ya está en dev mode con `ng serve` watch).
Expected: la sidebar muestra "TV extracción" debajo de "TV sala de espera", ambas con chip "Smoke".

- [ ] **Step 3: Commit**

```bash
git add src/app/layout/sidebar/sidebar.nav.ts
git commit -m "feat(nav): link 'TV extraccion' en sidebar (KAN-78)"
```

---

## Task 8: Smoke manual end-to-end

- [ ] **Step 1: Levantar el frontend**

Run: `cd "C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO" && npm start -- --port 4200`
Expected: dev server escuchando en `http://localhost:4200`.

- [ ] **Step 2: Probar TV de extracción**

1. Abrir `http://localhost:4200/display/extraccion/lab-demo/1001`
2. Click en la pantalla para activar audio.
3. Verificar:
   - [ ] Badge verde `● EXTRACCIÓN` arriba-izquierda.
   - [ ] 6 entries `EX-001 → Box 1`, `EX-002 → Box 2`, etc., publicCode en verde.
   - [ ] Carrusel de ads en la derecha (sin cambio, sigue funcionando).
   - [ ] Botón "Simular llamada" en esquina inferior derecha (translúcido).
4. Click "Simular llamada" — verificar:
   - [ ] Aparece nueva entry en el tope.
   - [ ] Se oye el beep (o aparece warn en consola si `beep-extraccion.mp3` no existe — aceptable).
5. Click 6 veces más en "Simular llamada" → verificar paginación:
   - [ ] Aparecen los dots en la parte inferior.
   - [ ] Esperar 15s → rota a la siguiente página.

- [ ] **Step 3: Probar TV de atención (no debe romperse)**

1. Abrir `http://localhost:4200/display/lab-demo/1001`
2. Verificar:
   - [ ] Badge azul (color del tenant) `● ATENCIÓN` arriba-izquierda.
   - [ ] Resto del comportamiento idéntico al original (entries con `publicCode` + hora, sin "→ Box N").
   - [ ] Sin botón "Simular llamada".

- [ ] **Step 4: Verificar tests siguen verdes**

Run: `cd "C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO" && npx vitest run`
Expected: todos los tests pasan, incluidos los nuevos de `tv-extraccion`.

---

## Self-Review (ya hecho durante la escritura)

**Spec coverage:**
- ✅ Ruta dedicada — Task 6
- ✅ Layout idéntico — Task 3 (copia adaptada)
- ✅ Badge EXTRACCIÓN verde — Task 3 HTML + SCSS
- ✅ `code` en verde — Task 3 SCSS
- ✅ Background tinte verde — Task 3 SCSS
- ✅ Audio path nuevo — Task 3 TS (`/assets/audio/beep-extraccion.mp3`)
- ✅ `→ Box N` por entry — Task 3 HTML + modelo Task 1
- ✅ Botón Simular llamada — Task 3 HTML + Task 2 mock
- ✅ Modificación sala-espera (badge) — Task 5
- ✅ Smoke tests — Tasks 4 + 9
- ✅ Modelo extendido — Task 1
- ✅ Jira — Task 8

**Placeholder scan:** sin `TBD`/`TODO` bloqueantes. El único `KAN-78` es intencional y se reemplaza en Task 8.

**Type consistency:** `TvExtraccionPage`, `TvExtraccionMockService`, `simulateNewCall()`, `boxNumber`, `fetchSnapshot()` — nombres consistentes a lo largo del plan.

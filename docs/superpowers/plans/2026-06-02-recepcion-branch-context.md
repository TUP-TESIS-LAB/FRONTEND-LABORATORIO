# Recepción Branch Context — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor de la pantalla de Recepción del FRONTEND-LABORATORIO para mostrar una lista combinada de turnos (CT + ST) con distinguidor visual sutil, agregar un drawer lateral con los turnos programados del día, y exponer la sucursal activa del operador como badge en el topbar.

**Architecture:** El feature NgRx `appointments` y el `AppointmentService.listToday()` ya existen y devuelven `Appointment[]` por sucursal+fecha — los reusamos en el drawer en vez de crear un feature nuevo. El `OperatorBranchContextService` ya tiene el `branchId` persistido en localStorage; se extiende para incluir `branchName`. El `BranchBootstrapService` se ejecuta en `provideAppInitializer` para asegurar que hay sucursal seteada antes del primer dispatch (fallback temporal hasta que el backend asigne sucursal por usuario). Sin cambios de backend.

**Tech Stack:** Angular 21 + standalone components + signals + NgRx clásico (createAction + createReducer + selectSignal) + PrimeNG (Card, Table, Drawer, Chip, Tooltip, Tag, Button) + Tailwind. Tests con Vitest + TestBed + provideMockActions + HttpTestingController. Skills obligatorias del repo: `angular-conventions`, `ngrx-backend-request`, `laboratory-ui`. Mensajes en español sin leak de internals (regla inviolable del CLAUDE.md).

**Spec:** `docs/superpowers/specs/2026-06-02-recepcion-branch-context-design.md`
**Jira:** [KAN-73](https://exequielsantoro.atlassian.net/browse/KAN-73)
**Branch:** `feat/KAN-73-recepcion-branch-context` (ya creada)

---

## Task 0: Pre-flight check

**Files:** ninguno (solo verificación de entorno)

- [ ] **Step 1: Confirmar branch correcta**

Run: `git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO branch --show-current`
Expected: `feat/KAN-73-recepcion-branch-context`

Si no, hacer: `git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO checkout feat/KAN-73-recepcion-branch-context`

- [ ] **Step 2: Confirmar deps instaladas**

Run: `ls C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO/node_modules/@angular/core | head -1`
Expected: alguna salida (existe).

Si no existe, run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npm install`

- [ ] **Step 3: Smoke test inicial (baseline)**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng test --watch=false`
Expected: build OK, suite verde (algunos preexisting fails documentados en memory — anotalos para comparar al final).

---

## Task 1: Extender `OperatorBranchContextService` con `branchName`

Agrega persistencia del nombre de la sucursal (no solo el id) para que el badge del topbar lo pueda leer. Migra el storage key de `turnos.operatorBranchId` (number) al nuevo `turnos.operatorBranch` (JSON `{id, name}`), preservando lo viejo si existe.

**Files:**
- Modify: `src/app/features/turnos/services/operator-branch.context.ts` (reescribir entero)
- Create: `src/app/features/turnos/services/operator-branch.context.spec.ts`

- [ ] **Step 1: Escribir test del service nuevo**

Crear `src/app/features/turnos/services/operator-branch.context.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { OperatorBranchContextService } from './operator-branch.context';

describe('OperatorBranchContextService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('arranca con branchId y branchName null si no hay nada en storage', () => {
    const svc = TestBed.inject(OperatorBranchContextService);
    expect(svc.branchId()).toBeNull();
    expect(svc.branchName()).toBeNull();
  });

  it('setBranch persiste {id, name} en localStorage y actualiza signals', () => {
    const svc = TestBed.inject(OperatorBranchContextService);
    svc.setBranch(5, 'Sucursal Central');
    expect(svc.branchId()).toBe(5);
    expect(svc.branchName()).toBe('Sucursal Central');
    expect(JSON.parse(localStorage.getItem('turnos.operatorBranch')!)).toEqual({ id: 5, name: 'Sucursal Central' });
  });

  it('migra el storage key viejo (turnos.operatorBranchId) cuando no hay nuevo', () => {
    localStorage.setItem('turnos.operatorBranchId', '7');
    const svc = TestBed.inject(OperatorBranchContextService);
    expect(svc.branchId()).toBe(7);
    expect(svc.branchName()).toBeNull();
  });

  it('clear elimina ambos keys del storage', () => {
    const svc = TestBed.inject(OperatorBranchContextService);
    svc.setBranch(3, 'X');
    localStorage.setItem('turnos.operatorBranchId', '99');
    svc.clear();
    expect(svc.branchId()).toBeNull();
    expect(svc.branchName()).toBeNull();
    expect(localStorage.getItem('turnos.operatorBranch')).toBeNull();
    expect(localStorage.getItem('turnos.operatorBranchId')).toBeNull();
  });

  it('ignora JSON corrupto en el storage nuevo', () => {
    localStorage.setItem('turnos.operatorBranch', 'not-json');
    const svc = TestBed.inject(OperatorBranchContextService);
    expect(svc.branchId()).toBeNull();
    expect(svc.branchName()).toBeNull();
  });

  it('setBranchId (compat) persiste solo el id, name queda null', () => {
    const svc = TestBed.inject(OperatorBranchContextService);
    svc.setBranchId(9);
    expect(svc.branchId()).toBe(9);
    expect(svc.branchName()).toBeNull();
  });
});
```

- [ ] **Step 2: Correr test y verificar que falla**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng test --watch=false --include='**/operator-branch.context.spec.ts'`
Expected: FAIL (el método `setBranch` y `branchName` no existen todavía).

- [ ] **Step 3: Reescribir el service**

Sobreescribir `src/app/features/turnos/services/operator-branch.context.ts`:

```typescript
import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'turnos.operatorBranch';
const LEGACY_KEY = 'turnos.operatorBranchId';

interface StoredBranch {
  id: number;
  name: string | null;
}

/**
 * Branch contexto del operador (recepcionista / admin) para pantallas de
 * turnos. Persistido en localStorage para sobrevivir reloads.
 *
 * El staff NO cambia su propia sucursal (regla de negocio del 2026-06-02):
 * el admin la asigna. Este service expone ambas señales — id + name — para
 * que el badge del topbar pueda mostrar el nombre sin tener que pegarle
 * cada vez al backend.
 *
 * El FAB de dev (`operator-branch-fab.component`) sigue pudiendo escribir
 * acá vía setBranch para iterar en local.
 */
@Injectable({ providedIn: 'root' })
export class OperatorBranchContextService {
  private readonly _branchId = signal<number | null>(null);
  private readonly _branchName = signal<string | null>(null);

  readonly branchId = this._branchId.asReadonly();
  readonly branchName = this._branchName.asReadonly();

  constructor() {
    const stored = this.readFromStorage();
    if (stored) {
      this._branchId.set(stored.id);
      this._branchName.set(stored.name);
    }
  }

  setBranch(id: number, name: string): void {
    const payload: StoredBranch = { id, name };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    this._branchId.set(id);
    this._branchName.set(name);
  }

  /**
   * Compat: sigue habilitado para flujos que solo conocen el id (ej: el FAB
   * de dev). El name queda null y el badge muestra "Sin sucursal" hasta que
   * alguien llame setBranch(id, name) con el name resuelto.
   */
  setBranchId(id: number): void {
    const payload: StoredBranch = { id, name: null };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    this._branchId.set(id);
    this._branchName.set(null);
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_KEY);
    this._branchId.set(null);
    this._branchName.set(null);
  }

  private readFromStorage(): StoredBranch | null {
    // Preferir el key nuevo
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as StoredBranch;
        if (typeof parsed?.id === 'number') return parsed;
      } catch {
        return null;
      }
      return null;
    }
    // Fallback al key legacy (migración silenciosa)
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy !== null) {
      const id = Number(legacy);
      if (Number.isFinite(id)) return { id, name: null };
    }
    return null;
  }
}
```

- [ ] **Step 4: Correr tests, verificar que pasan**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng test --watch=false --include='**/operator-branch.context.spec.ts'`
Expected: PASS — 6 tests verdes.

- [ ] **Step 5: Smoke check del FAB existente (no debe romperse)**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && grep -n "setBranchId\|setBranch\b" src/app/features/turnos/components/operator-branch-fab.component.ts`
Expected: ve usos de `setBranchId(...)` con un número. El service mantiene ese método (queda compat), así que el FAB sigue funcionando — solo que después de un click el name queda null hasta que el bootstrap lo resuelva.

- [ ] **Step 6: Commit**

```bash
git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO add src/app/features/turnos/services/operator-branch.context.ts src/app/features/turnos/services/operator-branch.context.spec.ts
git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO commit -m "feat(turnos): extender OperatorBranchContextService con branchName (KAN-73)

Agrega senal branchName ademas de branchId, migra el storage key viejo
(turnos.operatorBranchId) al nuevo (turnos.operatorBranch como JSON {id,
name}) preservando lo existente. setBranchId queda como API compat para
el FAB de dev.

Refs KAN-73."
```

---

## Task 2: Crear `BranchBadgeComponent` + integrarlo al topbar

Componente chico que renderiza un chip PrimeNG con el nombre de la sucursal activa. Tooltip on-hover. Read-only. Si no hay sucursal seteada, muestra estado "Sin sucursal" con severity warn.

**Files:**
- Create: `src/app/layout/topbar/branch-badge.component.ts`
- Create: `src/app/layout/topbar/branch-badge.component.spec.ts`
- Modify: `src/app/layout/topbar/topbar.component.ts` (importar + integrar)

- [ ] **Step 1: Crear el componente**

Crear `src/app/layout/topbar/branch-badge.component.ts`:

```typescript
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ChipModule } from 'primeng/chip';
import { TooltipModule } from 'primeng/tooltip';
import { OperatorBranchContextService } from '@features/turnos/services/operator-branch.context';

@Component({
  selector: 'ui-branch-badge',
  standalone: true,
  imports: [ChipModule, TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (branchName()) {
      <p-chip
        [label]="'Sucursal: ' + branchName()"
        icon="pi pi-map-marker"
        styleClass="ui-branch-badge ui-branch-badge--set"
        [pTooltip]="tooltipSet"
        tooltipPosition="bottom" />
    } @else {
      <p-chip
        label="Sin sucursal"
        icon="pi pi-exclamation-triangle"
        styleClass="ui-branch-badge ui-branch-badge--unset"
        [pTooltip]="tooltipUnset"
        tooltipPosition="bottom" />
    }
  `,
  styles: [`
    :host { display: inline-flex; }
    :host ::ng-deep .ui-branch-badge {
      font-size: 11px;
      height: 26px;
      background: rgba(255,255,255,.08);
      color: #f1f5f9;
      border: 1px solid rgba(255,255,255,.12);
    }
    :host ::ng-deep .ui-branch-badge--unset {
      background: rgba(245,158,11,.18);
      border-color: rgba(245,158,11,.35);
      color: #fde68a;
    }
    :host ::ng-deep .ui-branch-badge .p-chip-icon { font-size: 12px; }
  `],
})
export class BranchBadgeComponent {
  private readonly ctx = inject(OperatorBranchContextService);

  protected readonly branchName = computed(() => this.ctx.branchName());

  protected readonly tooltipSet = 'Para cambiar de sucursal, pedile al administrador.';
  protected readonly tooltipUnset = 'No tenés sucursal asignada. Avisá al administrador.';
}
```

- [ ] **Step 2: Escribir smoke test**

Crear `src/app/layout/topbar/branch-badge.component.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { BranchBadgeComponent } from './branch-badge.component';
import { OperatorBranchContextService } from '@features/turnos/services/operator-branch.context';

describe('BranchBadgeComponent', () => {
  function setup(name: string | null) {
    const ctx = {
      branchName: signal<string | null>(name).asReadonly(),
      branchId: signal<number | null>(name ? 1 : null).asReadonly(),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: OperatorBranchContextService, useValue: ctx }],
    });
    const fixture = TestBed.createComponent(BranchBadgeComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renderiza el nombre cuando hay sucursal seteada', () => {
    const fixture = setup('Sucursal Central');
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Sucursal Central');
    expect(text).toContain('Sucursal:');
  });

  it('renderiza "Sin sucursal" cuando no hay sucursal', () => {
    const fixture = setup(null);
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Sin sucursal');
  });

  it('aplica clase --unset cuando no hay sucursal', () => {
    const fixture = setup(null);
    const chip = fixture.nativeElement.querySelector('.ui-branch-badge--unset');
    expect(chip).not.toBeNull();
  });
});
```

- [ ] **Step 3: Correr tests y verificar que pasan**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng test --watch=false --include='**/branch-badge.component.spec.ts'`
Expected: PASS — 3 tests verdes.

- [ ] **Step 4: Integrar `BranchBadgeComponent` en el topbar**

Modificar `src/app/layout/topbar/topbar.component.ts`:

a) Importar el componente al inicio del archivo (después de `ProfileMenuComponent`):

```typescript
import { BranchBadgeComponent } from './branch-badge.component';
```

b) Agregarlo a `imports` del `@Component`:

```typescript
imports: [Popover, ProfileMenuComponent, BranchBadgeComponent],
```

c) En el template, dentro de `.ui-topbar__actions`, agregar `<ui-branch-badge />` **antes** del botón de notificaciones:

Buscar:
```html
      <div class="ui-topbar__actions">
        <!-- TODO: badge dinámico de notificaciones -->
        <button
          type="button"
          class="ui-topbar__icon-btn ui-topbar__icon-btn--notif"
```

Cambiar por:
```html
      <div class="ui-topbar__actions">
        <ui-branch-badge />
        <!-- TODO: badge dinámico de notificaciones -->
        <button
          type="button"
          class="ui-topbar__icon-btn ui-topbar__icon-btn--notif"
```

- [ ] **Step 5: Smoke run + dev server visual check**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng build`
Expected: build exitoso (sin TypeScript errors).

(Opcional, si dev server está corriendo en :4200) Abrir cualquier ruta autenticada y verificar que el chip aparece en topbar.

- [ ] **Step 6: Commit**

```bash
git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO add src/app/layout/topbar/branch-badge.component.ts src/app/layout/topbar/branch-badge.component.spec.ts src/app/layout/topbar/topbar.component.ts
git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO commit -m "feat(layout): badge sucursal read-only en topbar (KAN-73)

Chip PrimeNG arriba-derecha del topbar que muestra la sucursal activa
del operador. Estados: 'Sucursal: <name>' (con icono pin) o 'Sin
sucursal' (warn). Tooltip on-hover explica que el cambio lo hace el
admin. Lee del OperatorBranchContextService.

Refs KAN-73."
```

---

## Task 3: Crear `BranchBootstrapService` + registrar en `APP_INITIALIZER`

Servicio que corre al boot y asegura que `OperatorBranchContextService` tenga `branchId` + `branchName` antes de que las pantallas de turnos arranquen. Fuentes en orden de prioridad:
1. Lo que ya está en localStorage (id + name → ya seteado, solo resolver name si falta).
2. `user.branch` (`UserSessionService.currentUser()`) — id solo, resolver name vía `SucursalesService.listBranchesForSelector()`.
3. Primera sucursal del tenant via `SucursalesService.listBranchesForSelector()` (fallback temporal documentado en el spec).

**Files:**
- Create: `src/app/core/branch/branch-bootstrap.service.ts`
- Create: `src/app/core/branch/branch-bootstrap.service.spec.ts`
- Modify: `src/app/app.config.ts` (registrar en `provideAppInitializer`)

- [ ] **Step 1: Escribir el test primero**

Crear `src/app/core/branch/branch-bootstrap.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { BranchBootstrapService } from './branch-bootstrap.service';
import { OperatorBranchContextService } from '@features/turnos/services/operator-branch.context';
import { UserSessionService } from '@features/profile/services/user-session.service';
import { SucursalesService } from '@features/sucursales/services/sucursales.service';

describe('BranchBootstrapService', () => {
  let ctx: {
    branchId: ReturnType<typeof signal<number | null>>;
    branchName: ReturnType<typeof signal<string | null>>;
    setBranch: ReturnType<typeof vi.fn>;
  };
  let user: { currentUser: ReturnType<typeof signal<any>> };
  let sucursales: { listBranchesForSelector: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    ctx = {
      branchId: signal<number | null>(null),
      branchName: signal<string | null>(null),
      setBranch: vi.fn(),
    };
    user = { currentUser: signal<any>(null) };
    sucursales = { listBranchesForSelector: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        BranchBootstrapService,
        { provide: OperatorBranchContextService, useValue: ctx },
        { provide: UserSessionService, useValue: user },
        { provide: SucursalesService, useValue: sucursales },
      ],
    });
  });

  it('si ya hay id y name en context, no hace nada', async () => {
    ctx.branchId.set(5);
    ctx.branchName.set('Central');
    const svc = TestBed.inject(BranchBootstrapService);
    await firstValueFrom(svc.init());
    expect(ctx.setBranch).not.toHaveBeenCalled();
    expect(sucursales.listBranchesForSelector).not.toHaveBeenCalled();
  });

  it('si hay id pero no name, resuelve el name desde la lista de branches', async () => {
    ctx.branchId.set(5);
    ctx.branchName.set(null);
    sucursales.listBranchesForSelector.mockReturnValue(of([
      { id: 3, name: 'Norte' },
      { id: 5, name: 'Central' },
    ]));
    const svc = TestBed.inject(BranchBootstrapService);
    await firstValueFrom(svc.init());
    expect(ctx.setBranch).toHaveBeenCalledWith(5, 'Central');
  });

  it('si no hay id en context pero el user tiene branch, usa ese id y resuelve name', async () => {
    user.currentUser.set({ id: 1, branch: 7 } as any);
    sucursales.listBranchesForSelector.mockReturnValue(of([
      { id: 7, name: 'Sur' },
    ]));
    const svc = TestBed.inject(BranchBootstrapService);
    await firstValueFrom(svc.init());
    expect(ctx.setBranch).toHaveBeenCalledWith(7, 'Sur');
  });

  it('si no hay nada, usa la primera sucursal de la lista (fallback)', async () => {
    sucursales.listBranchesForSelector.mockReturnValue(of([
      { id: 9, name: 'Default' },
      { id: 10, name: 'Otra' },
    ]));
    const svc = TestBed.inject(BranchBootstrapService);
    await firstValueFrom(svc.init());
    expect(ctx.setBranch).toHaveBeenCalledWith(9, 'Default');
  });

  it('si la API falla, no rompe el bootstrap (resuelve igual sin setear)', async () => {
    sucursales.listBranchesForSelector.mockReturnValue(throwError(() => new Error('500')));
    const svc = TestBed.inject(BranchBootstrapService);
    await firstValueFrom(svc.init());
    expect(ctx.setBranch).not.toHaveBeenCalled();
  });

  it('si la API devuelve lista vacia, no setea nada', async () => {
    sucursales.listBranchesForSelector.mockReturnValue(of([]));
    const svc = TestBed.inject(BranchBootstrapService);
    await firstValueFrom(svc.init());
    expect(ctx.setBranch).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng test --watch=false --include='**/branch-bootstrap.service.spec.ts'`
Expected: FAIL — el archivo `branch-bootstrap.service.ts` no existe.

- [ ] **Step 3: Crear el service**

Crear `src/app/core/branch/branch-bootstrap.service.ts`:

```typescript
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { OperatorBranchContextService } from '@features/turnos/services/operator-branch.context';
import { UserSessionService } from '@features/profile/services/user-session.service';
import { SucursalesService } from '@features/sucursales/services/sucursales.service';

/**
 * Asegura que el operador tenga una sucursal activa antes de entrar a las
 * pantallas de turnos. Estrategia:
 *
 *   1. Si OperatorBranchContextService ya tiene id Y name -> nada que hacer.
 *   2. Si tiene id pero falta name -> bajar la lista de sucursales y matchear.
 *   3. Si no tiene id pero el user (UserSessionService) tiene un branch
 *      asignado -> usar ese id y resolver name vía la lista.
 *   4. Fallback: usar la primera sucursal del tenant. Documentado como
 *      temporal en el spec — se elimina cuando el backend asigne sucursal
 *      por usuario en el login response.
 *
 * Errores son no-fatal: si la API falla, el badge muestra "Sin sucursal"
 * y las pantallas dependientes muestran fallback. No bloqueamos el boot.
 */
@Injectable({ providedIn: 'root' })
export class BranchBootstrapService {
  private readonly ctx = inject(OperatorBranchContextService);
  private readonly user = inject(UserSessionService);
  private readonly sucursales = inject(SucursalesService);

  init(): Observable<void> {
    const currentId = this.ctx.branchId();
    const currentName = this.ctx.branchName();

    if (currentId != null && currentName != null) {
      return of(void 0);
    }

    return this.sucursales.listBranchesForSelector().pipe(
      tap(branches => {
        if (branches.length === 0) return;

        // Caso 2: hay id pero falta name -> matchear contra la lista
        if (currentId != null) {
          const match = branches.find(b => b.id === currentId);
          if (match) this.ctx.setBranch(match.id, match.name);
          return;
        }

        // Caso 3: hay branch en user -> usar y resolver name
        const userBranchId = this.user.currentUser()?.branch ?? null;
        if (userBranchId != null) {
          const match = branches.find(b => b.id === userBranchId);
          if (match) {
            this.ctx.setBranch(match.id, match.name);
            return;
          }
        }

        // Caso 4: fallback a la primera del tenant
        const first = branches[0];
        this.ctx.setBranch(first.id, first.name);
      }),
      map(() => void 0),
      catchError(() => of(void 0)),
    );
  }
}
```

- [ ] **Step 4: Correr tests y verificar que pasan**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng test --watch=false --include='**/branch-bootstrap.service.spec.ts'`
Expected: PASS — 6 tests verdes.

- [ ] **Step 5: Registrar en `provideAppInitializer`**

Modificar `src/app/app.config.ts`:

a) Agregar import al inicio del archivo (después de los imports de `loadMySections`):

```typescript
import { BranchBootstrapService } from '@core/branch/branch-bootstrap.service';
```

b) Modificar el callback de `provideAppInitializer`. Buscar:

```typescript
    provideAppInitializer(() => {
      const tokens = inject(TokenService);
      const store = inject(Store);
      if (tokens.isTokenValid() && !tokens.getRoles().includes('SAAS_ADMIN')) {
        store.dispatch(loadTenantConfig());
        store.dispatch(loadMySections());
      }
    }),
```

Reemplazar por:

```typescript
    provideAppInitializer(() => {
      const tokens = inject(TokenService);
      const store = inject(Store);
      const branchBootstrap = inject(BranchBootstrapService);
      if (tokens.isTokenValid() && !tokens.getRoles().includes('SAAS_ADMIN')) {
        store.dispatch(loadTenantConfig());
        store.dispatch(loadMySections());
        // No bloqueamos el boot: si la resolución de sucursal falla, las
        // pantallas dependientes muestran fallback ("Sin sucursal").
        branchBootstrap.init().subscribe();
      }
    }),
```

- [ ] **Step 6: Verificar que la app sigue compilando**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng build`
Expected: build exitoso.

- [ ] **Step 7: Commit**

```bash
git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO add src/app/core/branch/branch-bootstrap.service.ts src/app/core/branch/branch-bootstrap.service.spec.ts src/app/app.config.ts
git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO commit -m "feat(core): BranchBootstrapService asegura sucursal activa al boot (KAN-73)

Service nuevo que corre en provideAppInitializer y resuelve la sucursal
activa del operador con tres fuentes en orden: localStorage (ya seteado
via OperatorBranchContextService), user.branch del UserSessionService,
fallback a primera sucursal del tenant via SucursalesService. Errores
no-fatales: si todo falla, las pantallas muestran 'Sin sucursal'.

Fallback documentado como temporal en el spec — se elimina cuando el
backend asigne sucursal por usuario en el login response.

Refs KAN-73."
```

---

## Task 4: Crear `selectQueueEntriesAll` con merge + orden

Selector nuevo en `queue.selectors.ts` que combina los dos selectors existentes (`withAppointment` + `walkIn`) en un solo array ordenado por `createdAt`. Los selectors viejos quedan disponibles pero deprecados.

**Files:**
- Modify: `src/app/features/turnos/store/queue/queue.selectors.ts`
- Create: `src/app/features/turnos/store/queue/queue.selectors.spec.ts`

- [ ] **Step 1: Escribir el test del selector primero**

Crear `src/app/features/turnos/store/queue/queue.selectors.spec.ts`:

```typescript
import { QueueStatus } from '../../models/queue-status.enum';
import { QueueEntry } from '../../models/queue-entry.model';
import { QueueState } from './queue.state';
import { selectQueueEntriesAll } from './queue.selectors';

function entry(over: Partial<QueueEntry>): QueueEntry {
  return {
    id: 0,
    publicCode: 'CT-0001',
    nationalId: '',
    patientId: null,
    branchId: 1,
    hasAppointment: true,
    status: QueueStatus.PENDING,
    lastCalledAt: null,
    callCount: 0,
    createdAt: '2026-06-02T09:00:00Z',
    ...over,
  };
}

describe('selectQueueEntriesAll', () => {
  function state(entries: QueueEntry[]): { queue: QueueState } {
    return {
      queue: { entries, loading: false, callingId: null, error: null },
    };
  }

  it('combina CT y ST en una sola lista ordenada por createdAt asc', () => {
    const result = selectQueueEntriesAll(state([
      entry({ id: 1, publicCode: 'CT-0001', createdAt: '2026-06-02T09:30:00Z' }),
      entry({ id: 2, publicCode: 'ST-0001', hasAppointment: false, createdAt: '2026-06-02T09:00:00Z' }),
      entry({ id: 3, publicCode: 'CT-0002', createdAt: '2026-06-02T09:15:00Z' }),
    ]));
    expect(result.map(e => e.id)).toEqual([2, 3, 1]);
  });

  it('filtra entries que no estan en PENDING', () => {
    const result = selectQueueEntriesAll(state([
      entry({ id: 1, status: QueueStatus.PENDING }),
      entry({ id: 2, status: QueueStatus.CALLED }),
      entry({ id: 3, status: QueueStatus.COMPLETED }),
    ]));
    expect(result.map(e => e.id)).toEqual([1]);
  });

  it('devuelve array vacio cuando no hay entries', () => {
    expect(selectQueueEntriesAll(state([]))).toEqual([]);
  });

  it('mantiene orden estable cuando createdAt es identico (preserva orden del input)', () => {
    const sameTime = '2026-06-02T09:00:00Z';
    const result = selectQueueEntriesAll(state([
      entry({ id: 1, publicCode: 'CT-0001', createdAt: sameTime }),
      entry({ id: 2, publicCode: 'ST-0001', hasAppointment: false, createdAt: sameTime }),
    ]));
    expect(result.map(e => e.id)).toEqual([1, 2]);
  });
});
```

- [ ] **Step 2: Verificar el enum QueueStatus**

Run: `cat C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO/src/app/features/turnos/models/queue-status.enum.ts`
Expected: ver los valores reales (típicamente `PENDING`, `CALLED`, `COMPLETED`). Si alguno tiene otro nombre, ajustar el test del Step 1 antes de seguir.

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng test --watch=false --include='**/queue.selectors.spec.ts'`
Expected: FAIL — `selectQueueEntriesAll` no existe.

- [ ] **Step 4: Agregar el selector**

Modificar `src/app/features/turnos/store/queue/queue.selectors.ts` — agregar al final del archivo:

```typescript
/**
 * Cola unica combinada (CT + ST) ordenada por orden de llegada (createdAt asc).
 * Reemplaza el patron de 2 listas separadas en la pantalla de Recepcion.
 * El distinguidor CT/ST queda implicito en el prefijo del publicCode.
 */
export const selectQueueEntriesAll = createSelector(
  selectQueueState,
  (s) => s.entries
    .filter(e => e.status === QueueStatus.PENDING)
    .slice()  // copia defensiva (no mutar el state)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
);
```

- [ ] **Step 5: Correr tests y verificar que pasan**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng test --watch=false --include='**/queue.selectors.spec.ts'`
Expected: PASS — 4 tests verdes.

- [ ] **Step 6: Commit**

```bash
git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO add src/app/features/turnos/store/queue/queue.selectors.ts src/app/features/turnos/store/queue/queue.selectors.spec.ts
git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO commit -m "feat(turnos): selector selectQueueEntriesAll combina CT+ST ordenado (KAN-73)

Selector nuevo que combina los dos selectors existentes (withAppointment
+ walkIn) en una sola lista de entries PENDING ordenada por createdAt
asc. Habilita la pantalla de Recepcion con una sola tabla en lugar de
dos cards. Los selectors viejos quedan disponibles para callers
existentes.

Refs KAN-73."
```

---

## Task 5: Modificar `queue.effects.loadQueue$` para usar branchId del context (con fallback)

El effect actualmente requiere que la `action.branchId` venga del dispatcher. Cambiamos para que, si la action no trae `branchId` (será optional), el effect lo lea del `OperatorBranchContextService`. Si tampoco hay context, no dispatcha (warn).

**Files:**
- Modify: `src/app/features/turnos/store/queue/queue.actions.ts` (branchId optional en loadQueue)
- Modify: `src/app/features/turnos/store/queue/queue.effects.ts`
- Modify: `src/app/features/turnos/store/queue/queue.effects.spec.ts`

- [ ] **Step 1: Hacer optional el branchId de la action `loadQueue`**

Modificar `src/app/features/turnos/store/queue/queue.actions.ts` — reemplazar la action `loadQueue`:

```typescript
export const loadQueue = createAction(
  '[Queue] Load',
  props<{ branchId?: number }>()
);
```

- [ ] **Step 2: Modificar el effect para usar el context si falta branchId**

Modificar `src/app/features/turnos/store/queue/queue.effects.ts`:

a) Agregar import al inicio:

```typescript
import { OperatorBranchContextService } from '../../services/operator-branch.context';
```

b) Agregar el inject dentro de la clase (después de `private router = inject(Router);`):

```typescript
  private branchContext = inject(OperatorBranchContextService);
```

c) Reemplazar el effect `load$` por:

```typescript
  load$ = createEffect(() => this.actions$.pipe(
    ofType(A.loadQueue),
    switchMap(({ branchId }) => {
      const effectiveBranchId = branchId ?? this.branchContext.branchId();
      if (effectiveBranchId == null) {
        console.warn('[queue.effects] loadQueue dispatched sin branchId y sin context — skip');
        return of(A.loadQueueFailure({ error: new Error('No branchId available') }));
      }
      return this.service.list(effectiveBranchId).pipe(
        map(entries => A.loadQueueSuccess({ entries })),
        catchError(error => of(A.loadQueueFailure({ error }))),
      );
    }),
  ));
```

- [ ] **Step 3: Agregar tests al spec del effect**

Modificar `src/app/features/turnos/store/queue/queue.effects.spec.ts`:

a) En los imports, agregar:

```typescript
import { signal } from '@angular/core';
import { loadQueue, loadQueueSuccess, loadQueueFailure } from './queue.actions';
import { OperatorBranchContextService } from '../../services/operator-branch.context';
```

b) Antes del `describe` existente, agregar un nuevo `describe` para `load$`:

```typescript
describe('QueueEffects — load$', () => {
  let actions$: Observable<Action>;
  let queueService: {
    list: ReturnType<typeof vi.fn>;
    call: ReturnType<typeof vi.fn>;
    callByAppointment: ReturnType<typeof vi.fn>;
  };
  let branchContext: { branchId: ReturnType<typeof signal<number | null>> };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let messageService: { add: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    queueService = { list: vi.fn(), call: vi.fn(), callByAppointment: vi.fn() };
    branchContext = { branchId: signal<number | null>(null) };
    router = { navigate: vi.fn() };
    messageService = { add: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        QueueEffects,
        provideMockActions(() => actions$),
        { provide: QueueService, useValue: queueService },
        { provide: OperatorBranchContextService, useValue: branchContext },
        { provide: Router, useValue: router },
        { provide: MessageService, useValue: messageService },
      ],
    });
  });

  it('usa branchId explicito si la action lo trae', () => {
    return new Promise<void>((resolve) => {
      queueService.list.mockReturnValue(of([]));
      actions$ = of(loadQueue({ branchId: 42 }));

      TestBed.inject(QueueEffects).load$.subscribe((action) => {
        expect(queueService.list).toHaveBeenCalledWith(42);
        expect(action).toEqual(loadQueueSuccess({ entries: [] }));
        resolve();
      });
    });
  });

  it('cae al branchId del context si la action no lo trae', () => {
    return new Promise<void>((resolve) => {
      branchContext.branchId.set(7);
      queueService.list.mockReturnValue(of([]));
      actions$ = of(loadQueue({}));

      TestBed.inject(QueueEffects).load$.subscribe((action) => {
        expect(queueService.list).toHaveBeenCalledWith(7);
        expect(action).toEqual(loadQueueSuccess({ entries: [] }));
        resolve();
      });
    });
  });

  it('dispatcha failure si ni action ni context tienen branchId', () => {
    return new Promise<void>((resolve) => {
      actions$ = of(loadQueue({}));

      TestBed.inject(QueueEffects).load$.subscribe((action) => {
        expect(queueService.list).not.toHaveBeenCalled();
        expect(action.type).toBe(loadQueueFailure.type);
        resolve();
      });
    });
  });
});
```

c) En el `describe` existente (`'QueueEffects — callAppointmentForAttention'`), agregar el `OperatorBranchContextService` mock en el `beforeEach`. Buscar el bloque `providers: [...]` dentro del describe original y agregar (justo después de `{ provide: QueueService, ... }`):

```typescript
        { provide: OperatorBranchContextService, useValue: { branchId: signal<number | null>(null) } },
```

(Necesario porque ahora `QueueEffects` inyecta el context.)

- [ ] **Step 4: Correr tests y verificar que pasan todos los del archivo**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng test --watch=false --include='**/queue.effects.spec.ts'`
Expected: PASS — los 3 viejos + los 3 nuevos = 6 tests verdes.

- [ ] **Step 5: Verificar que el resto del repo no se rompió**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng build`
Expected: build OK. Si rompe en algún caller de `loadQueue` que esperaba `branchId` no-optional, no debería pasar porque marcamos optional (compat hacia adelante).

- [ ] **Step 6: Commit**

```bash
git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO add src/app/features/turnos/store/queue/queue.actions.ts src/app/features/turnos/store/queue/queue.effects.ts src/app/features/turnos/store/queue/queue.effects.spec.ts
git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO commit -m "feat(turnos): queue.effects.load\$ cae al branchId del context si falta (KAN-73)

loadQueue ahora tiene branchId opcional. Si el dispatcher no lo trae,
el effect lo lee del OperatorBranchContextService. Si tampoco hay
context, dispatcha loadQueueFailure (warn). Habilita que la pantalla
de Recepcion deje de pasar branchId como @Input y se apoye en el
context.

Refs KAN-73."
```

---

## Task 6: Refactor `RecepcionConTotemComponent` a una sola tabla combinada

Reemplaza las 2 cards (`Con turno` / `Sin turno`) por una sola tabla que usa `selectQueueEntriesAll`. Agrega `[styleClass]` por fila para color sutil cuando es ST.

**Files:**
- Modify: `src/app/features/turnos/pages/recepcion/recepcion-con-totem.component.ts`
- Modify: `src/app/features/turnos/pages/recepcion/recepcion-con-totem.component.html`
- Modify: `src/app/features/turnos/pages/recepcion/recepcion-con-totem.component.scss`

- [ ] **Step 1: Reescribir el componente .ts**

Sobreescribir `src/app/features/turnos/pages/recepcion/recepcion-con-totem.component.ts`:

```typescript
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { callQueueEntry, loadQueue } from '../../store/queue/queue.actions';
import {
  selectQueueEntriesAll,
  selectQueueLoading,
} from '../../store/queue/queue.selectors';
import { QueueRowActionsComponent } from '../../components/queue-row-actions.component';
import { OperatorBranchContextService } from '../../services/operator-branch.context';
import { QueueEntry } from '../../models/queue-entry.model';

@Component({
  selector: 'app-recepcion-con-totem',
  standalone: true,
  imports: [TableModule, ButtonModule, CardModule, QueueRowActionsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recepcion-con-totem.component.html',
  styleUrl: './recepcion-con-totem.component.scss',
})
export class RecepcionConTotemComponent implements OnInit {
  private store = inject(Store);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private branchContext = inject(OperatorBranchContextService);

  protected entries = this.store.selectSignal(selectQueueEntriesAll);
  protected loading = this.store.selectSignal(selectQueueLoading);
  protected hasBranch = this.branchContext.branchId;

  ngOnInit(): void {
    this.store.dispatch(loadQueue({}));  // effect resuelve branchId del context
    interval(5000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.store.dispatch(loadQueue({})));
  }

  protected onCall(id: number): void {
    const branchId = this.branchContext.branchId();
    if (branchId == null) return;
    this.store.dispatch(callQueueEntry({ id, branchId }));
  }

  protected onNuevaAtencion(id: number): void {
    this.router.navigate(['/turnos/atencion-turno', id]);
  }

  protected rowClass(entry: QueueEntry): string {
    return entry.publicCode.startsWith('ST') ? 'row-st' : '';
  }
}
```

- [ ] **Step 2: Reescribir el template .html**

Sobreescribir `src/app/features/turnos/pages/recepcion/recepcion-con-totem.component.html`:

```html
<p-card header="Cola de espera">
  @if (!hasBranch()) {
    <div class="empty-branch">
      <i class="pi pi-info-circle"></i>
      <span>No hay sucursal asignada. Avisá al administrador.</span>
    </div>
  } @else {
    <p-table
      [value]="entries()"
      [loading]="loading()"
      [rowTrackBy]="trackById">
      <ng-template pTemplate="header">
        <tr>
          <th>Código</th>
          <th>DNI</th>
          <th>Llamadas</th>
          <th></th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-row>
        <tr [class]="rowClass(row)">
          <td>{{ row.publicCode }}</td>
          <td>{{ row.nationalId }}</td>
          <td>
            @if (row.callCount > 0) {
              <span class="call-count">{{ row.callCount }}</span>
            }
          </td>
          <td>
            <app-queue-row-actions
              [entryId]="row.id"
              (call)="onCall(row.id)"
              (nuevaAtencion)="onNuevaAtencion(row.id)" />
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr><td colspan="4">No hay pacientes en cola.</td></tr>
      </ng-template>
    </p-table>
  }
</p-card>
```

Agregar el método `trackById` al .ts (después de `rowClass`):

```typescript
  protected trackById = (_: number, e: QueueEntry) => e.id;
```

- [ ] **Step 3: Reescribir el .scss**

Sobreescribir `src/app/features/turnos/pages/recepcion/recepcion-con-totem.component.scss`:

```scss
:host { display: block; }

.empty-branch {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  color: var(--ds-text-muted, #64748b);
  font-size: 0.875rem;
  background: rgba(245, 158, 11, 0.06);
  border-radius: 6px;
}

.call-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  height: 1.5rem;
  padding: 0 0.5rem;
  border-radius: 9999px;
  background: var(--ds-warning, #f59e0b);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
}

// Color sutil para filas ST (sin turno). PrimeNG aplica el class al <tr>.
:host ::ng-deep tr.row-st > td {
  background-color: rgba(255, 165, 0, 0.05);
}
```

- [ ] **Step 4: Limpiar el @Input branchId del padre**

Modificar `src/app/features/turnos/pages/recepcion/recepcion.page.ts`:

a) Quitar la prop `branchId` que se pasa al `<app-recepcion-con-totem>`. Leer el template:

Run: `cat C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO/src/app/features/turnos/pages/recepcion/recepcion.page.html`

Buscar `<app-recepcion-con-totem [branchId]="branchId" />` (o variante similar) y reemplazar por `<app-recepcion-con-totem />`.

b) En el .ts, dejar `branchId` solo si lo usa el `<app-recepcion-sin-totem>` u otras llamadas (no tocar — fuera de scope).

- [ ] **Step 5: Build check**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng build`
Expected: build OK. Si rompe, revisar que el `[branchId]="branchId"` removido no esté siendo declarado required en `RecepcionSinTotemComponent` (no debería: solo tocamos `con-totem`).

- [ ] **Step 6: Smoke test (correr suite completa de turnos)**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng test --watch=false --include='**/turnos/**/*.spec.ts'`
Expected: las suites de queue (selectors + effects) pasan. Smoke del componente puede no existir todavía — eso es OK.

- [ ] **Step 7: Commit**

```bash
git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO add src/app/features/turnos/pages/recepcion/recepcion-con-totem.component.ts src/app/features/turnos/pages/recepcion/recepcion-con-totem.component.html src/app/features/turnos/pages/recepcion/recepcion-con-totem.component.scss src/app/features/turnos/pages/recepcion/recepcion.page.ts src/app/features/turnos/pages/recepcion/recepcion.page.html
git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO commit -m "feat(turnos): recepcion con-totem una lista combinada con color ST sutil (KAN-73)

Reemplaza las dos p-card (Con turno / Sin turno) por una sola tabla que
usa selectQueueEntriesAll. Las filas ST tienen background-color sutil
(rgba naranja 5%) para distinguir sin agregar columna nueva — el
distinguidor primario sigue siendo el prefijo del publicCode.

El componente ya no recibe branchId como @Input: lo lee del
OperatorBranchContextService (via el effect). Si no hay sucursal
asignada, muestra mensaje 'No hay sucursal asignada'.

Refs KAN-73."
```

---

## Task 7: Crear selector derivado con estado de cada turno del drawer

Selector que combina el state de `appointments` (turnos del día) con el state de `queue` (cola actual) para proyectar cada turno con su estado UI: `Pendiente` | `Llegó` | `Cancelado`.

**Files:**
- Create: `src/app/features/turnos/store/appointments/appointments.derived.selectors.ts`
- Create: `src/app/features/turnos/store/appointments/appointments.derived.selectors.spec.ts`

- [ ] **Step 1: Escribir el test del selector**

Crear `src/app/features/turnos/store/appointments/appointments.derived.selectors.spec.ts`:

```typescript
import { selectScheduledAppointmentsForDrawer } from './appointments.derived.selectors';
import { Appointment } from '../../models/appointment.model';
import { QueueEntry } from '../../models/queue-entry.model';
import { QueueStatus } from '../../models/queue-status.enum';

function apt(over: Partial<Appointment>): Appointment {
  return {
    id: 0,
    patientId: 1,
    patientName: 'X',
    appointmentTime: '2026-06-02T09:00:00Z',
    branchId: 1,
    status: 'SCHEDULED',
    ...over,
  };
}

function queueEntry(appointmentId: number | null): QueueEntry {
  return {
    id: 999,
    publicCode: 'CT-0001',
    nationalId: '',
    patientId: null,
    branchId: 1,
    hasAppointment: appointmentId != null,
    status: QueueStatus.PENDING,
    lastCalledAt: null,
    callCount: 0,
    createdAt: '2026-06-02T09:00:00Z',
    // El selector necesita conocer appointmentId — el dato real viene del
    // backend en QueueEntry. Si el shape no lo expone, este test falla y
    // hay que ampliar el modelo. Por ahora asumimos que existe como
    // (entry as any).appointmentId.
    ...(appointmentId != null ? { appointmentId } as any : {}),
  } as QueueEntry;
}

describe('selectScheduledAppointmentsForDrawer', () => {
  it('marca como Cancelado los appointments con status CANCELED', () => {
    const result = selectScheduledAppointmentsForDrawer.projector(
      [apt({ id: 1, status: 'CANCELED', patientName: 'Juan', appointmentTime: '2026-06-02T09:00:00Z' })],
      [],
    );
    expect(result).toEqual([
      { id: 1, hora: '09:00', paciente: 'Juan', estado: 'Cancelado' },
    ]);
  });

  it('marca como Llego los appointments con QueueEntry en la cola actual', () => {
    const result = selectScheduledAppointmentsForDrawer.projector(
      [apt({ id: 5, patientName: 'Ana', appointmentTime: '2026-06-02T10:30:00Z' })],
      [queueEntry(5)],
    );
    expect(result[0].estado).toBe('Llego');
  });

  it('marca como Pendiente el resto', () => {
    const result = selectScheduledAppointmentsForDrawer.projector(
      [apt({ id: 2, patientName: 'Pepe', appointmentTime: '2026-06-02T11:00:00Z' })],
      [],
    );
    expect(result[0].estado).toBe('Pendiente');
  });

  it('ordena por hora ascendente y pone los cancelados al final', () => {
    const result = selectScheduledAppointmentsForDrawer.projector(
      [
        apt({ id: 1, appointmentTime: '2026-06-02T11:00:00Z', patientName: 'A' }),
        apt({ id: 2, status: 'CANCELED', appointmentTime: '2026-06-02T09:00:00Z', patientName: 'B' }),
        apt({ id: 3, appointmentTime: '2026-06-02T10:00:00Z', patientName: 'C' }),
      ],
      [],
    );
    expect(result.map(r => r.id)).toEqual([3, 1, 2]);
  });

  it('extrae hora HH:MM del ISO timestamp', () => {
    const result = selectScheduledAppointmentsForDrawer.projector(
      [apt({ id: 1, appointmentTime: '2026-06-02T14:25:00Z', patientName: 'X' })],
      [],
    );
    expect(result[0].hora).toBe('14:25');
  });
});
```

- [ ] **Step 2: Verificar si `QueueEntry` expone `appointmentId`**

Run: `grep -n "appointmentId" C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO/src/app/features/turnos/models/queue-entry.model.ts`
Expected: si aparece, OK. Si no aparece, hay que agregarlo:

Modificar `src/app/features/turnos/models/queue-entry.model.ts` — agregar `appointmentId: number | null;` al interface `QueueEntry` después de `branchId: number;`:

```typescript
  branchId: number;
  appointmentId: number | null;  // null para walk-ins (ST), no-null para CT
  hasAppointment: boolean;
  ...
```

Si el backend ya lo manda (verificar con `grep -n "appointment" C:/Users/Mateo/Desktop/tesis/Backend/src/main/java/lab/laboratorio/modules/turnos/presentation/dto/QueueEntryResponse.java`), no hace falta nada más. Si no lo manda, escalar al user — está fuera del scope del plan, modificar.

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng test --watch=false --include='**/appointments.derived.selectors.spec.ts'`
Expected: FAIL — el selector no existe.

- [ ] **Step 4: Crear el selector**

Crear `src/app/features/turnos/store/appointments/appointments.derived.selectors.ts`:

```typescript
import { createSelector } from '@ngrx/store';
import { selectTodayAppointments } from './appointments.selectors';
import { selectQueueState } from '../queue/queue.selectors';
import { Appointment } from '../../models/appointment.model';
import { QueueEntry } from '../../models/queue-entry.model';

export type DrawerEstado = 'Pendiente' | 'Llego' | 'Cancelado';

export interface DrawerAppointmentRow {
  id: number;
  hora: string;       // HH:MM
  paciente: string;
  estado: DrawerEstado;
}

/**
 * Proyecta los appointments del dia con el estado UI derivado del cruce
 * con la cola actual. Reglas:
 *   - status=CANCELED -> 'Cancelado'
 *   - existe QueueEntry con appointmentId == apt.id -> 'Llego'
 *   - resto -> 'Pendiente'
 *
 * Orden: hora asc, con cancelados al final (independiente de la hora).
 */
export const selectScheduledAppointmentsForDrawer = createSelector(
  selectTodayAppointments,
  selectQueueState,
  (appointments: Appointment[], queueState): DrawerAppointmentRow[] => {
    const arrivedIds = new Set(
      queueState.entries
        .map(e => (e as QueueEntry & { appointmentId?: number | null }).appointmentId)
        .filter((id): id is number => typeof id === 'number'),
    );

    const rows: DrawerAppointmentRow[] = appointments.map(a => ({
      id: a.id,
      hora: a.appointmentTime.slice(11, 16),  // HH:MM del ISO 2026-06-02T09:00:00Z
      paciente: a.patientName,
      estado: deriveEstado(a, arrivedIds),
    }));

    return rows.sort((a, b) => {
      if (a.estado === 'Cancelado' && b.estado !== 'Cancelado') return 1;
      if (a.estado !== 'Cancelado' && b.estado === 'Cancelado') return -1;
      return a.hora.localeCompare(b.hora);
    });
  },
);

function deriveEstado(a: Appointment, arrivedIds: Set<number>): DrawerEstado {
  if (a.status === 'CANCELED') return 'Cancelado';
  if (arrivedIds.has(a.id)) return 'Llego';
  return 'Pendiente';
}
```

- [ ] **Step 5: Correr tests y verificar que pasan**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng test --watch=false --include='**/appointments.derived.selectors.spec.ts'`
Expected: PASS — 5 tests verdes.

- [ ] **Step 6: Commit**

```bash
git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO add src/app/features/turnos/store/appointments/appointments.derived.selectors.ts src/app/features/turnos/store/appointments/appointments.derived.selectors.spec.ts src/app/features/turnos/models/queue-entry.model.ts
git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO commit -m "feat(turnos): selector derivado de scheduled appointments para drawer (KAN-73)

Combina el state de appointments del dia con el state de queue para
proyectar cada turno con estado UI: Pendiente / Llego / Cancelado. La
regla 'Llego' detecta si existe QueueEntry con appointmentId == apt.id
en la cola actual. Orden: hora asc, cancelados al final.

Tambien expone appointmentId en el modelo QueueEntry (era necesario
para el cruce y el backend ya lo manda).

Refs KAN-73."
```

---

## Task 8: Crear `ScheduledAppointmentsDrawerComponent`

Componente standalone que renderiza el `p-drawer` con los turnos del día. Carga al abrirse (input `visible`) y expone un botón refresh manual. No mantiene estado interno de visibilidad — el padre lo controla.

**Files:**
- Create: `src/app/features/turnos/components/scheduled-appointments-drawer.component.ts`
- Create: `src/app/features/turnos/components/scheduled-appointments-drawer.component.spec.ts`

- [ ] **Step 1: Crear el componente**

Crear `src/app/features/turnos/components/scheduled-appointments-drawer.component.ts`:

```typescript
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { loadTodayAppointments } from '../store/appointments/appointments.actions';
import {
  DrawerAppointmentRow,
  selectScheduledAppointmentsForDrawer,
} from '../store/appointments/appointments.derived.selectors';
import { selectAppointmentsLoading } from '../store/appointments/appointments.selectors';
import { OperatorBranchContextService } from '../services/operator-branch.context';

@Component({
  selector: 'app-scheduled-appointments-drawer',
  standalone: true,
  imports: [DrawerModule, ButtonModule, TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-drawer
      [visible]="visible()"
      (visibleChange)="visibleChange.emit($event)"
      position="right"
      header="Turnos del día"
      styleClass="ui-scheduled-drawer">
      <ng-template pTemplate="header">
        <div class="drawer-header">
          <span class="drawer-title">Turnos del día</span>
          <p-button
            icon="pi pi-refresh"
            severity="secondary"
            [text]="true"
            [rounded]="true"
            (onClick)="onRefresh()"
            ariaLabel="Refrescar" />
        </div>
      </ng-template>

      @if (loading()) {
        <div class="drawer-loading">Cargando turnos…</div>
      } @else if (rows().length === 0) {
        <div class="drawer-empty">No hay turnos programados para hoy.</div>
      } @else {
        <ul class="drawer-list">
          @for (row of rows(); track row.id) {
            <li class="drawer-row" [class.row-cancelado]="row.estado === 'Cancelado'">
              <span class="row-hora">{{ row.hora }}</span>
              <span class="row-paciente">{{ row.paciente }}</span>
              <p-tag
                [value]="row.estado"
                [severity]="estadoSeverity(row.estado)"
                styleClass="row-estado" />
            </li>
          }
        </ul>
      }
    </p-drawer>
  `,
  styles: [`
    :host ::ng-deep .ui-scheduled-drawer { width: 320px; }

    .drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    }
    .drawer-title { font-weight: 600; font-size: 1rem; }

    .drawer-loading,
    .drawer-empty {
      padding: 1rem;
      color: var(--ds-text-muted, #64748b);
      font-size: 0.875rem;
    }

    .drawer-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .drawer-row {
      display: grid;
      grid-template-columns: 56px 1fr auto;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid var(--ds-border, #e2e8f0);
      font-size: 0.875rem;
    }
    .drawer-row.row-cancelado {
      opacity: 0.6;
    }
    .row-hora {
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .row-paciente {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `],
})
export class ScheduledAppointmentsDrawerComponent {
  private store = inject(Store);
  private branchContext = inject(OperatorBranchContextService);

  readonly visible = input.required<boolean>();
  readonly visibleChange = output<boolean>();

  protected rows = this.store.selectSignal(selectScheduledAppointmentsForDrawer);
  protected loading = this.store.selectSignal(selectAppointmentsLoading);

  constructor() {
    // Carga snapshot la primera vez que el drawer pasa a visible.
    effect(() => {
      if (this.visible()) {
        this.dispatchLoad();
      }
    });
  }

  protected onRefresh(): void {
    this.dispatchLoad();
  }

  protected estadoSeverity(estado: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (estado) {
      case 'Llego': return 'success';
      case 'Pendiente': return 'info';
      case 'Cancelado': return 'danger';
      default: return 'secondary';
    }
  }

  private dispatchLoad(): void {
    const branchId = this.branchContext.branchId();
    if (branchId == null) return;
    this.store.dispatch(loadTodayAppointments({ branchId }));
  }
}
```

- [ ] **Step 2: Smoke test del componente**

Crear `src/app/features/turnos/components/scheduled-appointments-drawer.component.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { ScheduledAppointmentsDrawerComponent } from './scheduled-appointments-drawer.component';
import { OperatorBranchContextService } from '../services/operator-branch.context';
import { loadTodayAppointments } from '../store/appointments/appointments.actions';

describe('ScheduledAppointmentsDrawerComponent', () => {
  let store: MockStore;
  const branchSig = signal<number | null>(5);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideMockStore({
          initialState: {
            appointments: { todayByBranch: [], loading: false, error: null },
            queue: { entries: [], loading: false, callingId: null, error: null },
          },
        }),
        {
          provide: OperatorBranchContextService,
          useValue: { branchId: branchSig.asReadonly() },
        },
      ],
    });
    store = TestBed.inject(MockStore);
    vi.spyOn(store, 'dispatch');
  });

  it('despacha loadTodayAppointments la primera vez que visible=true', () => {
    const fixture = TestBed.createComponent(ScheduledAppointmentsDrawerComponent);
    fixture.componentRef.setInput('visible', false);
    fixture.detectChanges();
    expect(store.dispatch).not.toHaveBeenCalled();

    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    expect(store.dispatch).toHaveBeenCalledWith(loadTodayAppointments({ branchId: 5 }));
  });

  it('refresh button despacha loadTodayAppointments de nuevo', () => {
    const fixture = TestBed.createComponent(ScheduledAppointmentsDrawerComponent);
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    (store.dispatch as ReturnType<typeof vi.fn>).mockClear();

    const refreshBtn = fixture.nativeElement.querySelector('button[aria-label="Refrescar"]') as HTMLButtonElement;
    refreshBtn.click();
    expect(store.dispatch).toHaveBeenCalledWith(loadTodayAppointments({ branchId: 5 }));
  });

  it('no despacha si no hay branchId en el context', () => {
    branchSig.set(null);
    const fixture = TestBed.createComponent(ScheduledAppointmentsDrawerComponent);
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    expect(store.dispatch).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Correr el smoke test**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng test --watch=false --include='**/scheduled-appointments-drawer.component.spec.ts'`
Expected: PASS — 3 tests verdes. Si `p-drawer` falla por DOM (a veces los components de PrimeNG con animaciones requieren `BrowserAnimationsModule`), agregar al providers del beforeEach: `provideAnimationsAsync()` (importar de `@angular/platform-browser/animations/async`).

- [ ] **Step 4: Commit**

```bash
git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO add src/app/features/turnos/components/scheduled-appointments-drawer.component.ts src/app/features/turnos/components/scheduled-appointments-drawer.component.spec.ts
git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO commit -m "feat(turnos): drawer de turnos programados del dia (KAN-73)

p-drawer position=right con lista Hora + Paciente + Estado (Pendiente
/ Llego / Cancelado). Carga snapshot la primera vez que pasa a visible
+ boton refresh manual. Usa el feature appointments existente y el
selector derivado scheduledAppointmentsForDrawer.

Refs KAN-73."
```

---

## Task 9: Integrar el drawer en `RecepcionConTotemComponent` con botón toggle

Agrega el botón "Turnos del día" en el header de la pantalla de Recepción y wirea el drawer con un signal `drawerOpen`.

**Files:**
- Modify: `src/app/features/turnos/pages/recepcion/recepcion-con-totem.component.ts`
- Modify: `src/app/features/turnos/pages/recepcion/recepcion-con-totem.component.html`

- [ ] **Step 1: Actualizar el .ts**

Modificar `src/app/features/turnos/pages/recepcion/recepcion-con-totem.component.ts`:

a) Agregar imports:

```typescript
import { signal } from '@angular/core';
import { ScheduledAppointmentsDrawerComponent } from '../../components/scheduled-appointments-drawer.component';
```

b) Agregar `ScheduledAppointmentsDrawerComponent` y `ButtonModule` a los `imports` del `@Component` (si `ButtonModule` no está, agregalo):

```typescript
imports: [TableModule, ButtonModule, CardModule, QueueRowActionsComponent, ScheduledAppointmentsDrawerComponent],
```

c) Agregar la señal y métodos en la clase (después de `protected hasBranch = ...`):

```typescript
  protected drawerOpen = signal(false);

  protected toggleDrawer(): void {
    this.drawerOpen.update(v => !v);
  }

  protected onDrawerVisibleChange(visible: boolean): void {
    this.drawerOpen.set(visible);
  }
```

- [ ] **Step 2: Actualizar el .html**

Modificar `src/app/features/turnos/pages/recepcion/recepcion-con-totem.component.html` — al inicio del archivo (antes del `<p-card>`), agregar el header con botón:

```html
<div class="recepcion-toolbar">
  <p-button
    icon="pi pi-calendar"
    label="Turnos del día"
    severity="secondary"
    [outlined]="true"
    size="small"
    (onClick)="toggleDrawer()" />
</div>

<p-card header="Cola de espera">
  ...  <!-- lo que ya estaba -->
</p-card>

<app-scheduled-appointments-drawer
  [visible]="drawerOpen()"
  (visibleChange)="onDrawerVisibleChange($event)" />
```

- [ ] **Step 3: Actualizar el .scss**

Modificar `src/app/features/turnos/pages/recepcion/recepcion-con-totem.component.scss` — agregar al inicio:

```scss
.recepcion-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.75rem;
}
```

- [ ] **Step 4: Build check**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng build`
Expected: build OK.

- [ ] **Step 5: Smoke test rápido del componente (opcional, si hay tiempo)**

Si no existe `recepcion-con-totem.component.spec.ts`, crearlo con un smoke mínimo:

```typescript
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideMockStore } from '@ngrx/store/testing';
import { provideRouter } from '@angular/router';
import { RecepcionConTotemComponent } from './recepcion-con-totem.component';
import { OperatorBranchContextService } from '../../services/operator-branch.context';
import { QueueStatus } from '../../models/queue-status.enum';

describe('RecepcionConTotemComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideMockStore({
          initialState: {
            queue: {
              entries: [
                { id: 1, publicCode: 'CT-0001', nationalId: '123', patientId: null, branchId: 1, appointmentId: 10, hasAppointment: true, status: QueueStatus.PENDING, lastCalledAt: null, callCount: 0, createdAt: '2026-06-02T09:00:00Z' },
                { id: 2, publicCode: 'ST-0001', nationalId: '', patientId: null, branchId: 1, appointmentId: null, hasAppointment: false, status: QueueStatus.PENDING, lastCalledAt: null, callCount: 0, createdAt: '2026-06-02T09:10:00Z' },
              ],
              loading: false, callingId: null, error: null,
            },
            appointments: { todayByBranch: [], loading: false, error: null },
          },
        }),
        {
          provide: OperatorBranchContextService,
          useValue: { branchId: signal<number | null>(1).asReadonly() },
        },
      ],
    });
  });

  it('renderiza una fila CT y una ST', () => {
    const fixture = TestBed.createComponent(RecepcionConTotemComponent);
    fixture.detectChanges();
    const html = fixture.nativeElement.innerHTML as string;
    expect(html).toContain('CT-0001');
    expect(html).toContain('ST-0001');
  });

  it('aplica la clase row-st a la fila ST', () => {
    const fixture = TestBed.createComponent(RecepcionConTotemComponent);
    fixture.detectChanges();
    const stRow = fixture.nativeElement.querySelector('tr.row-st');
    expect(stRow).not.toBeNull();
    expect(stRow.textContent).toContain('ST-0001');
  });
});
```

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng test --watch=false --include='**/recepcion-con-totem.component.spec.ts'`
Expected: PASS — 2 tests verdes.

- [ ] **Step 6: Commit**

```bash
git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO add src/app/features/turnos/pages/recepcion/recepcion-con-totem.component.ts src/app/features/turnos/pages/recepcion/recepcion-con-totem.component.html src/app/features/turnos/pages/recepcion/recepcion-con-totem.component.scss src/app/features/turnos/pages/recepcion/recepcion-con-totem.component.spec.ts
git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO commit -m "feat(turnos): integrar drawer de turnos en recepcion con-totem (KAN-73)

Boton 'Turnos del dia' en el header de la pantalla abre/cierra el
drawer. Signal drawerOpen controla la visibilidad. Smoke test del
componente verifica que las filas CT/ST renderizan y que la clase
row-st se aplica solo a las filas sin turno.

Refs KAN-73."
```

---

## Task 10: Smoke run final + push del branch

Validación end-to-end + push para que la PR esté lista cuando el sub-proyecto se termine.

**Files:** ninguno.

- [ ] **Step 1: Correr suite completa**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng test --watch=false`
Expected: todos los tests nuevos pasan. Los pre-existing fails documentados en memory siguen igual (no son regresión).

- [ ] **Step 2: Build de producción**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng build`
Expected: build OK, sin nuevos warnings de TypeScript.

- [ ] **Step 3: Verificar git status**

Run: `git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO status -sb`
Expected: working tree clean en la branch `feat/KAN-73-recepcion-branch-context`, 9 commits ahead de origin (Tasks 1-9).

Run: `git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO log --oneline development..HEAD`
Expected: lista de commits desde el spec (Task 0 — ya commiteado) + Tasks 1-9.

- [ ] **Step 4: Smoke manual contra dev server**

Si hay dev server corriendo (`npm run start -- --port 4250` u otro libre):

a) Login con cuenta admin.
b) Verificar topbar muestra "Sucursal: <nombre>" en lugar de "Sin sucursal".
c) Navegar a `/turnos/recepcion`.
d) Verificar **una sola tabla** con filas CT y ST mezcladas.
e) Verificar que las filas ST tienen un fondo apenas distinto.
f) Click en "Turnos del día" → drawer abre desde la derecha.
g) Verificar lista con `Hora · Paciente · [Estado]`.
h) Click en refresh del drawer → re-fetcha (debería ver loading o cambio en el array).
i) Cerrar drawer → desaparece.

Si algo no funciona, NO commitear quick fixes — anotar y volver a la task que corresponda.

- [ ] **Step 5: Push del branch**

Run: `git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO push -u origin feat/KAN-73-recepcion-branch-context`

Expected: branch publicada en origin. El sistema puede pedir confirmación (gh / git push están en `ask` rules — aprobá).

- [ ] **Step 6: NO crear PR todavía**

La PR la crea el operador cuando esté listo, después de smoke manual con el equipo. El plan termina con el branch pusheado.

---

## Self-review (post-write)

**Spec coverage:**
- ✅ Lista única combinada → Tasks 4 + 6
- ✅ Distinguidor CT/ST color sutil → Task 6 (scss `.row-st`)
- ✅ Drawer togglable sin persistencia → Tasks 8 + 9
- ✅ Carga snapshot + botón refresh → Task 8 (`effect` en visible=true + botón)
- ✅ Cancelados visibles con badge → Task 7 (selector) + Task 8 (`p-tag` severity danger)
- ✅ Click drawer = no-op → Task 8 (no hay handler `onRowClick`)
- ✅ Badge sucursal read-only + tooltip → Task 2
- ✅ Filtro automático por sucursal → Task 5 (effect lee context)
- ✅ Fallback temporal primera sucursal → Task 3 (BranchBootstrapService)
- ✅ Tests selectors → Tasks 4, 7
- ✅ Tests effects → Tasks 3, 5
- ✅ Tests smoke componentes → Tasks 2, 8, 9
- ✅ Sin cambios de backend → ningún task toca `Backend/`

**Placeholders:** revisado — no hay TBD, todos los pasos tienen código completo o comandos exactos. La excepción es Task 6 Step 4 ("buscar `[branchId]="branchId"` y reemplazar") que requiere mirar el template real porque no lo leí entero — está OK porque es una sustitución mecánica.

**Type consistency:** `setBranch(id, name)` en Task 1 ↔ usado en Task 3. `selectQueueEntriesAll` definido en Task 4 ↔ consumido en Task 6. `DrawerAppointmentRow` definido en Task 7 ↔ consumido en Task 8. `loadTodayAppointments` ya existente ↔ usado en Task 8. Sin inconsistencias.

**Dependencias entre tasks:**
- Task 2 depende de Task 1 (`branchName` signal)
- Task 3 depende de Task 1 (`setBranch` method)
- Task 5 depende de Task 1 (lee del context)
- Task 6 depende de Tasks 1, 4, 5
- Task 7 depende del modelo `QueueEntry` con `appointmentId` (Task 7 Step 2 lo agrega si falta)
- Task 8 depende de Task 7
- Task 9 depende de Tasks 6 y 8

Orden propuesto (1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10) respeta las dependencias.

---

## Execution Handoff

Plan completo y guardado en `docs/superpowers/plans/2026-06-02-recepcion-branch-context.md`. Dos opciones de ejecución:

**1. Subagent-Driven (recomendado para este plan)** — Dispatch un subagent fresco por task, review entre tasks, iteración rápida. Bueno porque las 9 tasks son ortogonales en su core (cada una toca files distintos en la mayoría de casos) y un subagent puede ejecutar cada una self-contained.

**2. Inline Execution** — Ejecutar tasks en esta sesión con executing-plans, batch con checkpoints. Bueno si querés ir paso a paso con el user mirando todo.

¿Cuál preferís?

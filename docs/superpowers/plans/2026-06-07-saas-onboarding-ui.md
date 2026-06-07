# SaaS Onboarding UI — Implementation Plan

> **Jira:** [KAN-88](https://exequielsantoro.atlassian.net/browse/KAN-88)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Arreglar los 2 baches del wizard de creación de tenants: mandar los 7 campos que exige el BE y mostrar el token de primer login del admin en un modal compartible.

**Architecture:** Ampliar el modelo y el servicio para incluir los campos del owner y la respuesta completa. Extender el Paso 1 del wizard con un sub-bloque "Administrador inicial" (create mode only). Mostrar el token en un modal overlay inline post-creación con link `/first-login?token=…` copiable. Agregar soporte de query param `?token=` a `FirstLoginComponent`.

**Tech Stack:** Angular 21, standalone components, OnPush, signals, NgRx clásico (actions/effects/reducer/selectors), PrimeNG, Tailwind, vitest (`npx vitest run`) para store/service specs, `ng test --watch=false` para component specs.

---

## File map

| Archivo | Cambio |
|---|---|
| `src/app/features/saas-admin/models/tenant.model.ts` | Ampliar `CreateTenantRequest` + agregar `CreateTenantResponse` |
| `src/app/features/saas-admin/services/saas-admin-api.service.ts` | Tipo retorno de `createTenant` → `Promise<CreateTenantResponse>` |
| `src/app/features/saas-admin/store/saas-admin.actions.ts` | `createTenantSuccess` con `CreateTenantResponse` |
| `src/app/features/saas-admin/pages/tenant-wizard/tenant-wizard.page.ts` | `ownerForm`, signals, modal, template Step 1, `submitStep1` |
| `src/app/features/auth/pages/first-login/first-login.component.ts` | Leer token desde `?token=` query param (aditivo) |
| `src/app/features/saas-admin/services/saas-admin-api.service.spec.ts` | Actualizar test `POST /tenants` (7 campos + token en response) |
| `src/app/features/saas-admin/store/saas-admin.effects.spec.ts` | Actualizar mocks `createTenant$` (7 campos en req + token en response) |
| `src/app/features/saas-admin/store/saas-admin.reducer.spec.ts` | Actualizar mock `createTenantSuccess` (agregar `ownerFirstLoginToken`) |
| `src/app/features/saas-admin/pages/tenant-wizard/tenant-wizard.page.spec.ts` | CREAR — smoke tests del wizard |
| `src/app/features/auth/pages/first-login/first-login.component.spec.ts` | Agregar caso: token desde query param |

---

## Task 1: Extender el modelo de tenant

**Files:**
- Modify: `src/app/features/saas-admin/models/tenant.model.ts`

- [ ] **Step 1: Reemplazar el contenido del modelo**

```typescript
// src/app/features/saas-admin/models/tenant.model.ts
export type TenantStatus = 'ACTIVE' | 'INACTIVE';

export interface Tenant {
  id: number;
  code: string;
  name: string;
  status: TenantStatus;
  active: boolean;
  deletedAt: string | null;
}

export interface CreateTenantRequest {
  code: string;
  name: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string;
  ownerDocument: string;
  ownerUsername: string;
}

export interface CreateTenantResponse extends Tenant {
  ownerFirstLoginToken: string;
}

export interface UpdateTenantRequest {
  name: string;
}
```

- [ ] **Step 2: Verificar compilación**

```bash
cd src/app/features/saas-admin/models
npx tsc --noEmit 2>&1 | head -40
```

Los errores de tipo en service y actions son esperados — los resolvemos en los próximos tasks. Si hay errores en archivos NO relacionados con `createTenant`, investigar.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/saas-admin/models/tenant.model.ts
git commit -m "feat(saas-admin): ampliar CreateTenantRequest con campos del owner + CreateTenantResponse"
```

---

## Task 2: Actualizar el servicio (TDD)

**Files:**
- Modify: `src/app/features/saas-admin/services/saas-admin-api.service.spec.ts`
- Modify: `src/app/features/saas-admin/services/saas-admin-api.service.ts`

- [ ] **Step 1: Actualizar el test `POST /tenants` en el spec del servicio**

Reemplazar el test `'POST /tenants'` (líneas 31-38) con:

```typescript
it('POST /tenants manda los 7 campos y tipa la respuesta con ownerFirstLoginToken', () => {
  const req_body = {
    code: 'lab-x', name: 'Lab X',
    ownerFirstName: 'Juan', ownerLastName: 'García',
    ownerEmail: 'juan@lab.com', ownerDocument: '28345678', ownerUsername: 'jgarcia',
  };
  const p = service.createTenant(req_body);
  const req = http.expectOne(`${BASE}/tenants`);
  expect(req.request.method).toBe('POST');
  expect(req.request.body).toEqual(req_body);
  const response = {
    id: 1, code: 'lab-x', name: 'Lab X', status: 'ACTIVE', active: true, deletedAt: null,
    ownerFirstLoginToken: 'tok-abc123',
  };
  req.flush(response);
  return p.then((res) => {
    expect(res.ownerFirstLoginToken).toBe('tok-abc123');
  });
});
```

- [ ] **Step 2: Ejecutar para confirmar falla**

```bash
npx vitest run src/app/features/saas-admin/services/saas-admin-api.service.spec.ts
```

Esperado: FAIL — el test actual solo manda `{ code, name }` sin los campos del owner.

- [ ] **Step 3: Actualizar el servicio**

En `saas-admin-api.service.ts`, cambiar el import y el tipo de retorno de `createTenant`:

```typescript
import { CreateTenantRequest, CreateTenantResponse, Tenant, UpdateTenantRequest } from '../models/tenant.model';
```

```typescript
createTenant(req: CreateTenantRequest): Promise<CreateTenantResponse> {
  return firstValueFrom(this.http.post<CreateTenantResponse>(`${BASE}/tenants`, req));
}
```

- [ ] **Step 4: Ejecutar para confirmar que pasa**

```bash
npx vitest run src/app/features/saas-admin/services/saas-admin-api.service.spec.ts
```

Esperado: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/features/saas-admin/services/saas-admin-api.service.ts \
        src/app/features/saas-admin/services/saas-admin-api.service.spec.ts
git commit -m "feat(saas-admin): createTenant manda 7 campos y retorna CreateTenantResponse"
```

---

## Task 3: Actualizar la action `createTenantSuccess`

**Files:**
- Modify: `src/app/features/saas-admin/store/saas-admin.actions.ts`

- [ ] **Step 1: Actualizar el import y el tipo de `createTenantSuccess`**

En `saas-admin.actions.ts`, agregar `CreateTenantResponse` al import:

```typescript
import { Tenant, CreateTenantRequest, CreateTenantResponse, UpdateTenantRequest } from '../models/tenant.model';
```

Cambiar la acción `createTenantSuccess` (línea 21):

```typescript
export const createTenantSuccess = createAction(
  '[SaaS Admin API] Create Tenant Success',
  props<{ tenant: CreateTenantResponse }>(),
);
```

- [ ] **Step 2: Verificar compilación del feature completo**

```bash
npx tsc --noEmit 2>&1 | grep "saas-admin" | head -20
```

Esperado: sin errores en `saas-admin/**`. Puede haber advertencias en el wizard (lo arreglamos en Task 6).

- [ ] **Step 3: Commit**

```bash
git add src/app/features/saas-admin/store/saas-admin.actions.ts
git commit -m "feat(saas-admin): createTenantSuccess usa CreateTenantResponse"
```

---

## Task 4: Actualizar specs de effects y reducer

**Files:**
- Modify: `src/app/features/saas-admin/store/saas-admin.effects.spec.ts`
- Modify: `src/app/features/saas-admin/store/saas-admin.reducer.spec.ts`

Los effects y reducer no necesitan cambios en su lógica — solo los specs necesitan mocks actualizados para satisfacer los tipos.

- [ ] **Step 1: Actualizar effects.spec.ts — test de createTenant$**

Reemplazar el test `'createTenant$ → createTenantSuccess with the created tenant'` (líneas 52-58):

```typescript
it('createTenant$ → createTenantSuccess con CreateTenantResponse', async () => {
  const created = {
    id: 2, code: 'x', name: 'X', status: 'ACTIVE' as const, active: true, deletedAt: null,
    ownerFirstLoginToken: 'tok-xyz',
  };
  api.createTenant!.mockResolvedValue(created);
  actions$.next(A.createTenant({
    req: {
      code: 'x', name: 'X',
      ownerFirstName: 'Ana', ownerLastName: 'López',
      ownerEmail: 'ana@lab.com', ownerDocument: '30111222', ownerUsername: 'alopez',
    },
  }));
  const out = await expectEmits(effects.createTenant$);
  expect(out).toEqual(A.createTenantSuccess({ tenant: created }));
});
```

Reemplazar el test `'createTenant$ emits createTenantFailure on rejection'` (líneas 74-79):

```typescript
it('createTenant$ emite createTenantFailure cuando el servicio rechaza', async () => {
  api.createTenant!.mockRejectedValue({ status: 409 });
  actions$.next(A.createTenant({
    req: {
      code: 'x', name: 'X',
      ownerFirstName: 'Ana', ownerLastName: 'López',
      ownerEmail: 'ana@lab.com', ownerDocument: '30111222', ownerUsername: 'alopez',
    },
  }));
  const out = await expectEmits(effects.createTenant$);
  expect(out.type).toBe(A.createTenantFailure.type);
});
```

- [ ] **Step 2: Actualizar reducer.spec.ts — test de createTenantSuccess**

Reemplazar el test `'createTenantSuccess prepends to list'` (líneas 25-29):

```typescript
it('createTenantSuccess prepends to list', () => {
  const t1 = sampleTenant({ id: 1 });
  const t2 = { ...sampleTenant({ id: 2, code: 'b', name: 'B' }), ownerFirstLoginToken: 'tok-abc' };
  const next = saasAdminReducer(
    { ...initialSaasAdminState, tenants: [t1] },
    A.createTenantSuccess({ tenant: t2 }),
  );
  expect(next.tenants[0]).toMatchObject({ id: 2, code: 'b', name: 'B' });
  expect(next.tenants[1]).toMatchObject({ id: 1, code: 'demo' });
});
```

- [ ] **Step 3: Ejecutar specs de store**

```bash
npx vitest run src/app/features/saas-admin/store/saas-admin.effects.spec.ts src/app/features/saas-admin/store/saas-admin.reducer.spec.ts
```

Esperado: todos PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/features/saas-admin/store/saas-admin.effects.spec.ts \
        src/app/features/saas-admin/store/saas-admin.reducer.spec.ts
git commit -m "test(saas-admin): actualizar mocks de effects y reducer para CreateTenantResponse"
```

---

## Task 5: Crear spec del wizard (tests en rojo)

**Files:**
- Create: `src/app/features/saas-admin/pages/tenant-wizard/tenant-wizard.page.spec.ts`

- [ ] **Step 1: Crear el archivo de spec**

```typescript
// src/app/features/saas-admin/pages/tenant-wizard/tenant-wizard.page.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { vi } from 'vitest';
import { TenantWizardPage } from './tenant-wizard.page';
import { createTenantSuccess } from '../../store/saas-admin.actions';
import { CreateTenantResponse } from '../../models/tenant.model';
import { SAAS_ADMIN_FEATURE_KEY, initialSaasAdminState } from '../../store/saas-admin.state';

const MOCK_TENANT: CreateTenantResponse = {
  id: 1, code: 'lab-x', name: 'Lab X',
  status: 'ACTIVE', active: true, deletedAt: null,
  ownerFirstLoginToken: 'tok-abc123',
};

describe('TenantWizardPage', () => {
  let fixture: ComponentFixture<TenantWizardPage>;
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantWizardPage],
      providers: [
        provideMockStore({
          initialState: { [SAAS_ADMIN_FEATURE_KEY]: initialSaasAdminState },
        }),
        provideRouter([]),
      ],
    }).compileComponents();
    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(TenantWizardPage);
  });

  describe('create mode (sin id)', () => {
    it('Step 1 muestra el bloque de administrador inicial', () => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.wizard-owner-section')).toBeTruthy();
    });

    it('muestra el modal de token tras createTenantSuccess', () => {
      fixture.detectChanges();
      store.dispatch(createTenantSuccess({ tenant: MOCK_TENANT }));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.token-modal')).toBeTruthy();
    });

    it('el modal contiene el token en el texto del link', () => {
      fixture.detectChanges();
      store.dispatch(createTenantSuccess({ tenant: MOCK_TENANT }));
      fixture.detectChanges();
      const modal = fixture.nativeElement.querySelector('.token-modal') as HTMLElement;
      expect(modal.textContent).toContain('tok-abc123');
    });

    it('botón copiar link escribe el link correcto al portapapeles', () => {
      const writeTextSpy = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextSpy },
        configurable: true,
      });
      fixture.detectChanges();
      store.dispatch(createTenantSuccess({ tenant: MOCK_TENANT }));
      fixture.detectChanges();

      const copyLinkWrapper = fixture.nativeElement.querySelector('[data-testid="copy-link-btn"]') as HTMLElement;
      copyLinkWrapper.querySelector<HTMLButtonElement>('button')!.click();

      expect(writeTextSpy).toHaveBeenCalledWith(expect.stringContaining('tok-abc123'));
      expect(writeTextSpy).toHaveBeenCalledWith(expect.stringContaining('/first-login?token='));
    });

    it('botón continuar cierra el modal y muestra el paso 2', () => {
      fixture.detectChanges();
      store.dispatch(createTenantSuccess({ tenant: MOCK_TENANT }));
      fixture.detectChanges();

      const continueWrapper = fixture.nativeElement.querySelector('[data-testid="continue-btn"]') as HTMLElement;
      continueWrapper.querySelector<HTMLButtonElement>('button')!.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.token-modal')).toBeNull();
      expect(fixture.nativeElement.querySelector('.wizard-modules')).toBeTruthy();
    });
  });

  describe('edit mode (con id)', () => {
    it('Step 1 no muestra el bloque de administrador inicial', () => {
      fixture.componentRef.setInput('id', '5');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.wizard-owner-section')).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Ejecutar para confirmar que fallan**

```bash
ng test --watch=false --include="**/tenant-wizard.page.spec.ts"
```

Esperado: FAIL — `wizard-owner-section` no existe en el template todavía.

---

## Task 6: Implementar los cambios del wizard

**Files:**
- Modify: `src/app/features/saas-admin/pages/tenant-wizard/tenant-wizard.page.ts`

- [ ] **Step 1: Verificar imports — no se necesita cambio**

El wizard no importa tipos de modelo directamente: usa las actions, y el tipo `CreateTenantResponse` fluye desde la tipificación de `createTenantSuccess`. TypeScript infiere el tipo de `tenant` en el subscribe sin ningún import adicional en el wizard.

Confirmar que los imports de actions ya incluyen `createTenantSuccess` (están en las líneas ~17-23). No agregar nada.

- [ ] **Step 2: Agregar las signals nuevas y el `ownerForm` al componente**

Después de la línea `protected readonly pendingNav = signal<Step | null>(null);` (línea ~281), agregar:

```typescript
protected readonly firstLoginToken = signal<string | null>(null);
protected readonly showTokenModal = signal(false);
protected readonly firstLoginLink = computed(() => {
  const token = this.firstLoginToken();
  if (!token) return '';
  return `${window.location.origin}/first-login?token=${encodeURIComponent(token)}`;
});
```

- [ ] **Step 3: Agregar `ownerForm` después de `wlForm`**

Después del bloque que define `wlForm` (línea ~306-312), agregar:

```typescript
protected readonly ownerForm = this.fb.nonNullable.group({
  ownerFirstName: ['', Validators.required],
  ownerLastName:  ['', Validators.required],
  ownerEmail:     ['', [Validators.required, Validators.email]],
  ownerDocument:  ['', Validators.required],
  ownerUsername:  ['', Validators.required],
});
```

- [ ] **Step 4: Agregar métodos auxiliares del modal**

Antes del cierre de la clase (antes del último `}`), agregar:

```typescript
protected copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text);
}

protected closeTokenModal(): void {
  this.showTokenModal.set(false);
  this.step.set(2);
}
```

- [ ] **Step 5: Actualizar el subscribe de `createTenantSuccess` en el constructor**

Reemplazar el bloque existente (líneas ~343-350):

```typescript
// ANTES:
this.actions$
  .pipe(ofType(createTenantSuccess), takeUntilDestroyed())
  .subscribe(({ tenant }) => {
    this.createdTenantId.set(tenant.id);
    this.wlForm.patchValue({ systemName: tenant.name });
    this.errorMessage.set(null);
    this.step.set(2);
  });

// DESPUÉS:
this.actions$
  .pipe(ofType(createTenantSuccess), takeUntilDestroyed())
  .subscribe(({ tenant }) => {
    this.createdTenantId.set(tenant.id);
    this.firstLoginToken.set(tenant.ownerFirstLoginToken);
    this.wlForm.patchValue({ systemName: tenant.name });
    this.errorMessage.set(null);
    this.showTokenModal.set(true);
  });
```

- [ ] **Step 6: Actualizar `submitStep1` para incluir los campos del owner**

Reemplazar el método `submitStep1` completo (líneas ~484-501):

```typescript
protected submitStep1(): void {
  if (this.infoForm.invalid) return;
  this.errorMessage.set(null);
  const raw = this.infoForm.getRawValue();
  if (this.mode() === 'create') {
    if (this.ownerForm.invalid) return;
    const ownerRaw = this.ownerForm.getRawValue();
    this.store.dispatch(createTenant({ req: { ...raw, ...ownerRaw } }));
  } else {
    const id = this.workingTenantId();
    if (id == null) return;
    const currentName = this.tenant()?.name;
    if (raw.name !== currentName) {
      this.store.dispatch(renameTenant({ id, req: { name: raw.name } }));
    } else {
      this.step.set(2);
    }
  }
}
```

- [ ] **Step 7: Actualizar el template del Step 1 — agregar bloque del admin**

En el template, dentro del `@if (step() === 1)`, después del campo "Nombre" y antes de `<div class="wizard-actions">`, agregar:

```html
@if (mode() === 'create') {
  <div class="wizard-owner-section" [formGroup]="ownerForm">
    <div class="wizard-owner-divider"><span>Administrador inicial</span></div>
    <div class="wizard-row">
      <label class="wizard-field">
        <span>Nombre</span>
        <input pInputText formControlName="ownerFirstName" placeholder="Juan" />
        @if (ownerForm.get('ownerFirstName')?.touched && ownerForm.get('ownerFirstName')?.errors?.['required']) {
          <small class="wizard-field-error">Requerido.</small>
        }
      </label>
      <label class="wizard-field">
        <span>Apellido</span>
        <input pInputText formControlName="ownerLastName" placeholder="García" />
        @if (ownerForm.get('ownerLastName')?.touched && ownerForm.get('ownerLastName')?.errors?.['required']) {
          <small class="wizard-field-error">Requerido.</small>
        }
      </label>
    </div>
    <label class="wizard-field">
      <span>Email</span>
      <input pInputText formControlName="ownerEmail" type="email" placeholder="admin@laboratorio.com" />
      @if (ownerForm.get('ownerEmail')?.touched) {
        @if (ownerForm.get('ownerEmail')?.errors?.['required']) {
          <small class="wizard-field-error">Requerido.</small>
        } @else if (ownerForm.get('ownerEmail')?.errors?.['email']) {
          <small class="wizard-field-error">Ingresá un email válido.</small>
        }
      }
    </label>
    <div class="wizard-row">
      <label class="wizard-field">
        <span>DNI</span>
        <input pInputText formControlName="ownerDocument" placeholder="28345678" />
        @if (ownerForm.get('ownerDocument')?.touched && ownerForm.get('ownerDocument')?.errors?.['required']) {
          <small class="wizard-field-error">Requerido.</small>
        }
      </label>
      <label class="wizard-field">
        <span>Usuario</span>
        <input pInputText formControlName="ownerUsername" placeholder="jgarcia" />
        @if (ownerForm.get('ownerUsername')?.touched && ownerForm.get('ownerUsername')?.errors?.['required']) {
          <small class="wizard-field-error">Requerido.</small>
        }
      </label>
    </div>
  </div>
}
```

- [ ] **Step 8: Actualizar el botón submit del Step 1**

Cambiar el `[disabled]` del botón de submit (líneas ~107-110) para incluir validación del ownerForm en create mode:

```html
<p-button [label]="mode() === 'edit' ? 'Guardar y siguiente' : 'Crear y continuar'"
          icon="pi pi-arrow-right" iconPos="right" type="submit"
          [loading]="pending()"
          [disabled]="infoForm.invalid || (mode() === 'create' && ownerForm.invalid) || pending()" />
```

- [ ] **Step 9: Agregar el modal de token al template**

Al inicio del `<main class="wizard-body">` (antes del `@if (errorMessage()...)`), agregar:

```html
@if (showTokenModal()) {
  <div class="token-modal-backdrop">
    <div class="token-modal">
      <div class="token-modal__header">
        <i class="pi pi-check-circle token-modal__icon"></i>
        <h2>Laboratorio creado correctamente</h2>
      </div>
      <div class="token-modal__section token-modal__section--primary">
        <span class="token-modal__label">Link de primer acceso del administrador</span>
        <code class="token-modal__value">{{ firstLoginLink() }}</code>
        <div data-testid="copy-link-btn">
          <p-button label="Copiar link" icon="pi pi-copy" [outlined]="true" severity="info"
                    (onClick)="copyToClipboard(firstLoginLink())" />
        </div>
      </div>
      <div class="token-modal__section">
        <span class="token-modal__label">Token (alternativa)</span>
        <code class="token-modal__value token-modal__value--muted">{{ firstLoginToken() }}</code>
        <p-button label="Copiar token" icon="pi pi-copy" severity="secondary" [outlined]="true" size="small"
                  (onClick)="copyToClipboard(firstLoginToken()!)" />
      </div>
      <p class="wizard-muted">Compartí el link con el administrador del laboratorio.</p>
      <div data-testid="continue-btn">
        <p-button label="Continuar a módulos" icon="pi pi-arrow-right" iconPos="right"
                  (onClick)="closeTokenModal()" />
      </div>
    </div>
  </div>
}
```

- [ ] **Step 10: Agregar estilos al array `styles`**

Al final del bloque de estilos existente (antes del cierre del backtick), agregar:

```css
.wizard-owner-section { margin-top: 16px; }
.wizard-owner-divider {
  display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
}
.wizard-owner-divider::before, .wizard-owner-divider::after {
  content: ''; flex: 1; height: 1px; background: rgba(255,255,255,.08);
}
.wizard-owner-divider span {
  color: var(--saas-text-on-card, #fde68a); font-size: 11px;
  text-transform: uppercase; letter-spacing: .06em; font-weight: 600; white-space: nowrap;
}

.token-modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,.6);
  display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px;
}
.token-modal {
  background: var(--saas-bg-card, #232447); border-radius: 12px;
  padding: 24px; max-width: 520px; width: 100%;
  border: 1px solid var(--saas-border, rgba(255,255,255,.08));
  display: flex; flex-direction: column; gap: 16px;
}
.token-modal__header { display: flex; align-items: center; gap: 10px; }
.token-modal__header h2 { margin: 0; font-size: 18px; color: var(--saas-text-on-card, #fde68a); }
.token-modal__icon { font-size: 22px; color: #4ade80; }
.token-modal__section {
  background: rgba(255,255,255,.06); border-radius: 8px; padding: 12px;
  display: flex; flex-direction: column; gap: 8px;
}
.token-modal__section--primary { border: 1px solid rgba(147,197,253,.2); }
.token-modal__label {
  font-size: 11px; text-transform: uppercase; letter-spacing: .04em;
  color: var(--saas-text-muted, #94a3b8);
}
.token-modal__value {
  font-family: monospace; font-size: 12px; word-break: break-all;
  color: #93c5fd; background: rgba(0,0,0,.2); padding: 6px 8px; border-radius: 4px; display: block;
}
.token-modal__value--muted { color: var(--saas-text, #e2e8f0); }
```

- [ ] **Step 11: Ejecutar los tests del wizard para confirmar que pasan**

```bash
ng test --watch=false --include="**/tenant-wizard.page.spec.ts"
```

Esperado: todos PASS

- [ ] **Step 12: Verificar compilación completa del feature**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -30
```

Esperado: 0 errores en archivos de `saas-admin/`.

- [ ] **Step 13: Commit**

```bash
git add src/app/features/saas-admin/pages/tenant-wizard/ \
        src/app/features/saas-admin/store/saas-admin.actions.ts
git commit -m "feat(saas-admin): wizard Step 1 con campos del admin + modal de token de primer login"
```

---

## Task 7: Extender `FirstLoginComponent` con soporte de query param (TDD)

**Files:**
- Modify: `src/app/features/auth/pages/first-login/first-login.component.spec.ts`
- Modify: `src/app/features/auth/pages/first-login/first-login.component.ts`

- [ ] **Step 1: Agregar el test de query param al spec existente**

Al final del `describe` block (antes del `}`), agregar:

```typescript
it('lee el token desde el query param ?token= cuando el state no lo trae', () => {
  window.history.replaceState({}, '');
  // Simular que la URL tiene ?token=
  Object.defineProperty(window, 'location', {
    value: { ...window.location, search: '?token=tok-from-url' },
    configurable: true,
  });
  fixture.detectChanges();
  expect((fixture.componentInstance as any).token()).toBe('tok-from-url');
  // Restaurar
  Object.defineProperty(window, 'location', {
    value: { ...window.location, search: '' },
    configurable: true,
  });
});
```

- [ ] **Step 2: Ejecutar para confirmar que falla**

```bash
ng test --watch=false --include="**/first-login.component.spec.ts"
```

Esperado: FAIL — `token()` es `null` porque `ngOnInit` solo lee de `history.state`.

- [ ] **Step 3: Actualizar `ngOnInit` en `FirstLoginComponent`**

Reemplazar `ngOnInit` (líneas 78-81):

```typescript
ngOnInit(): void {
  const state = window.history.state as { firstLoginToken?: string } | null;
  const fromState = state?.firstLoginToken ?? null;
  const fromQuery = new URLSearchParams(window.location.search).get('token');
  this.token.set(fromState ?? fromQuery);
}
```

- [ ] **Step 4: Ejecutar para confirmar que pasan todos los tests**

```bash
ng test --watch=false --include="**/first-login.component.spec.ts"
```

Esperado: PASS — los 3 tests (state vacío, token desde state, token desde query param).

- [ ] **Step 5: Commit**

```bash
git add src/app/features/auth/pages/first-login/first-login.component.ts \
        src/app/features/auth/pages/first-login/first-login.component.spec.ts
git commit -m "feat(auth): first-login acepta token desde ?token= query param"
```

---

## Task 8: Verificación final

- [ ] **Step 1: Correr todos los tests del feature saas-admin**

```bash
npx vitest run src/app/features/saas-admin/services/ src/app/features/saas-admin/store/
```

Esperado: todos PASS

- [ ] **Step 2: Correr tests de componentes**

```bash
ng test --watch=false
```

Esperado: todos PASS — incluye wizard page y first-login

- [ ] **Step 3: Verificación manual (opcional pero recomendada)**

Levantar el BE con el worktree de development apuntando al schema de `saas-onboarding` y verificar el flujo completo:
1. Ir a `/saas/tenants/nuevo`
2. Completar los 7 campos (lab + admin)
3. Click "Crear y continuar" → debe aparecer el modal con el link
4. Copiar el link → abrirlo en nueva pestaña
5. Setear contraseña con el token
6. Loguear con usuario y contraseña del admin creado

- [ ] **Step 4: Push de la rama**

```bash
git push origin feat/saas-admin-onboarding-ui
```

# Spec — Sub-proyecto S: Onboarding de tenant + admin por UI (SaaS Admin)

> **Branch:** `feat/saas-admin-onboarding-ui`
> **Scope:** FE-only — `features/saas-admin/**` + mínimo toque en `features/auth/pages/first-login/`
> **Jira:** (pendiente)

---

## Contexto

El wizard de creación de tenants (`TenantWizardPage`) actualmente manda solo `{ code, name }` al backend, pero el endpoint `POST /api/v1/saas-admin/tenants` exige 7 campos `@NotBlank` (los 2 del lab + 5 del owner). Resultado: HTTP 400 al crear cualquier tenant. Además, el BE devuelve `ownerFirstLoginToken` en la respuesta, pero el FE lo descarta — el admin recién creado no puede setear su contraseña.

---

## Decisiones de diseño

| Pregunta | Decisión |
|---|---|
| ¿Cómo acomodar los campos del admin? | Sub-bloque "Administrador inicial" en Step 1, solo en create mode. 3 pasos sin cambios. |
| ¿Cómo entregar el token al admin? | Modal post-creación con link compartible `/first-login?token=…` + botón copiar. Requiere soporte de `?token=` en `FirstLoginComponent`. |

---

## Cambios por archivo

### 1. `models/tenant.model.ts`

Ampliar `CreateTenantRequest` con los 5 campos del owner. Agregar `CreateTenantResponse` que extiende `Tenant` con el token. `Tenant` no se modifica.

```typescript
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
```

### 2. `services/saas-admin-api.service.ts`

Cambiar el tipo de retorno de `createTenant` de `Promise<Tenant>` a `Promise<CreateTenantResponse>`. Sin cambios en URL, método HTTP ni body structure (el body ya trae los 7 campos por el nuevo `CreateTenantRequest`).

### 3. `store/saas-admin.actions.ts`

`createTenantSuccess` pasa de `props<{ tenant: Tenant }>` a `props<{ tenant: CreateTenantResponse }>`. El resto de las actions no cambia.

### 4. `store/saas-admin.reducer.ts` y `saas-admin.effects.ts`

Sin cambios en lógica. El tipo inferido se actualiza automáticamente. El `ownerFirstLoginToken` **no se persiste en el store** — es un dato de uso único (pantalla de éxito) que se maneja con una signal local en el wizard.

### 5. `pages/tenant-wizard/tenant-wizard.page.ts`

#### Formulario de admin

Nuevo `FormGroup` para los campos del owner, solo activo en create mode:

```typescript
protected readonly ownerForm = this.fb.nonNullable.group({
  ownerFirstName:  ['', Validators.required],
  ownerLastName:   ['', Validators.required],
  ownerEmail:      ['', [Validators.required, Validators.email]],
  ownerDocument:   ['', Validators.required],
  ownerUsername:   ['', Validators.required],
});
```

#### Template Step 1 (create mode)

Después del campo "Nombre del lab", se agrega un separador visual con título "Administrador inicial" y los 5 campos del owner en grid (nombre/apellido en 2 col, email full-width, DNI/usuario en 2 col). El bloque entero está dentro de `@if (mode() === 'create')`.

#### Submit Step 1 (create mode)

`submitStep1()` en create mode combina los valores de ambos formularios:

```typescript
this.store.dispatch(createTenant({
  req: { ...infoRaw, ...ownerRaw }
}));
```

Si alguno de los dos formularios es inválido, no se dispara el dispatch.

#### Signals nuevas

```typescript
protected readonly firstLoginToken = signal<string | null>(null);
protected readonly showTokenModal = signal(false);
```

#### `createTenantSuccess` subscribe

```typescript
.subscribe(({ tenant }) => {
  this.createdTenantId.set(tenant.id);
  this.firstLoginToken.set(tenant.ownerFirstLoginToken);
  this.wlForm.patchValue({ systemName: tenant.name });
  this.errorMessage.set(null);
  this.showTokenModal.set(true); // muestra modal antes de avanzar a step 2
});
```

#### Modal de token (overlay inline)

Aparece cuando `showTokenModal()` es `true`. Posicionado con `position: fixed` sobre el wizard. Contenido:

- Titular "Laboratorio creado correctamente"
- Sub-bloque principal: link completo `window.location.origin + '/first-login?token=' + token` con botón "Copiar link"
- Sub-bloque secundario (muted): raw token con botón "Copiar token"
- Nota: "Compartí el link con el administrador del laboratorio."
- Botón "Continuar a módulos" → `showTokenModal.set(false); step.set(2)`

Usa CSS vars `--saas-bg-card`, `--saas-accent`, `--saas-text`, `--saas-border` ya presentes en el wizard. Sin imports de `p-dialog` u otros módulos nuevos.

### 6. `features/auth/pages/first-login/first-login.component.ts`

Adición mínima en `ngOnInit`: si `window.history.state` no trae token, se lee `?token=` del query string.

```typescript
ngOnInit(): void {
  const state = window.history.state as { firstLoginToken?: string } | null;
  const fromState = state?.firstLoginToken ?? null;
  const fromQuery = new URLSearchParams(window.location.search).get('token');
  this.token.set(fromState ?? fromQuery);
}
```

El comportamiento existente (navegación con state) no cambia. El query param es puramente aditivo.

---

## Tests

| Archivo | Casos nuevos |
|---|---|
| `saas-admin-api.service.spec.ts` | `createTenant` postea los 7 campos; respuesta tipada con `ownerFirstLoginToken` |
| `saas-admin.effects.spec.ts` | `createTenant$` emite `createTenantSuccess` con `CreateTenantResponse` |
| `tenant-wizard.page.spec.ts` (nuevo) | Step 1 muestra bloque admin en create mode; no lo muestra en edit mode; modal aparece tras `createTenantSuccess`; botón "Copiar link" llama `navigator.clipboard.writeText` con el link correcto; botón "Continuar" cierra modal y avanza a step 2 |
| `first-login.component.spec.ts` | Lee token desde `?token=` query param cuando state no tiene token |

---

## Criterio de done

- Crear un tenant 100% por la UI (lab + admin) → 201, sin Swagger.
- Tras crear, la UI muestra el link `/first-login?token=…` con botón copiar.
- Con ese link, el admin puede abrir en cualquier browser, setear contraseña y loguear.
- Sin regresiones en el wizard en modo edición.

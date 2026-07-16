# Atención — Pulido del wizard + cobertura y autorización — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Jira:** [KAN-109](https://exequielsantoro.atlassian.net/browse/KAN-109)
>
> **Spec:** `docs/superpowers/specs/2026-06-14-atencion-pulido-cobertura-design.md`

**Goal:** Pulir el wizard de atención: migrarlo al `ui-wizard-shell` estándar (con URGENTE inline), gatear la columna "autorizado" por cobertura, auto-autorizar en OS, persistir un nro de autorización alfanumérico por atención, empty state en el paso 2 y fila de precios compacta.

**Architecture:** Cross-stack. Backend: `Attention.authorizationNumber` pasa de `Long` a `String` (migración Flyway V959) y se agrega un endpoint dedicado `PATCH /{id}/authorization-number` espejando el patrón de copago. Frontend: extender `ui-wizard-shell` con slots aditivos, migrar el wizard, y ajustes de los step components.

**Tech Stack:** Spring Boot (Clean Architecture: domain/application/infrastructure/presentation), Flyway, JUnit; Angular 21 standalone + signals + NgRx clásico + PrimeNG + Tailwind; tests `ng test` (componentes) y `npx vitest` (store).

**Dos repos:** Backend en `c:\Users\tobia\Desktop\TUP\TESIS\Backend` (crear worktree off `development`), Frontend en este worktree `feat/atencion-pulido-cobertura`. Correr `npm ci` en el worktree FE antes de testear. Para BE usar JDK 21 (`$env:JAVA_HOME=C:\Program Files\Java\jdk-21`).

**Orden:** Fase A (BE) → B (FE store) → C (FE shell) → D (FE wizard) → E (FE pasos) → F (verificación). A es prerequisito de B/E (tipo String + endpoint). C es prerequisito de D.

---

## FASE A — Backend: `authorizationNumber` → String + endpoint dedicado

Rutas relativas a `Backend/src/main/java/lab/laboratorio/modules/analitica/atencion/`.

### Task A1: Migración Flyway V959 (BIGINT → VARCHAR)

**Files:**
- Create: `Backend/src/main/resources/db/migration/V959__alter_attentions_authorization_number_to_varchar.sql`

- [ ] **Step 1: Confirmar versión libre**

Run: `ls Backend/src/main/resources/db/migration/ | sort | tail -3`
Expected: el último es `V958__add_signature_to_employees.sql` (V959 libre). Si hay un PR abierto que ya tomó V959, usar la siguiente libre y avisar (ver memoria `flyway-version-collision-on-merge`).

- [ ] **Step 2: Escribir la migración**

`MODIFY COLUMN` es compatible con MySQL (boot) y H2 en modo MySQL (tests) — varias migraciones existentes lo usan (V77, V945). El cast de BIGINT a VARCHAR convierte los valores numéricos existentes a su representación string automáticamente.

```sql
-- V959: el nro de autorización de la obra social puede ser alfanumérico
-- (códigos con letras/guiones, ej. AUTH-1). Pasa de BIGINT a VARCHAR.
ALTER TABLE attentions MODIFY COLUMN authorization_number VARCHAR(64) NULL;
```

- [ ] **Step 3: Commit**

```bash
git add Backend/src/main/resources/db/migration/V959__alter_attentions_authorization_number_to_varchar.sql
git commit -m "feat(atencion): migracion V959 authorization_number a VARCHAR"
```

### Task A2: Cambiar el tipo `Long` → `String` en domain + JPA + mappers + DTOs

Cambio mecánico que debe compilar de punta a punta. Todos los archivos en una sola tanda porque el compilador los acopla.

**Files:**
- Modify: `domain/model/Attention.java:63` y `:125`
- Modify: `infrastructure/persistence/entity/AttentionJpaEntity.java:85-86`
- Modify: `infrastructure/persistence/mapper/AttentionJpaMapper.java:44,78` (no cambia firma, solo el tipo fluye)
- Modify: `presentation/dto/response/AttentionResponse.java:27`
- Modify: `presentation/mapper/AttentionPresentationMapper.java:38,61` (no cambia, fluye)
- Modify: `presentation/dto/request/AddAnalysisListRequest.java:11`
- Modify: `application/usecase/AddAnalysisListUseCase.java:34` (param) y `:82` (set)

- [ ] **Step 1: Domain**

En `Attention.java` cambiar:
```java
// línea 63
private String authorizationNumber;
// línea 125
public void setAuthorizationNumber(String authorizationNumber) { this.authorizationNumber = authorizationNumber; }
```
(El getter Lombok pasa a devolver `String` automáticamente.)

- [ ] **Step 2: JPA entity**

En `AttentionJpaEntity.java`:
```java
    @Column(name = "authorization_number", length = 64)
    private String authorizationNumber;
```

- [ ] **Step 3: Response DTO**

En `AttentionResponse.java:27` cambiar `Long authorizationNumber,` por:
```java
        String authorizationNumber,
```

- [ ] **Step 4: Request DTO addAnalysis**

En `AddAnalysisListRequest.java:11` cambiar `Long authorizationNumber` por:
```java
        String authorizationNumber
```

- [ ] **Step 5: UseCase addAnalysis — preservar cuando viene null**

En `AddAnalysisListUseCase.java`: cambiar el tipo del param (línea 34) a `String authorizationNumber` y proteger el set para NO pisar un valor existente con null (el writer canónico del nro pasa a ser el endpoint dedicado de Task A4):
```java
// línea ~82, reemplazar el set incondicional:
if (input.authorizationNumber() != null) {
    attention.setAuthorizationNumber(input.authorizationNumber());
}
```

- [ ] **Step 6: Compilar**

Run: `cd Backend && ./mvnw -q compile` (con `$env:JAVA_HOME` a JDK 21)
Expected: compila sin errores. Si algún test/clase referencia `authorizationNumber` como Long, ajustarlo a String.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(atencion): authorization_number a String en domain/jpa/dtos"
```

### Task A3: `SetAuthorizationNumberUseCase` (espeja `SetCopaymentUseCase`)

**Files:**
- Create: `application/usecase/SetAuthorizationNumberUseCase.java`
- Test: `Backend/src/test/java/.../atencion/application/usecase/SetAuthorizationNumberUseCaseTest.java` (ubicar junto a `SetCopaymentUseCaseTest` si existe; si no, replicar su estructura)

- [ ] **Step 1: Escribir el test que falla**

Espejar `SetCopaymentUseCaseTest`. Mockear `AttentionRepositoryPort`:
```java
@Test
void setea_el_numero_de_autorizacion_y_guarda() {
    Attention a = new Attention(); // o el builder/fixture usado en los otros tests
    when(attentionRepo.findById(1L, 99L)).thenReturn(Optional.of(a));
    when(attentionRepo.save(a)).thenReturn(a);

    Attention result = useCase.execute(new SetAuthorizationNumberUseCase.Input(1L, 99L, "AUTH-1"));

    assertThat(result.getAuthorizationNumber()).isEqualTo("AUTH-1");
    verify(attentionRepo).save(a);
}

@Test
void lanza_si_la_atencion_no_existe() {
    when(attentionRepo.findById(1L, 99L)).thenReturn(Optional.empty());
    assertThatThrownBy(() -> useCase.execute(new SetAuthorizationNumberUseCase.Input(1L, 99L, "X")))
        .isInstanceOf(AttentionNotFoundException.class);
}
```

- [ ] **Step 2: Correr el test (falla por clase inexistente)**

Run: `cd Backend && ./mvnw -q -Dtest=SetAuthorizationNumberUseCaseTest test`
Expected: FAIL — `SetAuthorizationNumberUseCase` no existe.

- [ ] **Step 3: Implementar el usecase**

```java
package lab.laboratorio.modules.analitica.atencion.application.usecase;

import lab.laboratorio.modules.analitica.atencion.domain.exception.AttentionNotFoundException;
import lab.laboratorio.modules.analitica.atencion.domain.model.Attention;
import lab.laboratorio.modules.analitica.atencion.domain.port.AttentionRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class SetAuthorizationNumberUseCase {

    private final AttentionRepositoryPort attentionRepo;

    public record Input(Long id, Long tenantId, String authorizationNumber) {}

    public Attention execute(Input in) {
        Attention a = attentionRepo.findById(in.id(), in.tenantId())
                .orElseThrow(() -> new AttentionNotFoundException(in.id()));
        // Normalizar string vacío a null para no guardar "".
        String value = (in.authorizationNumber() != null && !in.authorizationNumber().isBlank())
                ? in.authorizationNumber().trim()
                : null;
        a.setAuthorizationNumber(value);
        return attentionRepo.save(a);
    }
}
```

- [ ] **Step 4: Correr el test (pasa)**

Run: `cd Backend && ./mvnw -q -Dtest=SetAuthorizationNumberUseCaseTest test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(atencion): SetAuthorizationNumberUseCase"
```

### Task A4: Endpoint `PATCH /{id}/authorization-number` + request DTO

**Files:**
- Create: `presentation/dto/request/SetAuthorizationNumberRequest.java`
- Modify: `presentation/SecretaryAttentionController.java` (inyectar usecase + endpoint, junto al de copayment ~línea 246-253)
- Test: el test de controller existente del módulo (mirar cómo se testea `setCopayment`; agregar caso análogo)

- [ ] **Step 1: Request DTO**

```java
package lab.laboratorio.modules.analitica.atencion.presentation.dto.request;

public record SetAuthorizationNumberRequest(String authorizationNumber) {}
```

- [ ] **Step 2: Inyectar el usecase en el controller**

En `SecretaryAttentionController.java`, junto a `private final SetCopaymentUseCase setCopaymentUseCase;` (línea 54) agregar:
```java
    private final SetAuthorizationNumberUseCase setAuthorizationNumberUseCase;
```

- [ ] **Step 3: Endpoint (después del `setCopayment`, ~línea 253)**

```java
    @PatchMapping("/{id}/authorization-number")
    public ResponseEntity<AttentionResponse> setAuthorizationNumber(
            @PathVariable Long id, @RequestBody SetAuthorizationNumberRequest request) {
        Long tenantId = TenantContext.requireTenantId();
        Attention attention = setAuthorizationNumberUseCase.execute(
                new SetAuthorizationNumberUseCase.Input(id, tenantId, request.authorizationNumber()));
        return ResponseEntity.ok(mapper.toResponse(attention));
    }
```
(El import de `SetAuthorizationNumberRequest` y `SetAuthorizationNumberUseCase` se agrega arriba.)

- [ ] **Step 4: Test de controller (espejar el de copayment)**

Agregar un test que pegue `PATCH /api/v1/attentions/{id}/authorization-number` con body `{"authorizationNumber":"AUTH-1"}` y verifique 200 + que la respuesta refleja el valor. Usar el mismo harness (MockMvc + tenant) que el test de `setCopayment`.

- [ ] **Step 5: Correr suite del módulo + boot MySQL**

Run: `cd Backend && ./mvnw -q -Dtest='*Attention*' test`
Expected: PASS.
Luego validar boot contra MySQL real con la migración V959 aplicada (perfil `local`, schema fresco vía `$env:SPRING_DATASOURCE_URL`; ver memoria `mysql-boot-verification`). Expected: la app bootea, la columna es VARCHAR.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(atencion): endpoint PATCH /{id}/authorization-number"
```

---

## FASE B — Frontend store/service: modelo String + `setAuthorizationNumber`

Rutas relativas a `src/app/features/analitica/`.

### Task B1: Modelo FE `number` → `string`

**Files:**
- Modify: `models/atencion.model.ts:67` y `:119`

- [ ] **Step 1: Cambiar ambas ocurrencias**

```ts
// línea 67 (en AttentionResponse) y línea 119 (en AddAnalysisListRequest):
authorizationNumber: string | null;
```

- [ ] **Step 2: Compilar**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: aparecen errores donde se asigna number a authorizationNumber (los arreglamos en B2/E5). Anotarlos.

### Task B2: Acción + effect + service + reducer `setAuthorizationNumber` (espeja `setCopayment`)

**Files:**
- Modify: `store/atencion/atencion.actions.ts` (después de la línea 84, bloque copayment)
- Modify: `services/atencion-api.service.ts` (después de `setCopayment`, línea 85)
- Modify: `store/atencion/atencion.effects.ts` (imports + nuevo effect tras `setCopayment$`, línea 380)
- Modify: `store/atencion/atencion.reducer.ts` (imports + 3 `on(...)` tras línea 112)
- Test: `store/atencion/atencion.effects.spec.ts` y `atencion.reducer.spec.ts`

- [ ] **Step 1: Test del effect que falla**

En `atencion.effects.spec.ts`, espejar el test de `setCopayment$`: dado `setAuthorizationNumber({ attentionId: 1, authorizationNumber: 'AUTH-1' })`, el effect llama `api.setAuthorizationNumber(1, { authorizationNumber: 'AUTH-1' })` y emite `setAuthorizationNumberSuccess({ item })`.

- [ ] **Step 2: Correr (falla)**

Run: `npx vitest run src/app/features/analitica/store/atencion/atencion.effects.spec.ts`
Expected: FAIL — `setAuthorizationNumber` no existe.

- [ ] **Step 3: Acciones**

En `atencion.actions.ts` tras la línea 84:
```ts
export const setAuthorizationNumber        = createAction('[Atencion Resumen] Set Authorization Number',  props<{ attentionId: number; authorizationNumber: string | null }>());
export const setAuthorizationNumberSuccess = createAction('[Atencion API] Set Authorization Number Success', props<{ item: AttentionResponse }>());
export const setAuthorizationNumberFailure = createAction('[Atencion API] Set Authorization Number Failure', props<{ error: HttpErrorResponse }>());
```

- [ ] **Step 4: Service**

En `atencion-api.service.ts` tras `setCopayment` (línea 85):
```ts
  setAuthorizationNumber(id: number, body: { authorizationNumber: string | null }): Observable<AttentionResponse> {
    return this.http.patch<AttentionResponse>(`${this.base}/${id}/authorization-number`, body);
  }
```

- [ ] **Step 5: Effect**

En `atencion.effects.ts`, agregar a los imports de acciones `setAuthorizationNumber, setAuthorizationNumberSuccess, setAuthorizationNumberFailure` y tras `setCopayment$` (línea 380):
```ts
  setAuthorizationNumber$ = createEffect(() =>
    this.actions$.pipe(
      ofType(setAuthorizationNumber),
      concatMap(({ attentionId, authorizationNumber }) =>
        this.api.setAuthorizationNumber(attentionId, { authorizationNumber }).pipe(
          map(item => setAuthorizationNumberSuccess({ item })),
          catchError((error: HttpErrorResponse) => {
            this.notification.error('No se pudo guardar el número de autorización. Revisá la conexión y volvé a intentarlo.');
            return of(setAuthorizationNumberFailure({ error }));
          }),
        )
      )
    )
  );
```
(Si `map` no está importado de rxjs, agregarlo.)

- [ ] **Step 6: Reducer**

En `atencion.reducer.ts`, agregar imports y, tras la línea 112, reusar el patrón de merge de `setCopaymentSuccess` (el endpoint devuelve la atención; preservar `analysisAuthorizations` si la respuesta no las trae). Agregar al state un flag `authorizationMutating` (junto a `copaymentMutating`):
```ts
  on(setAuthorizationNumber, (s): AtencionFeatureState => ({ ...s, authorizationMutating: true })),
  on(setAuthorizationNumberSuccess, (s, { item }): AtencionFeatureState => {
    const merged = s.detail && !item.analysisAuthorizations?.length
      ? { ...item, analysisAuthorizations: s.detail.analysisAuthorizations }
      : item;
    return { ...s, authorizationMutating: false, detail: merged, list: replaceInList(s.list, merged) };
  }),
  on(setAuthorizationNumberFailure, (s): AtencionFeatureState => ({ ...s, authorizationMutating: false })),
```
Agregar `authorizationMutating: boolean` a `AtencionFeatureState` y a `initialState` (default `false`), y un selector `selectAuthorizationMutating` espejando `selectCopaymentMutating`.

- [ ] **Step 7: Correr tests (pasan)**

Run: `npx vitest run src/app/features/analitica/store/atencion/`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(atencion): store/service setAuthorizationNumber (espeja copago)"
```

---

## FASE C — Frontend: extender `ui-wizard-shell` con slots aditivos

**Files:**
- Modify: `src/app/shared/ui/components/wizard-shell/wizard-shell.component.ts`
- Test: `src/app/shared/ui/components/wizard-shell/wizard-shell.component.spec.ts` (crear si no existe)

Los slots son **aditivos** — los wizards actuales (pacientes/empleados/médicos/sucursal/agenda) no los usan y siguen igual.

### Task C1: Agregar slots `headingBadge`, `headerActions`, `wizardBanner`

- [ ] **Step 1: Test que falla**

Test de render que proyecta contenido en los 3 slots y verifica que aparece:
```ts
@Component({
  standalone: true,
  imports: [WizardShellComponent],
  template: `
    <ui-wizard-shell heading="X" [steps]="steps" [currentIndex]="0" [visited]="visited">
      <span headingBadge data-testid="badge">URGENTE</span>
      <span headerActions data-testid="actions">acciones</span>
      <div wizardBanner data-testid="banner">banner</div>
      contenido
    </ui-wizard-shell>`,
})
class Host { steps = [{ key: 'a', title: 'A' }]; visited = new Set<number>(); }
// expect badge/actions/banner presentes en el DOM
```

- [ ] **Step 2: Correr (falla)**

Run: `ng test --include='**/wizard-shell.component.spec.ts' --watch=false`
Expected: FAIL — los slots no se proyectan.

- [ ] **Step 3: Implementar los slots**

En el template de `wizard-shell.component.ts`:
- En el `<header>` (línea 25-30), envolver el `h1` y el badge en un contenedor flex y reemplazar el bloque del breadcrumb por el slot de acciones:
```html
      <header class="wz-bar wz-bar--top flex items-center gap-3 px-8 py-4 bg-surface-0 sticky top-0 z-10">
        <div class="flex items-center gap-2 min-w-0">
          <h1 class="text-xl font-bold m-0 leading-tight truncate">{{ heading() }}</h1>
          <ng-content select="[headingBadge]" />
        </div>
        <div class="ml-auto flex items-center gap-2">
          @if (breadcrumb()) { <nav class="text-xs text-surface-500">{{ breadcrumb() }}</nav> }
          <ng-content select="[headerActions]" />
        </div>
      </header>
```
- Inmediatamente DESPUÉS del `<ui-form-stepper-header .../>` (línea 38) agregar el slot de banner:
```html
      <ng-content select="[wizardBanner]" />
```

- [ ] **Step 4: Correr (pasa)**

Run: `ng test --include='**/wizard-shell.component.spec.ts' --watch=false`
Expected: PASS.

- [ ] **Step 5: Regresión de otros wizards**

Run: `ng test --include='**/pacientes/**' --include='**/sucursales/**' --watch=false`
Expected: PASS (sin cambios de comportamiento).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(ui): slots headingBadge/headerActions/wizardBanner en wizard-shell"
```

---

## FASE D — Frontend: migrar `atencion-wizard` al shell + subir footers

**Files:**
- Modify: `pages/atencion/atencion-wizard/atencion-wizard.component.ts`
- Modify: cada step: `steps/datos-generales-step/datos-generales-step.component.ts`, `steps/analisis-step/analisis-step.component.ts`, `steps/resumen-step/resumen-step.component.ts` (quitar footer interno + exponer outputs/inputs de navegación)
- Test: `atencion-wizard.component.spec.ts` + specs de cada step

### Task D1: Subir la navegación de cada paso a outputs (sin footer interno)

Hoy cada step pinta su footer (ej. `resumen-step.component.ts:173-181`: "Volver fase" / "Finalizar atención"). El shell tiene UN footer (`customFooter`), así que la decisión de botones se centraliza en el wizard.

- [ ] **Step 1: `resumen-step` — exponer outputs y quitar footer**

En `resumen-step.component.ts`:
- Borrar el bloque `@if (!readOnly()) { <div ...> ...Volver fase / Finalizar atención... </div> }` (líneas 173-181).
- Ya existen outputs `returnPhase` y `finished`; agregar (si falta) un método público `openFinalize()` invocable desde el wizard, o exponer un output `requestFinalize`. Mantener el modal de finalización dentro del step (lo dispara `openFinalize()`).
- Exponer inputs/outputs que el wizard necesita para el footer: `finishLoading` (= `mutating()`), `canReturn`, `returnDisabled`.

- [ ] **Step 2: `analisis-step` — exponer "continuar" y "volver fase"**

Quitar su footer interno; exponer output `advance` (= lo que hoy hace su botón Continuar / `stepAdvanced`) y `returnPhase`, e input `continueDisabled` (= `items().length === 0`).

- [ ] **Step 3: `datos-generales-step` — exponer "continuar"**

Quitar su footer interno; exponer output `advance` (= "Confirmar y seguir") e input `continueDisabled` según validez del paso.

- [ ] **Step 4: Specs de steps**

Actualizar los specs de cada step para reflejar que el footer ya no se renderiza dentro del step y que la navegación se emite por outputs. Run: `ng test --include='**/steps/**' --watch=false`. Expected: PASS tras ajustar.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(atencion): subir navegacion de cada paso a outputs"
```

### Task D2: Migrar el contenedor `atencion-wizard` a `ui-wizard-shell`

- [ ] **Step 1: Reemplazar el chrome propio por el shell**

En `atencion-wizard.component.ts`, en la rama del `@else` con `detail()` (líneas 109-176), reemplazar el `<header>` propio, el recuadro `rounded-lg border` del stepper y el `<div class="aw-step">` por el shell. Importar `WizardShellComponent`. Esquema:
```html
      } @else {
        <ui-wizard-shell
          [heading]="'Atención ' + headerTitle()"
          [steps]="stepperSteps()"
          [currentIndex]="activeIndex()"
          [visited]="completedSteps()"
          [clickable]="readOnly()"
          [customFooter]="true"
          [maxWidth]="'1040px'"
          (stepSelected)="goToStep($event)">

          @if (detail()!.isUrgent) {
            <p-tag headingBadge value="URGENTE" severity="danger" />
          }

          <div headerActions class="flex items-center gap-2">
            <p-button label="Volver al listado" severity="secondary" [text]="true" (onClick)="backToList()" />
            @if (canCancel()) {
              <p-button label="Cancelar atención" severity="danger" [text]="true" (onClick)="onCancel()" />
            }
          </div>

          @if (readOnly()) {
            <div wizardBanner class="mx-8 mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 flex items-center gap-2">
              <i class="pi pi-eye"></i>
              <span>{{ readOnlyBanner() }}</span>
              @if (detail()!.attentionState === AttentionState.AWAITING_EXTRACTION && detail()!.protocolId != null) {
                <p-button class="ml-auto" label="Descargar rótulos" severity="secondary" (onClick)="downloadLabels()" />
              }
            </div>
          }

          <!-- cuerpo del paso (proyectado al área scrollable del shell) -->
          @switch (uiStep()?.key) {
            @case ('datos') {
              <lab-datos-generales-step ... (advance)="onDatosAdvance()" />
            }
            @case ('analisis') {
              <lab-analisis-step ... (advance)="onAnalysisAdvanced()" (returnPhase)="onReturnPhase()" />
            }
            @case ('confirmar') {
              <lab-resumen-step ... (returnPhase)="onReturnPhase()" (finished)="onFinished()" />
            }
          }

          <!-- footer del shell: botones según el paso actual -->
          <div wizardFooter class="flex items-center gap-2">
            @if (canReturn()) {
              <p-button label="Volver fase" severity="secondary" [outlined]="true"
                        [disabled]="mutating()" (onClick)="onReturnPhase()" />
            }
            @switch (uiStep()?.key) {
              @case ('confirmar') {
                <p-button label="Finalizar atención" [loading]="mutating()" [disabled]="mutating()"
                          (onClick)="resumenRef.openFinalize()" />
              }
              @default {
                <p-button label="Continuar" [disabled]="continueDisabled()" (onClick)="advanceCurrent()" />
              }
            }
          </div>
        </ui-wizard-shell>
      }
```
Notas de implementación:
- `resumenRef` = `viewChild` del `lab-resumen-step` para disparar `openFinalize()` desde el footer; alternativamente un signal `finalizeRequested` que el step observe. Elegir el que deje los tests más simples.
- `advanceCurrent()` despacha la acción del paso actual (datos → assign/continuar; analisis → addAnalysis/advance).
- `continueDisabled()` computa según el paso (datos: form inválido; analisis: 0 análisis).
- El `<div class="aw-step">` y el `<header>` viejos se eliminan; el banner read-only y "Descargar rótulos" pasan al slot `wizardBanner` (esto cumple el item 5: URGENTE queda inline al lado del título, vía `headingBadge`).

- [ ] **Step 2: Compilar + smoke spec del wizard**

Run: `ng test --include='**/atencion-wizard.component.spec.ts' --watch=false`
Expected: PASS (ajustar el spec: ya no hay `header h2` propio; el heading vive en el shell; URGENTE en el slot).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(atencion): migrar wizard a ui-wizard-shell (URGENTE inline)"
```

---

## FASE E — Frontend: cobertura, auto-autorizar, empty state, fila de precios, input auth

**Files:**
- Modify: `steps/analisis-step/analysis-picker.component.ts`
- Modify: `steps/analisis-step/analisis-step.component.ts`
- Modify: `steps/resumen-step/resumen-step.component.ts`
- Test: specs respectivos

Helper común: derivar `isParticular = insurancePlanId === null` desde `detail().insurancePlanId`. El `analisis-step` y `resumen-step` reciben el `detail()`/`atencion()`; pasar `isParticular` (o `insurancePlanId`) al `analysis-picker` como input.

### Task E1: Item 2 — ocultar columna "autorizado" en Particular

- [ ] **Step 1: Test (picker)**

En el spec del `analysis-picker`: con input `isParticular = true`, la columna del checkbox "Autorizado" NO está en el DOM; con `false`, sí.

- [ ] **Step 2: Correr (falla)** — Run: `ng test --include='**/analysis-picker.component.spec.ts' --watch=false` → FAIL.

- [ ] **Step 3: Implementar**

Agregar input `isParticular = input<boolean>(false)` al picker. Envolver la `<th>`/`<td>` de "Autorizado" (líneas ~69-77) con `@if (!isParticular()) { ... }`. En `resumen-step`, envolver la columna del tag "Autorizado/Particular" con `@if (!isParticular())`.

- [ ] **Step 4: Correr (pasa)** — Expected: PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(atencion): ocultar columna autorizado en cobertura particular"`

### Task E2: Item 3 — auto-autorizar en OS (default true, editable)

- [ ] **Step 1: Test (picker/step)**

Al agregar un análisis con `isParticular = false`, la fila nace con `isAuthorized = true`; con `isParticular = true`, el payload envía `isAuthorized: false`. El checkbox sigue editable en OS.

- [ ] **Step 2: Correr (falla)** → FAIL.

- [ ] **Step 3: Implementar**

En el alta de fila del picker, `isAuthorized` default = `!isParticular()`. Mantener el checkbox editable. En `analisis-step.component.ts`, al construir el payload, si `isParticular`, forzar `isAuthorized: false` para todas las filas (consistencia). Documentar en comentario que cambiar la cobertura en el paso 1 re-deriva el default **solo para nuevos** análisis (no pisa ediciones manuales previas).

- [ ] **Step 4: Correr (pasa)** → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(atencion): auto-autorizar analisis cuando hay obra social"`

### Task E3: Item 6 — empty state del paso 2

- [ ] **Step 1: Test** — con `items().length === 0`, el paso 2 muestra el texto "Ingrese análisis para continuar".

- [ ] **Step 2: Correr (falla)** → FAIL.

- [ ] **Step 3: Implementar** — en `analisis-step.component.ts`, agregar bajo el picker:
```html
@if (items().length === 0) {
  <p class="text-sm text-surface-500 text-center py-4">Ingrese análisis para continuar</p>
}
```
(o `ui-empty-state` si encaja visualmente). El botón Continuar ya queda deshabilitado vía `continueDisabled` (Fase D).

- [ ] **Step 4: Correr (pasa)** → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(atencion): empty state ingrese analisis para continuar"`

### Task E4: Item 7 — fila de precios compacta

- [ ] **Step 1: Test** — el spec del `resumen-step` verifica que Subtotal, Copago (input) y Total están en una sola fila (un contenedor flex horizontal), no 3 filas apiladas. Verificar que `setCopayment` se sigue disparando en blur.

- [ ] **Step 2: Correr (falla)** → FAIL.

- [ ] **Step 3: Implementar**

Reemplazar el `<section class="border-t pt-3 space-y-1">` (líneas 138-171) por una fila horizontal:
```html
@if (pricing(); as p) {
  <section class="border-t pt-3 flex flex-wrap items-center justify-end gap-x-6 gap-y-2 text-sm">
    <span><span class="opacity-60">Subtotal</span> {{ p.subtotal | currencyAr }}</span>
    <span class="flex items-center gap-2">
      <label class="opacity-60" for="copago-input">Copago</label>
      <p-inputNumber inputId="copago-input" [ngModel]="copaymentValue()"
        (ngModelChange)="copaymentValue.set($event)" (onBlur)="onCopaymentBlur()"
        mode="decimal" [minFractionDigits]="2" [maxFractionDigits]="2" [min]="0"
        [disabled]="copaymentMutating() || readOnly()" styleClass="w-32" inputStyleClass="w-32 text-right" placeholder="0,00" />
    </span>
    <span class="font-semibold text-base"><span class="opacity-60 font-normal">Total</span> {{ liveTotal() | currencyAr }}</span>
  </section>
}
```

- [ ] **Step 4: Correr (pasa)** → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(atencion): subtotal/copago/total en una fila compacta"`

### Task E5: Item 4 — input "Nro de autorización" en el paso final (solo OS)

- [ ] **Step 1: Test (resumen-step)**

Con `insurancePlanId != null` (OS), el input "Nro de autorización" se renderiza; al hacer blur con un valor nuevo, despacha `setAuthorizationNumber({ attentionId, authorizationNumber })`. Con `insurancePlanId === null` (Particular), el input NO se renderiza. Espejar el patrón del test de copago (`resumen-step.component.spec.ts:389-410`).

- [ ] **Step 2: Correr (falla)** → FAIL.

- [ ] **Step 3: Implementar**

En `resumen-step.component.ts`:
- Signal local `authorizationValue = signal<string | null>(null)`, inicializado desde `atencion().authorizationNumber` (effect/`ngOnChanges`).
- Método `onAuthorizationBlur()` espejando `onCopaymentBlur()` (dedup contra `atencion().authorizationNumber`):
```ts
onAuthorizationBlur(): void {
  const attn = this.atencion();
  const value = this.authorizationValue();
  const current = attn.authorizationNumber ?? null;
  const normalized = value && value.trim() !== '' ? value.trim() : null;
  if (normalized === current) return;
  this.store.dispatch(setAuthorizationNumber({ attentionId: attn.id, authorizationNumber: normalized }));
}
```
- Template (cerca del header de cobertura del resumen), visible solo si OS:
```html
@if (atencion().insurancePlanId != null) {
  <div class="flex items-center gap-2">
    <label class="opacity-60 text-sm" for="auth-input">Nro de autorización</label>
    <input pInputText id="auth-input" type="text" [ngModel]="authorizationValue()"
           (ngModelChange)="authorizationValue.set($event)" (blur)="onAuthorizationBlur()"
           [disabled]="authorizationMutating() || readOnly()" class="w-48" placeholder="Ej. AUTH-1" />
  </div>
}
```
- `authorizationMutating = this.store.selectSignal(selectAuthorizationMutating)`.

- [ ] **Step 4: Quitar el hardcode de `analisis-step`**

En `analisis-step.component.ts:203`, el payload de `addAnalysisList` ya no debe forzar `authorizationNumber: null` (la BE preserva cuando viene null — Task A2 Step 5). Dejar `authorizationNumber: null` es seguro ahora, pero por claridad enviar el valor actual de la atención si está disponible, o null. Mantener consistente con los specs (ajustar `effects.spec.ts`/`reducer.spec.ts` que asumían number → ahora string|null).

- [ ] **Step 5: Correr (pasa)** — Run: `ng test --include='**/resumen-step.component.spec.ts' --watch=false` → PASS.

- [ ] **Step 6: Commit** — `git commit -m "feat(atencion): input nro de autorizacion en paso final (solo OS)"`

---

## FASE F — Verificación final

### Task F1: Suites completas + smoke

- [ ] **Step 1: FE — componentes**

Run: `ng test --watch=false`
Expected: todo verde (831+ specs base + nuevos).

- [ ] **Step 2: FE — store**

Run: `npx vitest run src/app/features/analitica/store/atencion/`
Expected: PASS.

- [ ] **Step 3: BE — suite + boot MySQL**

Run: `cd Backend && ./mvnw -q test` (JDK 21; E2E excluidos del fase test)
Luego boot perfil `local` contra schema fresco con V959 aplicada (memoria `mysql-boot-verification`).
Expected: PASS + bootea.

- [ ] **Step 4: Smoke E2E manual**

Levantar el worktree (launcher `start-worktree.ps1`, schema dedicado por rama). Verificar:
- Flujo OS: seleccionar cobertura OS en paso 1 → en paso 2 los análisis nacen autorizados y son destildables → en paso final cargar "Nro de autorización" y ver que persiste → finalizar.
- Flujo Particular: seleccionar "Particular" en paso 1 → NO aparece columna autorizado en paso 2 ni en resumen → NO aparece input de nro de autorización.
- URGENTE: una atención urgente muestra el badge inline al lado del título dentro del shell.
- Empty state: paso 2 sin análisis muestra "Ingrese análisis para continuar".
- Precios: subtotal/copago/total en una sola fila.
- Regresión: pacientes/empleados/sucursal siguen viéndose igual (slots del shell no los afectan).

- [ ] **Step 5: Abrir PRs — exactamente 1 de BE + 1 de FE — contra `development`**

**Un único PR de backend** (Fase A: tipo String + migración V959 + endpoint authorization-number) y **un único PR de frontend** (Fases B–F: store, shell, wizard, pasos), cada uno linkeando el Jira en el body (regla #1/#3 de ambos repos). NO abrir un PR por fase.

---

## Self-review (cobertura del spec)

- Item 1 (stepper genérico / consistencia) → Fase C + D (migración a `ui-wizard-shell`). ✅
- Item 2 (ocultar autorizado en particular) → E1. ✅
- Item 3 (auto-autorizar en OS, editable) → E2. ✅
- Item 4 (nro autorización por atención, endpoint dedicado) → A3, A4, B2, E5. ✅
- Item 3-tipo (String alfanumérico) → A1, A2, B1. ✅
- Item 5 (URGENTE inline) → D2 (slot `headingBadge`). ✅
- Item 6 (empty state paso 2) → E3. ✅
- Item 7 (fila de precios compacta) → E4. ✅

Sin placeholders de implementación: cada task trae código real o edición exacta con código. Tipos consistentes: `authorizationNumber: String` (BE) / `string | null` (FE) en todos los puntos; acción `setAuthorizationNumber` con la misma firma en actions/effect/service/reducer/uso.

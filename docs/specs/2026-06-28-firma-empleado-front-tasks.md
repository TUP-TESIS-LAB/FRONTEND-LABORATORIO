# Tasks: paso "Firma" con 3 modos (front)

> Spec: [2026-06-28-firma-empleado-front-design.md](./2026-06-28-firma-empleado-front-design.md)
> **Jira:** [KAN-149](https://exequielsantoro.atlassian.net/browse/KAN-149)

Reglas: `ngrx-backend-request` para llamadas al back; Regla 4 (español, sin leak, toasts sin emojis → PrimeIcons); componente en `shared/ui`. Ante blocker CONSULTAR; verificar consumidores antes de modificar (NO romper `med-firma-step`).

## Tasks

- [ ] **T1.** Crear `SignatureInputComponent` en `shared/ui/components/signature-input`: `ControlValueAccessor`, valor = base64 PNG dataURL, selector de modo **Dibujar / Subir imagen / Texto**.
  - Dibujar: REUSAR `SignaturePadComponent` (no duplicar).
  - Subir imagen: `<input type=file accept=image/png,image/jpeg>` → `FileReader.readAsDataURL` → valida PNG/JPG + ≤2MB (mensaje español, sin emoji, no setea si inválido).
  - Texto: input → rasterizar a canvas con fuente tipo firma → `toDataURL('image/png')`.
  - `writeValue`: precarga firma existente (preview); `clear` → null.
- [ ] **T2.** Verificar que envolver/componer `SignaturePadComponent` NO rompa `med-firma-step` (form de médico). Si requiere refactor del pad, hacerlo compatible con ambos y verificar el form de médico. CONSULTAR si no se puede reusar sin romper.
- [ ] **T3.** Agregar paso `firma` a `EMPLOYEE_FORM_STEPS` (entre `usuario` y `resumen`) + `FormGroup` `firma: { signature: [null] }` en `empleado-form.page.ts`.
- [ ] **T4.** Visibilidad condicional: el paso "Firma" se muestra/habilita SOLO si `datos.isBiochemist`. Al desactivar isBiochemist, ocultar el paso y limpiar signature. VERIFICAR cómo `WizardShellComponent`/stepper maneja pasos condicionales; si usa índices estáticos, CONSULTAR el approach.
- [ ] **T5.** `resumen-step`: preview de la firma si hay.
- [ ] **T6.** `employee.service.ts` + tipos front `CreateEmployeeRequest`/`UpdateEmployeeRequest`: incluir `signature?: string | null` en payload create/update. En edición, precargar `signature` del GET (puede venir null en empleados viejos).
- [ ] **T7.** Tests: `SignatureInputComponent` (3 modos → dataURL PNG; imagen inválida no setea + mensaje; texto rasteriza; clear → null; writeValue precarga). Form empleado (paso aparece solo con isBiochemist; create/update mandan signature; edición precarga).
- [ ] **T8.** `npm run build`. Smoke manual: alta de bioquímico con cada modo → guarda → reabrir en edición muestra la firma.

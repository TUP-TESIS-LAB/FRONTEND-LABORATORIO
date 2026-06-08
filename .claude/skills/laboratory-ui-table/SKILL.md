---
name: laboratory-ui-table
description: >
  Guía obligatoria para cualquier tabla de datos en el laboratorio. Usar SIEMPRE que se
  necesite mostrar una lista tabular de entidades (pacientes, médicos, órdenes, usuarios,
  turnos, etc.) o cuando se mencione "tabla", "listado", "grilla", "p-table" o cualquier
  vista de colección en el portal administrativo. NUNCA usar p-table inline directamente —
  toda tabla pasa por el componente genérico ui-table.
---

# ui-table — Componente genérico de tablas del laboratorio

## Regla fundamental

**NUNCA usar `p-table` directamente en una page o feature component.**
Toda tabla de datos del laboratorio usa `DataTableComponent` (`ui-table`).

```
✅  <ui-table [columns]="cols" [value]="items()" />
❌  <p-table [value]="items()">...</p-table>
```

El componente vive en `src/app/shared/ui/components/data-table/`.
El modelo de tipos en `src/app/shared/ui/models/table-column.model.ts`.

---

## Imports requeridos

```typescript
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective }    from '@shared/ui/components/data-table/ui-cell.directive';
import { TableColumn, TableAction } from '@shared/ui/models/table-column.model';
```

Agregar `DataTableComponent` y `UiCellDirective` al array `imports` del componente.

---

## API de inputs

| Input           | Tipo                       | Default        | Descripción                                      |
|-----------------|----------------------------|----------------|--------------------------------------------------|
| `value`         | `readonly unknown[]`       | **requerido**  | Array de filas                                   |
| `columns`       | `readonly TableColumn[]`   | **requerido**  | Definición de columnas                           |
| `loading`       | `boolean`                  | `false`        | Muestra spinner de carga                         |
| `dataKey`       | `string`                   | `'id'`         | Campo clave para tracking                        |
| `lazy`          | `boolean`                  | `false`        | Paginación server-side                           |
| `paginator`     | `boolean`                  | `false`        | Mostrar paginador                                |
| `rows`          | `number`                   | `10`           | Filas por página                                 |
| `totalRecords`  | `number`                   | `0`            | Total de registros (lazy)                        |
| `first`         | `number`                   | `0`            | Offset actual (lazy)                             |
| `showView`      | `boolean`                  | `false`        | Botón "Ver" (ojo) por fila                       |
| `showEdit`      | `boolean`                  | `false`        | Botón "Editar" (lápiz) por fila                  |
| `showDelete`    | `boolean`                  | `false`        | Botón "Eliminar" (papelera) por fila             |
| `actions`       | `readonly TableAction[]`   | `[]`           | Acciones extra por fila                          |
| `emptyHeading`  | `string`                   | `'Sin registros'` | Título del estado vacío                       |
| `emptyIcon`     | `string`                   | `'pi-inbox'`   | Ícono PrimeIcons del estado vacío                |
| `emptyDescription` | `string \| null`        | `null`         | Subtexto del estado vacío                        |
| `emptyCtaLabel` | `string \| null`           | `null`         | Label del CTA del estado vacío                   |

## API de outputs

| Output         | Tipo                              | Cuándo se emite                               |
|----------------|-----------------------------------|-----------------------------------------------|
| `view`         | `unknown`                         | Click en "Ver"                                |
| `edit`         | `unknown`                         | Click en "Editar"                             |
| `rowDelete`    | `unknown`                         | Click en "Eliminar"                           |
| `action`       | `{ key: string; row: unknown }`   | Click en acción extra de tipo `'button'`      |
| `lazyLoad`     | `TableLazyLoadEvent`              | Cambio de página (lazy)                       |
| `emptyCtaClick`| `void`                            | Click en el CTA del estado vacío              |

---

## Modelo TableColumn

```typescript
interface TableColumn {
  field: string;           // nombre de la propiedad en la fila (o virtual, ver uiCell)
  header: string;          // texto del encabezado
  align?: 'left' | 'right' | 'center';
}
```

---

## Modelo TableAction

```typescript
interface TableAction {
  key: string;
  icon: string | ((row: unknown) => string);    // PrimeIcons, ej: 'pi-pencil'
  label: string | ((row: unknown) => string);   // tooltip + aria-label
  severity?: string | ((row: unknown) => string); // 'danger' | 'warn' | 'success'
  type?: 'button' | 'menu';                     // default: 'button'
  menuItems?: MenuItem[] | ((row: unknown) => MenuItem[]); // solo para type='menu'
}
```

`icon`, `label` y `severity` aceptan una función `(row) => string` para variar por fila.

---

## Ejemplo 1 — Lista simple sin paginación

```typescript
readonly columns: readonly TableColumn[] = [
  { field: 'name',   header: 'Nombre' },
  { field: 'type',   header: 'Tipo' },
  { field: 'active', header: 'Estado' },
];
```

```html
<ui-table
  [value]="items()"
  [loading]="pending()"
  [columns]="columns"
  [showEdit]="true"
  [showDelete]="true"
  emptyHeading="Sin registros"
  emptyIcon="pi-inbox"
  (edit)="router.navigate(['/ruta', $any($event).id, 'editar'])"
  (rowDelete)="confirmDelete($any($event))">

  <ng-template uiCell="active" let-row>
    <p-tag [severity]="$any(row).active ? 'success' : 'secondary'"
           [value]="$any(row).active ? 'Activo' : 'Inactivo'" />
  </ng-template>
</ui-table>
```

---

## Ejemplo 2 — Lista lazy con paginación server-side

```typescript
// En el componente:
readonly columns: readonly TableColumn[] = [
  { field: 'code',   header: 'Código' },
  { field: 'name',   header: 'Nombre' },
  { field: 'active', header: 'Estado' },
];

onPage(e: TableLazyLoadEvent): void {
  const rows = e.rows ?? this.pageRequest().size;
  const page = Math.floor((e.first ?? 0) / rows);
  this.store.dispatch(setPageRequest({ patch: { page, size: rows } }));
}
```

```html
<ui-table
  [value]="items()"
  [loading]="pending()"
  [columns]="columns"
  [lazy]="true"
  [paginator]="true"
  [rows]="pageRequest().size"
  [totalRecords]="total()"
  [first]="pageRequest().page * pageRequest().size"
  [showView]="true"
  emptyHeading="Sin resultados"
  emptyCtaLabel="Nuevo"
  (lazyLoad)="onPage($event)"
  (view)="router.navigate(['/ruta', $any($event).id])"
  (emptyCtaClick)="router.navigate(['/ruta', 'nuevo'])">
</ui-table>
```

---

## Ejemplo 3 — Celda custom con uiCell

Para celdas que necesitan HTML propio (badges, múltiples valores, pipes, sub-líneas):

```html
<ui-table [columns]="columns" [value]="items()">

  <!-- Campo virtual: 'nombre' no existe en el modelo, se construye en el template -->
  <ng-template uiCell="nombre" let-row>
    <div class="font-medium">{{ $any(row).lastName }}, {{ $any(row).firstName }}</div>
    <div class="text-xs text-surface-500">{{ $any(row).email }}</div>
  </ng-template>

  <!-- Con pipe -->
  <ng-template uiCell="dni" let-row>
    {{ $any(row).dni | dni }}
  </ng-template>

</ui-table>
```

Columna definida como `{ field: 'nombre', header: 'Paciente' }` — el `field` actúa como
clave de lookup, no tiene que existir en el modelo.

---

## Ejemplo 4 — Acciones extra con severidades dinámicas

Para acciones cuyo ícono o color varía según el estado de la fila:

```typescript
readonly rowActions: readonly TableAction[] = [
  {
    key: 'toggle',
    icon: (row) => (row as MyEntity).active ? 'pi-ban' : 'pi-check',
    label: (row) => (row as MyEntity).active ? 'Desactivar' : 'Activar',
    severity: (row) => (row as MyEntity).active ? 'warn' : 'success',
  },
];
```

```html
<ui-table [value]="items()" [columns]="columns" [actions]="rowActions"
          (action)="onAction($event)">
</ui-table>
```

```typescript
onAction(ev: { key: string; row: unknown }): void {
  if (ev.key === 'toggle') this.confirmToggle(ev.row as MyEntity);
}
```

---

## Ejemplo 5 — Acción de menú popup (type='menu')

Para acciones secundarias que no merecen un botón propio:

```typescript
readonly rowActions: readonly TableAction[] = [
  {
    key: 'more',
    icon: 'pi-ellipsis-v',
    label: 'Más acciones',
    type: 'menu',
    menuItems: (row) => {
      const e = row as MyEntity;
      return [
        { label: 'Exportar PDF', icon: 'pi pi-file-pdf',
          command: () => this.exportPdf(e) },
        { label: 'Enviar por email', icon: 'pi pi-envelope',
          command: () => this.sendEmail(e) },
      ];
    },
  },
];
```

---

## Ejemplo 6 — Acciones condicionales por permisos

`showEdit`, `showDelete` y `actions` aceptan binding a señales:

```html
<ui-table
  [value]="items()"
  [columns]="columns"
  [showEdit]="canMutate()"
  [showDelete]="canDelete()"
  [actions]="canMutate() ? extraActions : []">
</ui-table>
```

---

## Cuándo NO usar ui-table

- **UIs operacionales en tiempo real** (cola de extracción, sala de espera): tienen layout
  de 2 columnas, polling, overlays complejos y la tabla es un bloque interno menor.
  En esos casos `p-table` inline está permitido.
- **Tablas internas de formularios** (listas repetibles dentro de un stepper step, como
  contactos o coberturas): son listas editables, no listados de entidades.

---

## Anti-patrones

```html
❌ <p-table [value]="items()">...</p-table>  <!-- en un list page -->
❌ Redefinir zebra/estilos encima de ui-table (usa los tokens del DS)
❌ Omitir emptyHeading/emptyIcon (ui-table siempre muestra estado vacío)
❌ Poner lógica de navegación en el template inline con routerLink en filas
   → usar (view)/(edit) con router.navigate() en el componente
```

import {
  ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges,
  computed, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';

import {
  ContactType, ExternalLab, ExternalLabRequest,
} from '../../../models/external-lab.model';

/** Provincias argentinas + CABA para el select de dirección. */
export const PROVINCIAS = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes',
  'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones',
  'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe',
  'Santiago del Estero', 'Tierra del Fuego', 'Tucumán',
];

/** Orden canónico de tipos de contacto — define cuál se elige al "Agregar contacto". */
const CONTACT_TYPES: ContactType[] = ['PHONE', 'MOBILE', 'EMAIL', 'WHATSAPP', 'FAX', 'WEBSITE'];

const CONTACT_TYPE_LABEL: Record<ContactType, string> = {
  PHONE: 'Teléfono',
  MOBILE: 'Celular',
  EMAIL: 'Email',
  WHATSAPP: 'WhatsApp',
  FAX: 'Fax',
  WEBSITE: 'Sitio web',
};

interface ContactRow {
  contactType: ContactType;
  value: string;
}

interface ContactTypeOption {
  label: string;
  value: ContactType;
}

/**
 * Drawer de alta/edición de un laboratorio derivado (ExternalLab) — KAN-219.
 * Calca el patrón de `seccion-form-drawer.component.ts` (p-drawer half + pat-form + footer),
 * pero mantiene el estado en signals locales (no ReactiveForms) porque los contactos son una
 * lista dinámica tipada. Emite `(save)` con el request y `(toggleActive)` con {id, deleted};
 * la página cablea los dispatch al store.
 */
@Component({
  selector: 'emp-derivado-form-drawer',
  standalone: true,
  imports: [
    FormsModule, DrawerModule, ButtonModule, InputTextModule, SelectModule, TextareaModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-drawer
      [visible]="visibleInternal"
      (visibleChange)="onVisibleChange($event)"
      position="right"
      styleClass="ui-drawer-half"
      [modal]="true"
      [dismissible]="true"
      [header]="editing() ? 'Editar laboratorio derivado' : 'Nuevo laboratorio derivado'">
      <div class="flex flex-col h-full">
        <div class="pat-form" style="flex:1; overflow-y:auto;">
          <!-- (1) Datos -->
          <section class="pat-form__card">
            <div class="pat-form__card-header"><span>Datos</span></div>
            <div class="pat-form__grid pat-form__grid--full">
              <div class="pat-form__field">
                <label class="pat-form__label">Nombre*</label>
                <input pInputText [ngModel]="name()" (ngModelChange)="setName($event)"
                       class="pat-form__input" maxlength="160" />
              </div>
              <div class="pat-form__field">
                <label class="pat-form__label">CUIT</label>
                <input pInputText [ngModel]="taxId()" (ngModelChange)="setTaxId($event)"
                       class="pat-form__input" maxlength="20" />
              </div>
              <div class="pat-form__field">
                <label class="pat-form__label">Responsable</label>
                <input pInputText [ngModel]="responsibleName()" (ngModelChange)="setResponsible($event)"
                       class="pat-form__input" maxlength="160" />
              </div>
            </div>
          </section>

          <!-- (2) Dirección -->
          <section class="pat-form__card">
            <div class="pat-form__card-header"><span>Dirección</span></div>
            <div class="pat-form__grid pat-form__grid--full">
              <div class="pat-form__field">
                <label class="pat-form__label">Calle</label>
                <input pInputText [ngModel]="street()" (ngModelChange)="setStreet($event)"
                       class="pat-form__input" maxlength="160" />
              </div>
              <div class="pat-form__field">
                <label class="pat-form__label">Número</label>
                <input pInputText [ngModel]="streetNumber()" (ngModelChange)="setStreetNumber($event)"
                       class="pat-form__input" maxlength="20" />
              </div>
              <div class="pat-form__field">
                <label class="pat-form__label">Ciudad</label>
                <input pInputText [ngModel]="city()" (ngModelChange)="setCity($event)"
                       class="pat-form__input" maxlength="120" />
              </div>
              <div class="pat-form__field">
                <label class="pat-form__label">Provincia</label>
                <p-select
                  [options]="provinceOptions"
                  [ngModel]="province()" (ngModelChange)="setProvince($event)"
                  appendTo="body"
                  [showClear]="true"
                  placeholder="Seleccioná una provincia"
                  class="w-full" />
              </div>
            </div>
          </section>

          <!-- (3) Contactos -->
          <section class="pat-form__card">
            <div class="pat-form__card-header"><span>Contactos</span></div>
            @if (contacts().length === 0) {
              <p class="dfd-empty">No hay contactos cargados todavía.</p>
            } @else {
              <div class="dfd-contacts">
                @for (c of contacts(); track $index) {
                  <div class="dfd-contact-row">
                    <p-select
                      [options]="contactTypeOptions"
                      optionLabel="label"
                      optionValue="value"
                      [ngModel]="c.contactType"
                      (ngModelChange)="setContactType($index, $event)"
                      appendTo="body"
                      class="dfd-contact-type" />
                    <input pInputText [ngModel]="c.value" (ngModelChange)="setContactValue($index, $event)"
                           class="pat-form__input dfd-contact-value" maxlength="255"
                           placeholder="Valor del contacto" />
                    <p-button icon="pi pi-trash" severity="danger" text type="button"
                              (onClick)="removeContact($index)" />
                  </div>
                }
              </div>
            }
            <p-button label="Agregar contacto" icon="pi pi-plus" severity="secondary" text
                      type="button" [disabled]="!canAddContact()" (onClick)="addContact()" />
          </section>

          <!-- (4) Observaciones -->
          <section class="pat-form__card">
            <div class="pat-form__card-header"><span>Observaciones</span></div>
            <div class="pat-form__grid pat-form__grid--full">
              <div class="pat-form__field">
                <textarea pTextarea [ngModel]="notes()" (ngModelChange)="setNotes($event)"
                          class="pat-form__input" rows="3" maxlength="1000"></textarea>
              </div>
            </div>
          </section>
        </div>

        <div class="pat-form__footer">
          @if (editing()) {
            @if (lab?.active) {
              <p-button label="Dar de baja" severity="danger" text type="button"
                        (onClick)="onToggle(true)" />
            } @else {
              <p-button label="Reactivar" severity="success" text type="button"
                        (onClick)="onToggle(false)" />
            }
          }
          <span style="flex:1"></span>
          <p-button label="Cancelar" severity="secondary" text type="button"
                    (onClick)="cancel.emit()" />
          <p-button
            [label]="editing() ? 'Guardar cambios' : 'Dar de alta'"
            severity="primary"
            type="button"
            [disabled]="!canSave() || saving"
            [loading]="saving"
            (onClick)="onSave()" />
        </div>
      </div>
    </p-drawer>
  `,
  styles: [`
    .dfd-empty { font-size: 12px; color: var(--ds-text-muted); margin: 0 0 var(--space-2); }
    .dfd-contacts { display: flex; flex-direction: column; gap: var(--space-2); margin-bottom: var(--space-2); }
    .dfd-contact-row { display: flex; align-items: center; gap: var(--space-2); }
    .dfd-contact-type { flex: 0 0 150px; }
    .dfd-contact-value { flex: 1; }
  `],
})
export class DerivadoFormDrawerComponent implements OnChanges {
  @Input() visible = false;
  @Input() lab: ExternalLab | null = null;
  @Input() saving = false;

  @Output() cancel = new EventEmitter<void>();
  @Output() save = new EventEmitter<ExternalLabRequest>();
  @Output() toggleActive = new EventEmitter<{ id: number; deleted: boolean }>();

  visibleInternal = false;
  readonly editing = signal(false);

  readonly name = signal('');
  readonly taxId = signal('');
  readonly responsibleName = signal('');
  readonly notes = signal('');
  readonly street = signal('');
  readonly streetNumber = signal('');
  readonly city = signal('');
  readonly province = signal<string | null>(null);
  readonly contacts = signal<ContactRow[]>([]);

  private dirty = signal(false);

  readonly provinceOptions = PROVINCIAS;
  readonly contactTypeOptions: ContactTypeOption[] = CONTACT_TYPES.map((value) => ({
    label: CONTACT_TYPE_LABEL[value], value,
  }));

  /**
   * Regla del plan: name no vacío + todo contacto con value no vacío + (nuevo o hubo cambios).
   * Los contactos con value vacío se descartan al guardar, pero acá bloquean el submit para
   * evitar guardar filas a medio cargar.
   */
  readonly canSave = computed(() =>
    this.name().trim() !== ''
    && this.contacts().every((c) => c.value.trim() !== '')
    && (!this.editing() || this.dirty()));

  readonly canAddContact = computed(() => this.contacts().length < CONTACT_TYPES.length);

  private wasVisible = false;

  ngOnChanges(changes: SimpleChanges): void {
    if ('lab' in changes || 'visible' in changes) {
      this.editing.set(!!this.lab);
    }
    if ('visible' in changes) {
      this.visibleInternal = this.visible;
      if (this.visible && !this.wasVisible) {
        this.hydrate();
      }
      this.wasVisible = this.visible;
    }
  }

  private hydrate(): void {
    const lab = this.lab;
    this.name.set(lab?.name ?? '');
    this.taxId.set(lab?.taxId ?? '');
    this.responsibleName.set(lab?.responsibleName ?? '');
    this.notes.set(lab?.notes ?? '');
    this.street.set(lab?.address?.street ?? '');
    this.streetNumber.set(lab?.address?.streetNumber ?? '');
    this.city.set(lab?.address?.city ?? '');
    this.province.set(lab?.address?.province || null);
    this.contacts.set((lab?.contacts ?? []).map((c) => ({ ...c })));
    this.dirty.set(false);
  }

  setName(v: string): void { this.name.set(v); this.markDirty(); }
  setTaxId(v: string): void { this.taxId.set(v); this.markDirty(); }
  setResponsible(v: string): void { this.responsibleName.set(v); this.markDirty(); }
  setNotes(v: string): void { this.notes.set(v); this.markDirty(); }
  setStreet(v: string): void { this.street.set(v); this.markDirty(); }
  setStreetNumber(v: string): void { this.streetNumber.set(v); this.markDirty(); }
  setCity(v: string): void { this.city.set(v); this.markDirty(); }
  setProvince(v: string | null): void { this.province.set(v); this.markDirty(); }

  addContact(): void {
    const used = new Set(this.contacts().map((c) => c.contactType));
    const next = CONTACT_TYPES.find((t) => !used.has(t)) ?? CONTACT_TYPES[0];
    this.contacts.update((rows) => [...rows, { contactType: next, value: '' }]);
    this.markDirty();
  }

  removeContact(index: number): void {
    this.contacts.update((rows) => rows.filter((_, i) => i !== index));
    this.markDirty();
  }

  setContactType(index: number, contactType: ContactType): void {
    this.contacts.update((rows) => rows.map((r, i) => (i === index ? { ...r, contactType } : r)));
    this.markDirty();
  }

  setContactValue(index: number, value: string): void {
    this.contacts.update((rows) => rows.map((r, i) => (i === index ? { ...r, value } : r)));
    this.markDirty();
  }

  private markDirty(): void {
    this.dirty.set(true);
  }

  onSave(): void {
    if (!this.canSave()) return;
    this.save.emit(this.buildRequest());
  }

  /** Descarta contactos con value vacío y arma el request para el store. */
  buildRequest(): ExternalLabRequest {
    const trimOrNull = (v: string): string | null => (v.trim() === '' ? null : v.trim());
    return {
      name: this.name().trim(),
      taxId: trimOrNull(this.taxId()),
      responsibleName: trimOrNull(this.responsibleName()),
      notes: trimOrNull(this.notes()),
      address: {
        street: this.street().trim(),
        streetNumber: this.streetNumber().trim(),
        city: this.city().trim(),
        province: this.province() ?? '',
      },
      contacts: this.contacts()
        .filter((c) => c.value.trim() !== '')
        .map((c) => ({ contactType: c.contactType, value: c.value.trim() })),
    };
  }

  onToggle(deleted: boolean): void {
    if (!this.lab) return;
    this.toggleActive.emit({ id: this.lab.id, deleted });
  }

  onVisibleChange(open: boolean): void {
    this.visibleInternal = open;
    if (!open) this.cancel.emit();
  }
}

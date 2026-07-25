import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TagModule } from 'primeng/tag';

import { ContactType, ExternalLab } from '../../../models/external-lab.model';

/** Cuántos íconos de contacto se muestran antes de colapsar en "+N". */
const MAX_CONTACT_ICONS = 4;

/** Mapa tipo de contacto → clase de ícono PrimeNG. */
const CONTACT_ICON: Record<ContactType, string> = {
  PHONE: 'pi pi-phone',
  MOBILE: 'pi pi-mobile',
  EMAIL: 'pi pi-envelope',
  WHATSAPP: 'pi pi-whatsapp',
  FAX: 'pi pi-print',
  WEBSITE: 'pi pi-globe',
};

@Component({
  selector: 'emp-derivaciones-table',
  standalone: true,
  imports: [TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="thead-card der-grid">
      <span>LABORATORIO</span>
      <span>RESPONSABLE</span>
      <span>UBICACIÓN</span>
      <span>CONTACTOS</span>
      <span></span>
    </div>

    <section class="grp-card">
      @for (l of labs(); track l.id) {
        <div class="row der-grid der-row" [class.is-baja]="!l.active" (click)="edit.emit(l)">
          <div class="t-name">
            <span class="t-title">
              {{ l.name }}
              @if (!l.active) {
                <p-tag value="DE BAJA" severity="warn" />
              }
            </span>
            <span class="t-sub">{{ subtitle(l) }}</span>
          </div>

          <div class="t-resp">
            @if (l.responsibleName) {
              <span>{{ l.responsibleName }}</span>
            } @else {
              <span class="muted">—</span>
            }
          </div>

          <div class="t-loc">
            @if (location(l)) {
              <span class="loc-val"><i class="pi pi-map-marker"></i> {{ location(l) }}</span>
            } @else {
              <span class="muted">—</span>
            }
          </div>

          <div class="t-contacts">
            @if (l.contacts.length === 0) {
              <span class="muted">—</span>
            } @else {
              @for (c of visibleContacts(l.contacts); track $index) {
                <span class="c-icon" [title]="c.value"><i [class]="icon(c.contactType)"></i></span>
              }
              @if (extraContacts(l.contacts) > 0) {
                <span class="c-count">+{{ extraContacts(l.contacts) }}</span>
              }
            }
          </div>

          <div class="t-go"><i class="pi pi-pencil"></i></div>
        </div>
      } @empty {
        <div class="tbl-empty">No hay laboratorios derivados que coincidan con el filtro.</div>
      }
    </section>
  `,
  styles: [`
    :host {
      --accent: #5b54e6; --orange: #e0820a; --ink: #1f2433; --muted: #8a90a3;
      --line: #eceef3; --line-2: #f1f2f6;
      --grid-der: minmax(220px, 1.8fr) minmax(140px, 1.2fr) minmax(160px, 1.4fr) minmax(120px, 1fr) 44px;
      display: block;
    }
    .der-grid { display: grid; grid-template-columns: var(--grid-der); align-items: center; gap: 14px; }
    .thead-card {
      background: #fff; border: 1px solid var(--line); padding: 0 18px; height: 46px; border-radius: 14px;
      box-shadow: 0 1px 3px #0b132a0a; margin-bottom: 14px;
    }
    .thead-card > span { font-size: 10.5px; font-weight: 700; letter-spacing: .1em; color: var(--muted); text-transform: uppercase; }
    .grp-card { background: #fff; border: 1px solid var(--line); border-radius: 16px; box-shadow: 0 1px 3px #0b132a0a; overflow: hidden; }
    .der-row { padding: 13px 18px; cursor: pointer; transition: background .12s; border-bottom: 1px solid var(--line-2); }
    .der-row:last-child { border-bottom: none; }
    .der-row:hover { background: #fafbff; }
    .der-row.is-baja { background: #fbfbfc; }
    .der-row.is-baja .t-title { color: var(--muted); }
    .t-name { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
    .t-title { display: inline-flex; align-items: center; gap: 8px; font-size: 14.5px; font-weight: 600; color: #1f242b; }
    .t-sub { font-size: 11.5px; color: var(--muted); }
    .t-resp { font-size: 13.5px; color: var(--ink); }
    .t-loc .loc-val { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--ink); }
    .t-loc .loc-val i { color: var(--muted); font-size: 12px; }
    .t-contacts { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .c-icon {
      display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 7px;
      background: color-mix(in srgb, var(--accent) 10%, white); color: var(--accent); font-size: 12px;
    }
    .c-count { font-size: 12px; font-weight: 700; color: var(--muted); }
    .muted { color: var(--muted); }
    .t-go { color: #b5bcc4; display: flex; justify-content: flex-end; }
    .der-row:hover .t-go { color: var(--accent); }
    .tbl-empty { padding: 40px; text-align: center; color: var(--muted); font-size: 14px; }
  `],
})
export class DerivacionesTableComponent {
  readonly labs = input.required<readonly ExternalLab[]>();
  readonly loading = input<boolean>(false);

  readonly edit = output<ExternalLab>();

  private readonly datePipe = new DatePipe('en-US');

  subtitle(lab: ExternalLab): string {
    const parts: string[] = [];
    if (lab.taxId) parts.push(`CUIT ${lab.taxId}`);
    if (lab.updatedAt) {
      const fecha = this.datePipe.transform(lab.updatedAt, 'dd/MM/yyyy');
      if (fecha) parts.push(`editado ${fecha}`);
    }
    return parts.join(' · ');
  }

  location(lab: ExternalLab): string {
    return [lab.address?.city, lab.address?.province].filter(Boolean).join(', ');
  }

  icon(type: ContactType): string {
    return CONTACT_ICON[type];
  }

  visibleContacts(contacts: ExternalLab['contacts']): ExternalLab['contacts'] {
    return contacts.slice(0, MAX_CONTACT_ICONS);
  }

  extraContacts(contacts: ExternalLab['contacts']): number {
    return Math.max(0, contacts.length - MAX_CONTACT_ICONS);
  }
}

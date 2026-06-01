import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Output,
  computed,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { Popover, PopoverModule } from 'primeng/popover';
import { BoxOccupancyItem } from '../../models/extraction.model';

interface BoxRow {
  box: number;
  who: string | null;
  attentionNumber: string | null;
  state: 'YOU' | 'BUSY' | 'FREE';
  occupiedByOther: boolean;
}

/**
 * FAB en el top-right del header. Muestra "Box N · TÚ" cuando hay box
 * configurado o "Configurar box" cuando no. Click abre un popover con la
 * lista de boxes (mi fila primero, luego ocupados por otros). Footer
 * "Cambiar mi box" abre un sub-dialog para tipear un número.
 *
 * Atajos: 1-9 con el popover abierto eligen ese box; Esc cierra.
 */
@Component({
  selector: 'app-box-fab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    PopoverModule,
    DialogModule,
    InputNumberModule,
    ButtonModule,
  ],
  template: `
    <button
      type="button"
      class="box-fab"
      [class.box-fab--unset]="myBox() == null"
      [disabled]="mutating()"
      [attr.aria-label]="myBox() != null ? 'Box ' + myBox() : 'Configurar box'"
      (click)="toggleDropdown($event)"
    >
      <i class="pi pi-box"></i>
      @if (myBox() != null) {
        <span>Box {{ myBox() }}</span>
        <span class="me">TÚ</span>
      } @else {
        <span>Configurar box</span>
      }
    </button>

    <p-popover
      #pop
      appendTo="body"
      styleClass="box-fab__popover"
      (onShow)="onPopoverShown()"
      (onHide)="onPopoverHidden()"
    >
      <div class="dd">
        <header class="dd-head">
          <span class="title"><i class="pi pi-box"></i> Boxes</span>
          <button type="button" class="close" (click)="pop.hide()" aria-label="Cerrar">
            <i class="pi pi-times"></i>
          </button>
        </header>
        <div class="dd-list">
          @for (row of rows(); track row.box) {
            <button
              type="button"
              class="dd-row"
              [class.mine]="row.state === 'YOU'"
              [class.disabled]="row.occupiedByOther"
              [disabled]="row.occupiedByOther"
              (click)="onPickRow(row)"
            >
              <span class="n">{{ row.box }}</span>
              <span class="who">
                @if (row.who) {
                  <span class="who-name">{{ row.who }}</span>
                  @if (row.attentionNumber) {
                    <span class="sub">{{ row.attentionNumber }}</span>
                  }
                } @else {
                  <span class="sub italic">Sin asignar</span>
                }
              </span>
              <span class="pill-state" [class.busy]="row.state === 'BUSY'" [class.you]="row.state === 'YOU'" [class.free]="row.state === 'FREE'">
                {{ row.state === 'YOU' ? 'TÚ' : row.state === 'BUSY' ? 'En ext.' : 'Libre' }}
              </span>
            </button>
          } @empty {
            <div class="dd-empty">No hay boxes ocupados. Configurá el tuyo abajo.</div>
          }
        </div>
        <footer class="dd-foot">
          <button
            type="button"
            class="dd-foot-btn"
            (click)="openEdit()"
          >
            <i class="pi pi-pencil"></i> Cambiar mi box
          </button>
        </footer>
      </div>
    </p-popover>

    <p-dialog
      [(visible)]="editOpen"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [resizable]="false"
      header="Cambiar mi box"
      [style]="{ width: '360px' }"
    >
      <div class="edit-body">
        <label class="edit-label">Número de box</label>
        <p-inputNumber
          [(ngModel)]="draftBox"
          [min]="1"
          [max]="999"
          [showButtons]="true"
          [useGrouping]="false"
          inputId="box-fab-edit-input"
          placeholder="Ej: 3"
        />
        @if (editError()) {
          <p class="edit-error">{{ editError() }}</p>
        }
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Volver" severity="secondary" [text]="true" (onClick)="editOpen.set(false)" />
        <p-button label="Guardar" icon="pi pi-check" [disabled]="!canSaveDraft()" (onClick)="onSaveDraft()" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    :host { display: inline-flex; position: relative; }

    .box-fab {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 10px 18px;
      border-radius: 30px;
      background: var(--brand-primary, #0f766e);
      color: #fff;
      font-size: 13px;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      border: none;
      box-shadow: 0 6px 18px rgba(15,118,110,.30);
      transition: transform .12s, box-shadow .12s, background .12s;
    }
    .box-fab:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 8px 22px rgba(15,118,110,.36);
    }
    .box-fab:disabled { opacity: .65; cursor: default; }
    .box-fab i { font-size: 15px; }
    .box-fab .me {
      background: rgba(255,255,255,.22);
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 10px;
      letter-spacing: 0.6px;
    }
    .box-fab--unset {
      background: #fff;
      color: #475569;
      border: 1px solid #cbd5e1;
      box-shadow: 0 1px 2px rgba(15,23,42,.06);
    }
    .box-fab--unset:hover:not(:disabled) {
      background: #f8fafc;
    }

    .dd { width: 330px; }
    .dd-head {
      padding: 12px 16px;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .dd-head .title {
      font-size: 13px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .dd-head .title i { color: var(--brand-primary, #0f766e); font-size: 13px; }
    .dd-head .close {
      background: none;
      border: 0;
      color: #64748b;
      font-size: 14px;
      cursor: pointer;
      padding: 4px;
    }

    .dd-list { max-height: 380px; overflow: auto; }
    .dd-row {
      width: 100%;
      display: grid;
      grid-template-columns: 38px 1fr auto;
      gap: 12px;
      align-items: center;
      padding: 11px 16px;
      border: 0;
      border-bottom: 1px solid #f1f5f9;
      background: #fff;
      cursor: pointer;
      text-align: left;
      font-family: inherit;
    }
    .dd-row:hover:not(.disabled):not(.mine) { background: #f8fafc; }
    .dd-row.disabled { cursor: not-allowed; opacity: .85; }
    .dd-row.mine {
      background: #ccfbf1;
      border-left: 3px solid var(--brand-primary, #0f766e);
      padding-left: 13px;
    }
    .dd-row:last-child { border-bottom: 0; }
    .dd-row .n {
      width: 32px; height: 32px;
      border-radius: 8px;
      background: #f1f5f9;
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 13px;
    }
    .dd-row.mine .n { background: var(--brand-primary, #0f766e); color: #fff; }
    .dd-row .who { min-width: 0; }
    .dd-row .who-name { font-size: 12.5px; font-weight: 600; color: #0f172a; }
    .dd-row .sub {
      display: block;
      font-size: 11px;
      color: #64748b;
      font-weight: 400;
      margin-top: 1px;
    }
    .dd-row .sub.italic { font-style: italic; }
    .dd-row .pill-state {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .5px;
      padding: 3px 8px;
      border-radius: 8px;
      white-space: nowrap;
    }
    .dd-row .pill-state.busy { background: #fef3c7; color: #b45309; }
    .dd-row .pill-state.free { background: #d1fae5; color: #047857; }
    .dd-row .pill-state.you { background: var(--brand-primary, #0f766e); color: #fff; }
    .dd-empty {
      padding: 22px 16px;
      text-align: center;
      color: #64748b;
      font-size: 12px;
    }
    .dd-foot {
      padding: 10px 14px;
      border-top: 1px solid #f1f5f9;
      background: #fafbfc;
      display: flex;
      justify-content: flex-end;
    }
    .dd-foot-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #fff;
      border: 1px solid #e2e8f0;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      color: #0f172a;
      cursor: pointer;
      font-family: inherit;
    }
    .dd-foot-btn:hover { background: #f8fafc; }

    .edit-body { display: flex; flex-direction: column; gap: 8px; padding: 4px 0; }
    .edit-label { font-size: 13px; font-weight: 500; }
    .edit-error { color: #dc2626; font-size: 12px; margin: 4px 0 0; }
  `],
})
export class BoxFabComponent {
  readonly occupancy = input<BoxOccupancyItem[]>([]);
  readonly myBox = input<number | null>(null);
  readonly myUserId = input<number | null>(null);
  readonly mutating = input<boolean>(false);

  @Output() readonly boxSelected = new EventEmitter<number>();

  private readonly pop = viewChild<Popover>('pop');
  private readonly popoverOpen = signal(false);

  readonly editOpen = signal(false);
  readonly draftBox = signal<number | null>(null);

  readonly rows = computed<BoxRow[]>(() => {
    const occ = this.occupancy();
    const me = this.myUserId();
    const myBox = this.myBox();

    const seen = new Set<number>();
    const list: BoxRow[] = [];

    // Mi box primero — sea libre o ocupado por mí en occupancy.
    if (myBox != null) {
      const mineRow = occ.find((r) => r.box === myBox);
      list.push({
        box: myBox,
        who: mineRow ? mineRow.extractorFullName + ' (vos)' : 'Vos',
        attentionNumber: mineRow?.attentionNumber ?? null,
        state: 'YOU',
        occupiedByOther: false,
      });
      seen.add(myBox);
    }

    // Resto, ordenados por número.
    const others = occ
      .filter((r) => !seen.has(r.box))
      .sort((a, b) => a.box - b.box);

    for (const r of others) {
      const isMine = me != null && r.extractorId === me;
      list.push({
        box: r.box,
        who: isMine ? r.extractorFullName + ' (vos)' : r.extractorFullName,
        attentionNumber: r.attentionNumber,
        state: isMine ? 'YOU' : 'BUSY',
        occupiedByOther: !isMine,
      });
      seen.add(r.box);
    }

    return list;
  });

  readonly canSaveDraft = computed(() => {
    const v = this.draftBox();
    return typeof v === 'number' && Number.isInteger(v) && v >= 1;
  });

  readonly editError = computed(() => {
    const v = this.draftBox();
    if (v == null) return null;
    const me = this.myUserId();
    const occupied = this.occupancy().some(
      (r) => r.box === v && (me == null || r.extractorId !== me),
    );
    return occupied ? `El box ${v} está ocupado por otro extractor.` : null;
  });

  toggleDropdown(ev: MouseEvent): void {
    if (this.mutating()) return;
    this.pop()?.toggle(ev);
  }

  onPopoverShown(): void { this.popoverOpen.set(true); }
  onPopoverHidden(): void { this.popoverOpen.set(false); }

  onPickRow(row: BoxRow): void {
    if (row.occupiedByOther) return;
    if (row.state === 'YOU' && row.box === this.myBox()) {
      // Click sobre mi propio box: no hay nada que cambiar.
      this.pop()?.hide();
      return;
    }
    this.boxSelected.emit(row.box);
    this.pop()?.hide();
  }

  openEdit(): void {
    this.draftBox.set(this.myBox());
    this.pop()?.hide();
    this.editOpen.set(true);
  }

  onSaveDraft(): void {
    const v = this.draftBox();
    if (v == null || !Number.isInteger(v) || v < 1) return;
    if (this.editError()) return;
    this.boxSelected.emit(v);
    this.editOpen.set(false);
  }

  @HostListener('document:keydown', ['$event'])
  onKey(ev: KeyboardEvent): void {
    if (!this.popoverOpen()) return;
    if (ev.key === 'Escape') {
      this.pop()?.hide();
      return;
    }
    // 1–9 → seleccionar ese box si está libre.
    if (ev.key >= '1' && ev.key <= '9') {
      const n = Number.parseInt(ev.key, 10);
      const me = this.myUserId();
      const occupied = this.occupancy().some(
        (r) => r.box === n && (me == null || r.extractorId !== me),
      );
      if (occupied) {
        // El padre maneja notificación si quiere; acá solo no emitimos.
        return;
      }
      ev.preventDefault();
      this.boxSelected.emit(n);
      this.pop()?.hide();
    }
  }
}

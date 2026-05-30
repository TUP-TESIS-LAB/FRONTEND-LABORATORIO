import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { Usuario } from '@features/empresa/models/usuario.model';

@Component({
  selector: 'rp-usuarios-picker',
  standalone: true,
  imports: [FormsModule, InputTextModule, IconFieldModule, InputIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-iconField iconPosition="left" class="w-full">
      <p-inputIcon><i class="pi pi-search"></i></p-inputIcon>
      <input pInputText class="w-full" placeholder="Buscar usuario..."
        [ngModel]="query()" (ngModelChange)="query.set($event)" />
    </p-iconField>

    <ul class="rp-users">
      @for (u of filtered(); track u.id) {
        <li class="rp-users__item" [class.rp-users__item--active]="u.id === selectedId"
            (click)="select.emit(u.id)">
          <div class="rp-users__avatar">{{ initials(u) }}</div>
          <div class="rp-users__meta">
            <strong>{{ u.firstName }} {{ u.lastName }}</strong>
            <small class="ui-text-muted">{{ u.email }}</small>
          </div>
        </li>
      } @empty {
        <li class="rp-users__empty">Sin usuarios.</li>
      }
    </ul>
  `,
  styles: [`
    .rp-users { list-style: none; margin: var(--space-3) 0 0; padding: 0; max-height: 60vh; overflow-y: auto; }
    .rp-users__item { display: flex; gap: 10px; align-items: center; padding: 8px; border-radius: 8px; cursor: pointer; }
    .rp-users__item:hover { background: var(--surface-100, #f1f5f9); }
    .rp-users__item--active { background: var(--surface-200, #e2e8f0); }
    .rp-users__avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--brand-secondary); color:#fff; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:600; }
    .rp-users__meta { display: flex; flex-direction: column; }
    .rp-users__empty { padding: var(--space-4); color: var(--ds-text-muted); }
    .ui-text-muted { color: var(--ds-text-muted); }
  `],
})
export class UsuariosPickerComponent {
  private readonly _usuarios = signal<Usuario[]>([]);
  readonly query = signal('');

  @Input({ required: true }) set usuarios(value: Usuario[]) { this._usuarios.set(value ?? []); }
  @Input() selectedId: number | null = null;

  @Output() select = new EventEmitter<number>();

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const list = this._usuarios();
    if (!q) return list;
    return list.filter((u) =>
      `${u.firstName} ${u.lastName} ${u.email} ${u.username}`.toLowerCase().includes(q),
    );
  });

  initials(u: Usuario): string {
    return ((u.firstName?.[0] ?? '') + (u.lastName?.[0] ?? '')).toUpperCase();
  }
}

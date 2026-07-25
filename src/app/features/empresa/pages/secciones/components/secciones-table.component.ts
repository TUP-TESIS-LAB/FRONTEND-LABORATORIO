import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { BranchTag, SectionListItemWithCount } from '../../../models/section-list-item.model';

/** Cuántas sucursales se muestran como tag antes de colapsar en "+N". */
const MAX_BRANCH_TAGS = 3;

@Component({
  selector: 'emp-secciones-table',
  standalone: true,
  imports: [TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="thead-card sec-grid">
      <span>SECCIÓN</span>
      <span class="ta-c">ANÁLISIS</span>
      <span>SUCURSALES QUE LA USAN</span>
      <span>ESTADO</span>
      <span></span>
    </div>

    <section class="grp-card">
      @for (s of secciones(); track s.id) {
        <div class="row sec-grid sec-row" (click)="edit.emit(s)">
          <div class="t-name"><span class="t-title">{{ s.name }}</span></div>
          <div class="ta-c"><span class="count-pill">{{ s.analysisCount }}</span></div>
          <div class="t-suc">
            @if (s.branches.length === 0) {
              <span class="no-use"><i class="pi pi-exclamation-triangle"></i> Sin uso</span>
            } @else {
              @for (b of visibleBranches(s.branches); track b.id) {
                <span class="suc-tag">{{ b.code }}</span>
              }
              @if (extraBranches(s.branches) > 0) {
                <span class="suc-tag more">+{{ extraBranches(s.branches) }}</span>
              }
            }
          </div>
          <div>
            <p-tag [value]="s.active ? 'Activa' : 'Inactiva'"
                   [severity]="s.active ? 'success' : 'warn'" />
          </div>
          <div class="t-go"><i class="pi pi-pencil"></i></div>
        </div>
      } @empty {
        <div class="tbl-empty">No hay secciones que coincidan con el filtro.</div>
      }
    </section>
  `,
  styles: [`
    :host {
      --accent: #5b54e6; --orange: #e0820a; --ink: #1f2433; --muted: #8a90a3;
      --line: #eceef3; --line-2: #f1f2f6;
      --grid-sec: minmax(200px, 1.6fr) 90px minmax(180px, 1.7fr) 120px 44px;
      display: block;
    }
    .sec-grid { display: grid; grid-template-columns: var(--grid-sec); align-items: center; gap: 14px; }
    .thead-card {
      background: #fff; border: 1px solid var(--line); padding: 0 18px; height: 46px; border-radius: 14px;
      box-shadow: 0 1px 3px #0b132a0a; margin-bottom: 14px;
    }
    .thead-card > span { font-size: 10.5px; font-weight: 700; letter-spacing: .1em; color: var(--muted); text-transform: uppercase; }
    .ta-c { text-align: center; }
    .grp-card { background: #fff; border: 1px solid var(--line); border-radius: 16px; box-shadow: 0 1px 3px #0b132a0a; overflow: hidden; }
    .sec-row { padding: 13px 18px; cursor: pointer; transition: background .12s; border-bottom: 1px solid var(--line-2); }
    .sec-row:last-child { border-bottom: none; }
    .sec-row:hover { background: #fafbff; }
    .t-name { display: flex; flex-direction: column; gap: 3px; }
    .t-title { font-size: 14.5px; font-weight: 600; color: #1f242b; }
    .count-pill { display: inline-grid; place-items: center; min-width: 26px; height: 24px; padding: 0 8px; border-radius: 13px; background: color-mix(in srgb, var(--accent) 12%, white); color: var(--accent); font-size: 13px; font-weight: 700; }
    .t-suc { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .suc-tag { font-size: 11px; font-weight: 700; letter-spacing: .02em; color: #3c4147; background: #fff; border: 1px solid #cdd3da; border-radius: 5px; padding: 3px 7px; }
    .suc-tag.more { color: var(--muted); background: #f1f3f5; border-style: dashed; }
    .no-use { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; color: var(--orange); background: color-mix(in srgb, var(--orange) 8%, white); border: 1px solid color-mix(in srgb, var(--orange) 40%, white); border-radius: 6px; padding: 4px 9px; }
    .t-go { color: #b5bcc4; display: flex; justify-content: flex-end; }
    .sec-row:hover .t-go { color: var(--accent); }
    .tbl-empty { padding: 40px; text-align: center; color: var(--muted); font-size: 14px; }
  `],
})
export class SeccionesTableComponent {
  readonly secciones = input.required<readonly SectionListItemWithCount[]>();
  readonly loading = input<boolean>(false);

  readonly edit = output<SectionListItemWithCount>();

  visibleBranches(branches: BranchTag[]): BranchTag[] {
    return branches.slice(0, MAX_BRANCH_TAGS);
  }

  extraBranches(branches: BranchTag[]): number {
    return Math.max(0, branches.length - MAX_BRANCH_TAGS);
  }
}

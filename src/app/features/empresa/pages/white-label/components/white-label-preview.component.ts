import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'emp-wl-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="emp-wl-preview"
         [style.--p-primary]="primaryColor"
         [style.--p-secondary]="secondaryColor">
      <aside class="emp-wl-preview__sidebar">
        @if (lightLogoUrl) {
          <img [src]="lightLogoUrl" alt="logo" />
        } @else {
          <div class="emp-wl-preview__logo-fallback">{{ initials() }}</div>
        }
        <span>{{ systemName }}</span>
      </aside>
      <div class="emp-wl-preview__main">
        <div class="emp-wl-preview__topbar"></div>
        <div class="emp-wl-preview__content">
          <div class="emp-wl-preview__btn">Botón primario</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .emp-wl-preview {
      display: grid; grid-template-columns: 200px 1fr;
      height: 320px; border-radius: 8px; overflow: hidden;
      border: 1px solid var(--ds-surface);
    }
    .emp-wl-preview__sidebar {
      background: var(--p-primary, #2563eb); color: #fff;
      padding: var(--space-4);
      display: flex; flex-direction: column; align-items: center; gap: var(--space-3);
    }
    .emp-wl-preview__sidebar img { max-width: 120px; max-height: 48px; }
    .emp-wl-preview__logo-fallback {
      width: 48px; height: 48px; border-radius: 8px;
      background: rgba(255,255,255,0.18); display: flex;
      align-items: center; justify-content: center; font-weight: 700;
    }
    .emp-wl-preview__main { background: var(--ds-bg); display: flex; flex-direction: column; }
    .emp-wl-preview__topbar {
      height: 48px; background: var(--p-primary, #2563eb); opacity: 0.92;
    }
    .emp-wl-preview__content {
      padding: var(--space-6); flex: 1; display: flex; align-items: center; justify-content: center;
    }
    .emp-wl-preview__btn {
      padding: var(--space-3) var(--space-5);
      background: var(--p-secondary, #0EA5A4); color: #fff; border-radius: 6px; font-weight: 600;
    }
  `],
})
export class WhiteLabelPreviewComponent {
  @Input({ required: true }) systemName!: string;
  @Input({ required: true }) primaryColor!: string;
  @Input({ required: true }) secondaryColor!: string;
  @Input() lightLogoUrl: string | null = null;

  initials(): string {
    return (this.systemName || '?')
      .split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  }
}

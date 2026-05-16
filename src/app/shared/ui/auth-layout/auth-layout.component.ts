import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';

@Component({
  selector: 'ui-auth-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="auth-screen">
      <div class="auth-bg"></div>
      <div class="auth-grid"></div>

      <div class="auth-card">
        <div class="auth-card__header">
          <div class="auth-card__logo">LA</div>
          <span class="auth-card__tenant-name">{{ tenantName() }}</span>
          <span class="auth-card__tenant-sub">{{ tenantTagline() }}</span>
        </div>

        <div class="auth-card__body">
          <ng-content />
        </div>

        <div class="auth-card__footer">
          LaboratoApp v2.4.1 · Términos de uso · Privacidad
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-screen {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--ds-bg);
      overflow-y: auto;
      padding: var(--space-6);
    }

    .auth-bg {
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg,
        var(--brand-shell-bg) 0%,
        var(--brand-primary) 55%,
        var(--brand-tint-strong) 100%);
      opacity: .08;
      pointer-events: none;
    }
    .auth-grid {
      position: absolute;
      inset: 0;
      background-image: radial-gradient(
        circle,
        color-mix(in srgb, var(--brand-primary) 20%, transparent) 1px,
        transparent 1px);
      background-size: 28px 28px;
      pointer-events: none;
      opacity: .35;
    }

    .auth-card {
      position: relative;
      width: 100%;
      max-width: 400px;
      background: #fff;
      border-radius: 16px;
      box-shadow:
        0 8px 40px rgba(0,0,0,.12),
        0 2px 8px rgba(0,0,0,.06);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .auth-card__header {
      background: var(--brand-shell-bg);
      padding: var(--space-6) var(--space-6) var(--space-5);
      text-align: center;
      color: #fff;
    }
    .auth-card__logo {
      width: 48px;
      height: 48px;
      background: #fff;
      color: var(--brand-primary);
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 800;
      margin-bottom: var(--space-2);
      letter-spacing: -.5px;
    }
    .auth-card__tenant-name {
      display: block;
      font-size: 17px;
      font-weight: 700;
    }
    .auth-card__tenant-sub {
      display: block;
      font-size: 11px;
      color: rgba(255,255,255,.65);
      margin-top: 2px;
    }

    .auth-card__body { padding: var(--space-6); }
    .auth-card__title {
      font-size: 16px;
      font-weight: 700;
      color: var(--ds-text);
      margin: 0 0 var(--space-1);
    }
    .auth-card__subtitle {
      font-size: 12px;
      color: var(--ds-text-muted);
      line-height: 1.5;
      margin: 0 0 var(--space-5);
    }

    .auth-field {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      margin-bottom: var(--space-3);
    }
    .auth-field label {
      font-size: 11px;
      font-weight: 600;
      color: #374151;
    }

    .auth-input {
      border: 1px solid #d1d5db;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 13px;
      color: #111827;
      background: #fff;
      width: 100%;
      transition: border-color .15s, box-shadow .15s;
      font-family: inherit;
      min-height: var(--ds-touch-target);
    }
    .auth-input:focus {
      outline: none;
      border-color: var(--brand-primary);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-primary) 18%, transparent);
    }

    .auth-input-wrap { position: relative; }
    .auth-input-wrap .auth-input { padding-right: 38px; }
    .auth-eye {
      position: absolute;
      right: 6px;
      top: 50%;
      transform: translateY(-50%);
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      border-radius: 6px;
    }
    .auth-eye:hover { color: #374151; }

    .auth-btn {
      width: 100%;
      padding: 11px;
      background: var(--brand-primary);
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-1);
      transition: background .15s, box-shadow .15s, opacity .15s;
      min-height: var(--ds-touch-target);
      font-family: inherit;
    }
    .auth-btn:hover:not(:disabled) {
      background: var(--brand-shell-bg);
      box-shadow: 0 4px 12px color-mix(in srgb, var(--brand-primary) 30%, transparent);
    }
    .auth-btn:disabled { opacity: .7; cursor: progress; }

    .auth-link {
      color: var(--brand-primary);
      font-weight: 500;
      text-decoration: none;
      cursor: pointer;
    }
    .auth-link:hover { text-decoration: underline; }

    .auth-error {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      padding: 10px 12px;
      margin-bottom: var(--space-3);
      background: color-mix(in srgb, #ef4444 8%, transparent);
      border: 1px solid color-mix(in srgb, #ef4444 30%, transparent);
      border-radius: 8px;
      color: #b91c1c;
      font-size: 12px;
    }
    .auth-error .pi { font-size: 14px; }

    .auth-success {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      padding: 10px 12px;
      margin-bottom: var(--space-3);
      background: color-mix(in srgb, #22c55e 10%, transparent);
      border: 1px solid color-mix(in srgb, #22c55e 35%, transparent);
      border-radius: 8px;
      color: #15803d;
      font-size: 12px;
    }
    .auth-success .pi { font-size: 14px; }

    .auth-helper {
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      margin: var(--space-3) 0 0;
    }
    .auth-helper a { color: var(--brand-primary); font-weight: 500; text-decoration: none; }
    .auth-helper a:hover { text-decoration: underline; }

    .auth-card__footer {
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      padding: var(--space-3) var(--space-6);
      border-top: 1px solid #f1f5f9;
    }

    @media (max-width: 480px) {
      .auth-screen { padding: 0; }
      .auth-card { border-radius: 0; max-width: none; min-height: 100dvh; }
    }
  `],
})
export class AuthLayoutComponent {
  readonly tenantName = input<string>('LaboratoApp');
  readonly tenantTagline = input<string>('Sistema de gestión de laboratorio clínico');
}

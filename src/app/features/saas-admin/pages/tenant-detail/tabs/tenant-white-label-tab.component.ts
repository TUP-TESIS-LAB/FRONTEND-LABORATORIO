import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { upsertTenantWhiteLabel } from '../../../store/saas-admin.actions';
import { selectSaasAdminPending, selectSelectedTenantWhiteLabel } from '../../../store/saas-admin.selectors';

const HEX = /^#[0-9A-Fa-f]{6}$/;

@Component({
  selector: 'tenant-white-label-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule],
  template: `
    <div class="saas-card">
    <form [formGroup]="form" (ngSubmit)="save()" class="wl-form">
      <div class="wl-grid">
        <label class="field">
          <span>Nombre visible</span>
          <input pInputText formControlName="systemName" placeholder="Mi laboratorio" />
        </label>

        <label class="field">
          <span>Color primario</span>
          <div class="color-input">
            <input type="color" formControlName="primaryColor" class="color-native" />
            <input pInputText formControlName="primaryColor" maxlength="7" placeholder="#000000" />
          </div>
        </label>

        <label class="field">
          <span>Color secundario</span>
          <div class="color-input">
            <input type="color" formControlName="secondaryColor" class="color-native" />
            <input pInputText formControlName="secondaryColor" maxlength="7" placeholder="#000000" />
          </div>
        </label>

        <label class="field">
          <span>Logo light (URL)</span>
          <input pInputText formControlName="lightLogoUrl" placeholder="https://…" />
        </label>

        <label class="field">
          <span>Logo dark (URL)</span>
          <input pInputText formControlName="darkLogoUrl" placeholder="https://…" />
        </label>
      </div>

      <aside class="preview">
        <h3>Preview</h3>
        <div class="preview__name">{{ form.get('systemName')!.value || '—' }}</div>
        <div class="preview__colors">
          <div class="swatch" [style.background]="form.get('primaryColor')!.value || '#000'">Primario</div>
          <div class="swatch" [style.background]="form.get('secondaryColor')!.value || '#000'">Secundario</div>
        </div>
        <div class="preview__logos">
          @if (form.get('lightLogoUrl')!.value) {
            <div class="preview__bg-light"><img [src]="form.get('lightLogoUrl')!.value" alt="" /></div>
          }
          @if (form.get('darkLogoUrl')!.value) {
            <div class="preview__bg-dark"><img [src]="form.get('darkLogoUrl')!.value" alt="" /></div>
          }
        </div>
      </aside>

      <div class="wl-form__footer">
        <p-button label="Guardar" type="submit"
                  [loading]="pending()" [disabled]="form.invalid || form.pristine || pending()" />
      </div>
    </form>
    </div>
  `,
  styles: [`
    .saas-card {
      background: var(--saas-surface, #fff);
      padding: var(--space-5, 20px);
      border-radius: 10px;
      border: 1px solid var(--saas-border, #e6e8ef);
      box-shadow: 0 1px 2px rgba(15,23,42,.04);
    }
    .wl-form { display: grid; grid-template-columns: 1fr 280px; gap: 24px; align-items: start; }
    .wl-grid { display: grid; gap: 12px; }
    .field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 500; color: var(--saas-text-muted, #6b7280); }
    .color-input { display: flex; gap: 8px; align-items: center; }
    .color-native { width: 40px; height: 36px; padding: 2px; border: 1px solid var(--saas-border, #e6e8ef); border-radius: 6px; background: transparent; cursor: pointer; }
    .preview { background: var(--saas-surface-alt, #f9fafb); border: 1px solid var(--saas-border, #e6e8ef); padding: 12px; border-radius: 8px; }
    .preview h3 { color: var(--saas-text, #1a1a2e); font-size: 12px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: .05em; font-weight: 700; }
    .preview__name { font-weight: 600; color: var(--saas-text, #1a1a2e); }
    .preview__colors { display: flex; gap: 6px; margin-top: 8px; }
    .swatch { padding: 16px 8px; border-radius: 6px; color: white; font-size: 10px; text-align: center; flex: 1; }
    .preview__logos { display: flex; gap: 6px; margin-top: 8px; }
    .preview__bg-light, .preview__bg-dark { padding: 8px; border-radius: 6px; }
    .preview__bg-light { background: white; }
    .preview__bg-dark  { background: #0f172a; }
    .preview img { max-width: 80px; max-height: 40px; display: block; }
    .wl-form__footer { grid-column: 1 / -1; display: flex; justify-content: flex-end; }
  `],
})
export class TenantWhiteLabelTabComponent {
  readonly tenantId = input.required<number>();

  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);

  private readonly current = this.store.selectSignal(selectSelectedTenantWhiteLabel);
  protected readonly pending = this.store.selectSignal(selectSaasAdminPending);

  readonly form = this.fb.nonNullable.group({
    systemName: ['', Validators.required],
    primaryColor: ['#000000', [Validators.required, Validators.pattern(HEX)]],
    secondaryColor: ['#000000', [Validators.required, Validators.pattern(HEX)]],
    lightLogoUrl: [null as string | null],
    darkLogoUrl: [null as string | null],
  });

  constructor() {
    effect(() => {
      const wl = this.current();
      if (wl) {
        this.form.reset({
          systemName: wl.systemName,
          primaryColor: wl.primaryColor,
          secondaryColor: wl.secondaryColor,
          lightLogoUrl: wl.lightLogoUrl,
          darkLogoUrl: wl.darkLogoUrl,
        });
      }
    });
  }

  save(): void {
    if (this.form.invalid || this.form.pristine) return;
    const v = this.form.getRawValue();
    this.store.dispatch(upsertTenantWhiteLabel({
      tenantId: this.tenantId(),
      req: {
        systemName: v.systemName,
        primaryColor: v.primaryColor,
        secondaryColor: v.secondaryColor,
        lightLogoUrl: v.lightLogoUrl || null,
        darkLogoUrl: v.darkLogoUrl || null,
      },
    }));
    this.form.markAsPristine();
  }
}

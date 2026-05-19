import {
  ChangeDetectionStrategy, Component, OnInit, computed, effect, inject,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ColorPickerModule } from 'primeng/colorpicker';

import { loadWhiteLabel, saveWhiteLabel } from '../../store/empresa.actions';
import { selectWhiteLabel, selectEmpresaPending } from '../../store/empresa.selectors';
import { WhiteLabelPreviewComponent } from './components/white-label-preview.component';

const HEX = /^#[0-9A-Fa-f]{6}$/;

@Component({
  selector: 'emp-white-label-page',
  standalone: true,
  imports: [
    ReactiveFormsModule, ButtonModule, InputTextModule, ColorPickerModule,
    WhiteLabelPreviewComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="emp-wl">
      <form [formGroup]="form" class="pat-form" (ngSubmit)="save()" style="padding:0">
        <section class="pat-form__card">
          <div class="pat-form__card-header">
            <span><i class="pi pi-cog" style="margin-right:6px"></i>Identidad del sistema</span>
          </div>
          <div class="pat-form__grid pat-form__grid--full">
            <div class="pat-form__field">
              <label class="pat-form__label">Nombre del sistema*</label>
              <input pInputText formControlName="systemName" class="pat-form__input" placeholder="LaboratoApp" />
            </div>
          </div>
        </section>

        <section class="pat-form__card">
          <div class="pat-form__card-header">
            <span><i class="pi pi-palette" style="margin-right:6px"></i>Paleta de marca</span>
          </div>
          <div class="pat-form__grid">
            <div class="pat-form__field">
              <label class="pat-form__label">Color principal (#RRGGBB)*</label>
              <div style="display:flex; gap:var(--space-2); align-items:center;">
                <input pInputText formControlName="primaryColor" class="pat-form__input" placeholder="#1d4ed8" />
                <p-colorPicker formControlName="primaryColor" />
              </div>
            </div>
            <div class="pat-form__field">
              <label class="pat-form__label">Color secundario (#RRGGBB)*</label>
              <div style="display:flex; gap:var(--space-2); align-items:center;">
                <input pInputText formControlName="secondaryColor" class="pat-form__input" placeholder="#0ea5a4" />
                <p-colorPicker formControlName="secondaryColor" />
              </div>
            </div>
          </div>
        </section>

        <section class="pat-form__card">
          <div class="pat-form__card-header">
            <span><i class="pi pi-image" style="margin-right:6px"></i>Logos</span>
          </div>
          <div class="pat-form__grid">
            <div class="pat-form__field">
              <label class="pat-form__label">URL logo claro</label>
              <input pInputText formControlName="lightLogoUrl" class="pat-form__input" placeholder="https://..." />
            </div>
            <div class="pat-form__field">
              <label class="pat-form__label">URL logo oscuro</label>
              <input pInputText formControlName="darkLogoUrl" class="pat-form__input" placeholder="https://..." />
            </div>
          </div>
          <p class="ui-text-sm ui-text-muted" style="margin-top: var(--space-2)">
            Próximamente vas a poder subir el logo directamente en lugar de pegar la URL.
          </p>
        </section>

        <div class="pat-form__footer">
          <p-button
            type="submit" label="Guardar cambios" severity="primary"
            [disabled]="!canSave() || pending()"
            [loading]="pending()" />
        </div>
      </form>

      <aside class="emp-wl__preview">
        <h4>Vista previa</h4>
        <emp-wl-preview
          [systemName]="formValue().systemName || 'Sistema'"
          [primaryColor]="formValue().primaryColor || '#2563EB'"
          [secondaryColor]="formValue().secondaryColor || '#0EA5A4'"
          [lightLogoUrl]="formValue().lightLogoUrl || null" />
        <p class="ui-text-muted" style="margin-top: var(--space-3)">
          La identidad visual aplica a las zonas de gestión y portal del tenant.
          Las zonas clínicas mantienen una paleta fija.
        </p>
      </aside>
    </div>
  `,
  styles: [`
    .emp-wl {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: var(--space-6); align-items: start;
    }
    @media (max-width: 1024px) { .emp-wl { grid-template-columns: 1fr; } }
    .emp-wl__preview h4 { margin: 0 0 var(--space-3); }
  `],
})
export class WhiteLabelPage implements OnInit {
  private readonly store = inject(Store);
  private readonly fb = inject(FormBuilder);

  readonly whiteLabel = this.store.selectSignal(selectWhiteLabel);
  readonly pending = this.store.selectSignal(selectEmpresaPending);

  form = this.fb.group({
    systemName: ['', [Validators.required]],
    primaryColor: ['#2563EB', [Validators.required, Validators.pattern(HEX)]],
    secondaryColor: ['#0EA5A4', [Validators.required, Validators.pattern(HEX)]],
    lightLogoUrl: [''],
    darkLogoUrl: [''],
  });

  readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly canSave = computed(() => this.status() === 'VALID');

  constructor() {
    // Hidratar el form cuando llega data del store.
    effect(() => {
      const wl = this.whiteLabel();
      if (wl) {
        this.form.reset({
          systemName: wl.systemName,
          primaryColor: wl.primaryColor,
          secondaryColor: wl.secondaryColor,
          lightLogoUrl: wl.lightLogoUrl ?? '',
          darkLogoUrl: wl.darkLogoUrl ?? '',
        });
      }
    });
  }

  ngOnInit(): void {
    this.store.dispatch(loadWhiteLabel());
  }

  save(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.store.dispatch(
      saveWhiteLabel({
        payload: {
          systemName: v.systemName!,
          primaryColor: v.primaryColor!,
          secondaryColor: v.secondaryColor!,
          lightLogoUrl: v.lightLogoUrl || null,
          darkLogoUrl: v.darkLogoUrl || null,
        },
      }),
    );
  }
}

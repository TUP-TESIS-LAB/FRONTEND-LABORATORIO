import {
  ChangeDetectionStrategy, Component, OnInit, computed, effect, inject,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ColorPickerModule } from 'primeng/colorpicker';
import { FloatLabelModule } from 'primeng/floatlabel';
import { Message } from 'primeng/message';

import { loadWhiteLabel, saveWhiteLabel } from '../../store/empresa.actions';
import { selectWhiteLabel, selectEmpresaPending } from '../../store/empresa.selectors';
import { WhiteLabelPreviewComponent } from './components/white-label-preview.component';

const HEX = /^#[0-9A-Fa-f]{6}$/;

@Component({
  selector: 'emp-white-label-page',
  standalone: true,
  imports: [
    ReactiveFormsModule, ButtonModule, InputTextModule, ColorPickerModule,
    FloatLabelModule, Message, WhiteLabelPreviewComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="emp-wl">
      <form [formGroup]="form" class="emp-wl__form" (ngSubmit)="save()">
        <p-floatlabel>
          <input pInputText id="systemName" formControlName="systemName" />
          <label for="systemName">Nombre del sistema</label>
        </p-floatlabel>

        <div class="emp-wl__row">
          <p-floatlabel>
            <input pInputText id="primary" formControlName="primaryColor" />
            <label for="primary">Color principal (#RRGGBB)</label>
          </p-floatlabel>
          <p-colorPicker formControlName="primaryColor" />
        </div>

        <div class="emp-wl__row">
          <p-floatlabel>
            <input pInputText id="secondary" formControlName="secondaryColor" />
            <label for="secondary">Color de acento (#RRGGBB)</label>
          </p-floatlabel>
          <p-colorPicker formControlName="secondaryColor" />
        </div>

        <p-floatlabel>
          <input pInputText id="lightLogo" formControlName="lightLogoUrl" />
          <label for="lightLogo">URL logo claro</label>
        </p-floatlabel>

        <p-floatlabel>
          <input pInputText id="darkLogo" formControlName="darkLogoUrl" />
          <label for="darkLogo">URL logo oscuro</label>
        </p-floatlabel>

        <p-message severity="info"
          text="Próximamente vas a poder subir el logo directamente en lugar de pegar la URL." />

        <div class="emp-wl__actions">
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
      gap: var(--space-6);
    }
    @media (max-width: 1024px) { .emp-wl { grid-template-columns: 1fr; } }
    .emp-wl__form { display: flex; flex-direction: column; gap: var(--space-5); }
    .emp-wl__row { display: grid; grid-template-columns: 1fr auto; gap: var(--space-3); align-items: end; }
    .emp-wl__actions { display: flex; justify-content: flex-end; }
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
  readonly canSave = computed(() => this.status() === 'VALID' && this.form.dirty);

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

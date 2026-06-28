import {
  ChangeDetectionStrategy, Component, forwardRef, inject, signal,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SignaturePadComponent } from '@shared/ui/components/signature-pad/signature-pad.component';
import { NotificationService } from '@core/services/notification.service';

type SignatureMode = 'draw' | 'upload' | 'text';

/** Tipos de imagen aceptados al subir una firma. */
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg'];
/** Tamaño máximo del archivo de firma (2 MB). */
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/**
 * Selector de firma con 3 modos — Dibujar / Subir imagen / Texto — que SIEMPRE
 * produce un `base64 PNG dataURL` como valor del control. El back recibe siempre
 * un PNG, sin saber con qué modo se generó.
 *
 * - Dibujar: REUSA `SignaturePadComponent` (no lo duplica ni lo modifica; el
 *   pad sigue funcionando igual para el form de médico que lo usa directo).
 * - Subir imagen: input file PNG/JPG ≤2MB → `FileReader.readAsDataURL`. Si el
 *   archivo no cumple, muestra un mensaje en español (sin emoji) y NO setea el valor.
 * - Texto: input de texto → se rasteriza en un canvas con fuente tipo firma →
 *   `toDataURL('image/png')`.
 *
 * `ControlValueAccessor`: se usa con `formControlName`. `writeValue(dataURL)`
 * precarga una firma existente (preview). El botón "Quitar firma" limpia a null.
 */
@Component({
  selector: 'ui-signature-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, FormsModule, SignaturePadComponent],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SignatureInputComponent), multi: true },
  ],
  template: `
    <div class="flex flex-col gap-3 max-w-xl">
      <div class="flex flex-wrap gap-2" role="tablist" aria-label="Modo de firma">
        <p-button label="Dibujar" icon="pi pi-pencil" type="button"
                  [outlined]="mode() !== 'draw'" [disabled]="disabled()"
                  severity="secondary" (onClick)="setMode('draw')" />
        <p-button label="Subir imagen" icon="pi pi-upload" type="button"
                  [outlined]="mode() !== 'upload'" [disabled]="disabled()"
                  severity="secondary" (onClick)="setMode('upload')" />
        <p-button label="Texto" icon="pi pi-align-left" type="button"
                  [outlined]="mode() !== 'text'" [disabled]="disabled()"
                  severity="secondary" (onClick)="setMode('text')" />
      </div>

      @switch (mode()) {
        @case ('draw') {
          <ui-signature-pad [(ngModel)]="drawValueProxy" [ngModelOptions]="{ standalone: true }" />
        }
        @case ('upload') {
          <div class="flex flex-col gap-2">
            <input #fileInput type="file" accept="image/png,image/jpeg"
                   class="text-sm" [disabled]="disabled()" (change)="onFileSelected($event)" />
            <span class="text-xs text-surface-400">Formatos: PNG o JPG. Tamaño máximo: 2 MB.</span>
          </div>
        }
        @case ('text') {
          <div class="flex flex-col gap-2">
            <input type="text" [value]="textValue()" [disabled]="disabled()"
                   (input)="onTextInput($event)"
                   placeholder="Nombre y apellido a estampar como firma"
                   class="border rounded px-3 py-2 text-base bg-surface-0" />
            <span class="text-xs text-surface-400">Se convierte a una imagen de firma automáticamente.</span>
          </div>
        }
      }

      @if (value()) {
        <div class="flex flex-col gap-1">
          <span class="text-xs text-surface-500">Vista previa de la firma:</span>
          <img [src]="value()!" alt="Vista previa de la firma"
               class="border rounded bg-surface-0 max-h-32 object-contain" />
        </div>
      }

      <div>
        <p-button label="Quitar firma" icon="pi pi-trash" severity="secondary" [text]="true"
                  type="button" [disabled]="disabled() || !value()" (onClick)="clear()" />
      </div>
    </div>
  `,
})
export class SignatureInputComponent implements ControlValueAccessor {
  private readonly notifications = inject(NotificationService);

  readonly mode = signal<SignatureMode>('draw');
  readonly value = signal<string | null>(null);
  readonly textValue = signal('');
  readonly disabled = signal(false);

  private onChange: (v: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  /**
   * Proxy para el `ui-signature-pad` del modo dibujar. Componer el pad por
   * `[(ngModel)]` lo reusa sin tocarlo: cuando el pad emite su dataURL, lo
   * propagamos como valor del control; al precargar, le pasamos el valor actual.
   */
  get drawValueProxy(): string | null { return this.value(); }
  set drawValueProxy(v: string | null) { this.setValue(v ?? null); }

  // --- ControlValueAccessor ---
  writeValue(value: string | null): void {
    this.value.set(value ?? null);
    // En edición preferimos mostrar la firma existente como preview (modo imagen).
    if (value) this.mode.set('upload');
  }
  registerOnChange(fn: (v: string | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled.set(isDisabled); }

  setMode(mode: SignatureMode): void {
    if (this.disabled()) return;
    this.mode.set(mode);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      this.notifications.error('La firma debe ser una imagen PNG o JPG.');
      input.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      this.notifications.error('La imagen de la firma no puede superar los 2 MB.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') this.setValue(result);
    };
    reader.onerror = () => {
      this.notifications.error('No se pudo leer la imagen de la firma. Intentá con otro archivo.');
    };
    reader.readAsDataURL(file);
  }

  onTextInput(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this.textValue.set(text);
    const trimmed = text.trim();
    if (!trimmed) { this.setValue(null); return; }
    const dataUrl = this.rasterizeText(trimmed);
    if (dataUrl) this.setValue(dataUrl);
  }

  clear(): void {
    this.textValue.set('');
    this.setValue(null);
  }

  /** Rasteriza el texto a un canvas con fuente tipo firma → PNG dataURL. */
  private rasterizeText(text: string): string | null {
    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 180;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#1f2937';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = "italic 48px 'Brush Script MT', 'Segoe Script', cursive";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 20);
    return canvas.toDataURL('image/png');
  }

  private setValue(value: string | null): void {
    this.value.set(value);
    this.onChange(value);
    this.onTouched();
  }
}

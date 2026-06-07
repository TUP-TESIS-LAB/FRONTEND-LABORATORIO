import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, forwardRef, input, signal, viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ButtonModule } from 'primeng/button';

/**
 * Pad de firma reutilizable. Dibuja con mouse/dedo en un canvas y emite la firma
 * como data-URL PNG (base64) a través del ControlValueAccessor, de modo que se usa
 * con `formControlName`. Reutilizable para médico derivante y bioquímico.
 */
@Component({
  selector: 'ui-signature-pad',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SignaturePadComponent), multi: true },
  ],
  template: `
    <div class="flex flex-col gap-2 max-w-xl">
      <div class="border rounded bg-surface-0" style="touch-action: none;">
        <canvas #canvas
                [width]="width()" [height]="height()"
                class="block w-full rounded cursor-crosshair"
                (pointerdown)="onPointerDown($event)"
                (pointermove)="onPointerMove($event)"
                (pointerup)="onPointerUp()"
                (pointerleave)="onPointerUp()"></canvas>
      </div>
      <div class="flex items-center gap-2">
        <p-button label="Limpiar" icon="pi pi-eraser" severity="secondary" [text]="true" type="button"
                  [disabled]="disabled() || empty()" (onClick)="clear()" />
        @if (empty()) {
          <span class="text-xs text-surface-400">Dibujá la firma con el mouse o el dedo.</span>
        } @else {
          <span class="text-xs text-surface-500">Firma capturada.</span>
        }
      </div>
    </div>
  `,
})
export class SignaturePadComponent implements ControlValueAccessor, AfterViewInit {
  readonly width = input(500);
  readonly height = input(180);

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private ctx: CanvasRenderingContext2D | null = null;
  private drawing = false;
  private last: { x: number; y: number } | null = null;
  private pendingValue: string | null = null;

  readonly empty = signal(true);
  readonly disabled = signal(false);

  private onChange: (v: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  ngAfterViewInit(): void {
    const canvas = this.canvasRef().nativeElement;
    this.ctx = canvas.getContext('2d');
    if (this.ctx) {
      this.ctx.lineWidth = 2;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.strokeStyle = '#1f2937';
    }
    if (this.pendingValue) {
      this.drawImage(this.pendingValue);
      this.pendingValue = null;
    }
  }

  // --- ControlValueAccessor ---
  writeValue(value: string | null): void {
    if (!this.ctx) {
      this.pendingValue = value ?? null;
      this.empty.set(!value);
      return;
    }
    this.clearCanvas();
    if (value) {
      this.drawImage(value);
      this.empty.set(false);
    } else {
      this.empty.set(true);
    }
  }
  registerOnChange(fn: (v: string | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled.set(isDisabled); }

  // --- Drawing ---
  onPointerDown(e: PointerEvent): void {
    if (this.disabled() || !this.ctx) return;
    this.drawing = true;
    this.last = this.pos(e);
    (e.target as HTMLCanvasElement).setPointerCapture?.(e.pointerId);
  }
  onPointerMove(e: PointerEvent): void {
    if (!this.drawing || !this.ctx || !this.last) return;
    const p = this.pos(e);
    this.ctx.beginPath();
    this.ctx.moveTo(this.last.x, this.last.y);
    this.ctx.lineTo(p.x, p.y);
    this.ctx.stroke();
    this.last = p;
  }
  onPointerUp(): void {
    if (!this.drawing) return;
    this.drawing = false;
    this.last = null;
    this.empty.set(false);
    this.emit();
    this.onTouched();
  }

  clear(): void {
    this.clearCanvas();
    this.empty.set(true);
    this.onChange(null);
    this.onTouched();
  }

  private emit(): void {
    this.onChange(this.canvasRef().nativeElement.toDataURL('image/png'));
  }
  private clearCanvas(): void {
    const canvas = this.canvasRef().nativeElement;
    this.ctx?.clearRect(0, 0, canvas.width, canvas.height);
  }
  private drawImage(dataUrl: string): void {
    const canvas = this.canvasRef().nativeElement;
    const ctx = this.ctx;
    const img = new Image();
    img.onload = () => ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
    img.src = dataUrl;
  }
  private pos(e: PointerEvent): { x: number; y: number } {
    const canvas = this.canvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width ? canvas.width / rect.width : 1;
    const scaleY = rect.height ? canvas.height / rect.height : 1;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }
}

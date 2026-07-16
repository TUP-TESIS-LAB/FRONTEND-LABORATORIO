import { TestBed } from '@angular/core/testing';
import { SignatureInputComponent } from './signature-input.component';
import { NotificationService } from '@core/services/notification.service';

describe('SignatureInputComponent', () => {
  let notifications: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SignatureInputComponent] });
    notifications = TestBed.inject(NotificationService);
  });

  // NOTA: no llamamos fixture.detectChanges() para no renderizar el template.
  // En modo "draw" el template compone `ui-signature-pad`, cuyo `viewChild.required`
  // sobre el <canvas> dispara NG0951 en el renderer de test (JSDOM, Angular 21) —
  // es un problema de infra del entorno de test, no de la lógica del componente.
  // Estos tests ejercen la lógica del CVA directamente sobre la instancia.
  function create(): SignatureInputComponent {
    const fixture = TestBed.createComponent(SignatureInputComponent);
    return fixture.componentInstance;
  }

  it('starts in draw mode with no value', () => {
    const cmp = create();
    expect(cmp.mode()).toBe('draw');
    expect(cmp.value()).toBeNull();
  });

  // JSDOM no implementa canvas 2d/toDataURL (sin el paquete `canvas`), así que
  // mockeamos un contexto y toDataURL para ejercer la lógica de rasterización.
  function mockCanvas(): void {
    const ctx = {
      fillStyle: '', textAlign: '', textBaseline: '', font: '',
      fillText: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,RASTER');
  }

  it('text mode rasterizes input to a PNG dataURL and emits it', () => {
    mockCanvas();
    const cmp = create();
    let emitted: string | null | undefined;
    cmp.registerOnChange((v) => (emitted = v));
    cmp.setMode('text');
    cmp.onTextInput({ target: { value: 'Eva Ruiz' } } as unknown as Event);
    expect(cmp.value()).toMatch(/^data:image\/png;base64,/);
    expect(emitted).toMatch(/^data:image\/png;base64,/);
  });

  it('text mode with empty input clears the value', () => {
    mockCanvas();
    const cmp = create();
    cmp.setMode('text');
    cmp.onTextInput({ target: { value: 'Eva' } } as unknown as Event);
    expect(cmp.value()).not.toBeNull();
    cmp.onTextInput({ target: { value: '   ' } } as unknown as Event);
    expect(cmp.value()).toBeNull();
  });

  it('rejects a non PNG/JPG file with a Spanish message and does not set the value', () => {
    const cmp = create();
    const spy = vi.spyOn(notifications, 'error');
    const file = new File(['x'], 'firma.gif', { type: 'image/gif' });
    const input = { files: [file], value: 'firma.gif' } as unknown as HTMLInputElement;
    cmp.onFileSelected({ target: input } as unknown as Event);
    expect(cmp.value()).toBeNull();
    expect(spy).toHaveBeenCalledWith('La firma debe ser una imagen PNG o JPG.');
  });

  it('rejects a file larger than 2MB with a Spanish message and does not set the value', () => {
    const cmp = create();
    const spy = vi.spyOn(notifications, 'error');
    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'firma.png', { type: 'image/png' });
    const input = { files: [big], value: 'firma.png' } as unknown as HTMLInputElement;
    cmp.onFileSelected({ target: input } as unknown as Event);
    expect(cmp.value()).toBeNull();
    expect(spy).toHaveBeenCalledWith('La imagen de la firma no puede superar los 2 MB.');
  });

  it('accepts a valid PNG file and emits its dataURL', async () => {
    const cmp = create();
    let emitted: string | null | undefined;
    cmp.registerOnChange((v) => (emitted = v));
    const file = new File(['hello'], 'firma.png', { type: 'image/png' });
    const input = { files: [file], value: 'firma.png' } as unknown as HTMLInputElement;
    cmp.onFileSelected({ target: input } as unknown as Event);
    // FileReader es async: esperamos a que resuelva.
    await vi.waitFor(() => {
      expect(cmp.value()).toMatch(/^data:/);
    });
    expect(emitted).toMatch(/^data:/);
  });

  it('clear() resets the value to null', () => {
    const cmp = create();
    let emitted: string | null | undefined = 'x';
    cmp.registerOnChange((v) => (emitted = v));
    cmp.setMode('text');
    cmp.onTextInput({ target: { value: 'Eva' } } as unknown as Event);
    cmp.clear();
    expect(cmp.value()).toBeNull();
    expect(emitted).toBeNull();
    expect(cmp.textValue()).toBe('');
  });

  it('writeValue precarga la firma y la muestra como preview (modo imagen)', () => {
    const cmp = create();
    cmp.writeValue('data:image/png;base64,AAAA');
    expect(cmp.value()).toBe('data:image/png;base64,AAAA');
    expect(cmp.mode()).toBe('upload');
  });

  it('writeValue(null) deja el control vacío', () => {
    const cmp = create();
    cmp.writeValue(null);
    expect(cmp.value()).toBeNull();
  });

  it('setDisabledState bloquea el cambio de modo', () => {
    const cmp = create();
    cmp.setDisabledState(true);
    cmp.setMode('text');
    expect(cmp.mode()).toBe('draw');
  });
});

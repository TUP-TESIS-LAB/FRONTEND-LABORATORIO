import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AsistenteAyudaComponent } from './asistente-ayuda.component';
import { AsistenteAyudaService } from '@core/services/asistente-ayuda.service';
import { ChatMessage } from '@core/models/asistente-ayuda.model';

/** Stub del servicio: expone los mismos signals y registra las preguntas enviadas. */
class StubAsistenteService {
  readonly messages = signal<ChatMessage[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly open = signal(false);
  readonly sentQuestions: string[] = [];

  toggle(): void {
    this.open.update((v) => !v);
  }

  send(question: string): void {
    this.sentQuestions.push(question);
  }

  clear(): void {
    this.messages.set([]);
  }
}

describe('AsistenteAyudaComponent', () => {
  let stub: StubAsistenteService;

  function setup() {
    stub = new StubAsistenteService();
    TestBed.configureTestingModule({
      imports: [AsistenteAyudaComponent],
      providers: [{ provide: AsistenteAyudaService, useValue: stub }],
    });
    const fixture = TestBed.createComponent(AsistenteAyudaComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('arranca cerrado: sin panel y sin botón flotante', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('.aa-panel')).toBeNull();
    expect(fixture.nativeElement.querySelector('.aa-fab')).toBeNull();
  });

  it('al abrir (open del servicio) muestra el panel con la bienvenida y la imagen', () => {
    const fixture = setup();
    stub.open.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.aa-panel')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('¿En qué te puedo ayudar?');
    const img = fixture.nativeElement.querySelector('.aa-welcome__img') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toContain('info.png');
  });

  it('submit() delega la pregunta al servicio y limpia el input', () => {
    const fixture = setup();
    const cmp = fixture.componentInstance;
    cmp.open.set(true);
    cmp.draft.set('¿cómo doy de alta un paciente?');
    fixture.detectChanges();

    cmp.submit();

    expect(stub.sentQuestions).toContain('¿cómo doy de alta un paciente?');
    expect(cmp.draft()).toBe('');
  });

  it('renderiza los mensajes de usuario y asistente del servicio', () => {
    const fixture = setup();
    fixture.componentInstance.open.set(true);
    stub.messages.set([
      { role: 'user', content: 'hola' },
      { role: 'assistant', content: 'buenas, ¿en qué te ayudo?' },
    ]);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('hola');
    expect(text).toContain('buenas, ¿en qué te ayudo?');
  });

  it('muestra el error en español que expone el servicio', () => {
    const fixture = setup();
    fixture.componentInstance.open.set(true);
    stub.error.set('El asistente no está disponible en este momento. Intentá más tarde.');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.aa-error')?.textContent).toContain(
      'El asistente no está disponible',
    );
  });
});

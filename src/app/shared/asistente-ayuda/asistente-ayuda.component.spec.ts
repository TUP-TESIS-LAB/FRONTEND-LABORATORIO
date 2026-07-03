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
  readonly sentQuestions: string[] = [];

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

  it('arranca colapsado mostrando el botón flotante, sin panel', () => {
    const fixture = setup();
    const fab = fixture.nativeElement.querySelector('.aa-fab') as HTMLButtonElement;
    expect(fab).not.toBeNull();
    expect(fab.getAttribute('aria-label')).toContain('asistente de ayuda');
    expect(fixture.nativeElement.querySelector('.aa-panel')).toBeNull();
  });

  it('al abrir muestra el panel con el estado vacío', () => {
    const fixture = setup();
    (fixture.nativeElement.querySelector('.aa-fab') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.aa-panel')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Preguntame');
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

import { TestBed } from '@angular/core/testing';
import { CancelAttentionModalComponent } from './cancel-attention-modal.component';

describe('CancelAttentionModalComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CancelAttentionModalComponent] }).compileComponents();
  });

  it('no emite confirmed sin motivo; con motivo emite el texto', () => {
    const f = TestBed.createComponent(CancelAttentionModalComponent);
    const c = f.componentInstance;
    f.componentRef.setInput('visible', true);
    f.detectChanges();
    let emitted: string | undefined;
    c.confirmed.subscribe((r: string) => (emitted = r));
    c.confirm();
    expect(emitted).toBeUndefined();
    c.setReason('Paciente no se presentó');
    c.confirm();
    expect(emitted).toBe('Paciente no se presentó');
  });
});

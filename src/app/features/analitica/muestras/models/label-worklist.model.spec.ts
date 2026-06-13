import { describe, expect, it } from 'vitest';
import { BACKEND_TO_SAMPLE_STATE } from './label-worklist.model';

describe('label-worklist mapper', () => {
  it('mapea todos los estados backend visibles', () => {
    expect(BACKEND_TO_SAMPLE_STATE['IN_TRANSIT']).toBe('transito');
    expect(BACKEND_TO_SAMPLE_STATE['PROCESSING']).toBe('processing');
    expect(BACKEND_TO_SAMPLE_STATE['COMPLETED']).toBe('completed');
    expect(BACKEND_TO_SAMPLE_STATE['DERIVED']).toBe('derived');
    expect(BACKEND_TO_SAMPLE_STATE['REJECTED']).toBe('rejected');
    expect(BACKEND_TO_SAMPLE_STATE['LOST']).toBe('lost');
    expect(BACKEND_TO_SAMPLE_STATE['DISCARDED']).toBe('discarded');
  });
});

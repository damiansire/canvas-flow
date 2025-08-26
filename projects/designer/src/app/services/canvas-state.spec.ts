import { TestBed } from '@angular/core/testing';

import { CanvasState } from './canvas-state';

describe('CanvasState', () => {
  let service: CanvasState;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CanvasState);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

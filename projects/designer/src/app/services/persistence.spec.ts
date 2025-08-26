import { TestBed } from '@angular/core/testing';

import { Persistence } from './persistence';

describe('Persistence', () => {
  let service: Persistence;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Persistence);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

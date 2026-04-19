import { TestBed } from '@angular/core/testing';

import { Toasts } from './toasts';

describe('Toasts', () => {
  let service: Toasts;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Toasts);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

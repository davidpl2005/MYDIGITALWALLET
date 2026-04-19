import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { biometricLockGuard } from './biometric-lock-guard';

describe('biometricLockGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => biometricLockGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});

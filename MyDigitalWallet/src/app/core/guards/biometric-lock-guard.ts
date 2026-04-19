import { CanActivateFn } from '@angular/router';

export const biometricLockGuard: CanActivateFn = (route, state) => {
  return true;
};

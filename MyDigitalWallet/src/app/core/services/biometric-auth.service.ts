import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { NativeBiometric } from 'capacitor-native-biometric';

@Injectable({
  providedIn: 'root'
})
export class BiometricAuthService {
  private serverKey = 'mydigitalwallet.app';

  constructor() {}

  async isAvailable(): Promise<boolean> {
    if (Capacitor.getPlatform() === 'web') {
      return !!localStorage.getItem('biometric_enabled_web');
    }

    try {
      const result = await NativeBiometric.isAvailable();
      return result.isAvailable;
    } catch (error) {
      console.error('Error verificando biometría:', error);
      return false;
    }
  }

  async authenticate(reason: string = 'Autenticación requerida'): Promise<boolean> {
    if (Capacitor.getPlatform() === 'web') {
      return window.confirm(`${reason}\n\nSimulación web: pulsa Aceptar para continuar.`);
    }

    try {
      await NativeBiometric.verifyIdentity({
        reason,
        title: 'Verificación biométrica',
        subtitle: 'Confirma tu identidad',
        description: 'Usa tu huella, rostro o PIN del dispositivo',
        maxAttempts: 2
      });

      return true;
    } catch (error) {
      console.error('Error autenticando biométricamente:', error);
      return false;
    }
  }

  async saveCredentials(email: string, password: string): Promise<void> {
    if (Capacitor.getPlatform() === 'web') {
      localStorage.setItem('biometric_enabled_web', 'true');
      localStorage.setItem('biometric_email_web', email);
      localStorage.setItem('biometric_password_web', password);
      return;
    }

    await NativeBiometric.setCredentials({
      username: email,
      password,
      server: this.serverKey
    });
  }

  async getCredentials(): Promise<{ email: string; password: string } | null> {
    if (Capacitor.getPlatform() === 'web') {
      const email = localStorage.getItem('biometric_email_web');
      const password = localStorage.getItem('biometric_password_web');

      if (!email || !password) {
        return null;
      }

      return { email, password };
    }

    try {
      const credentials = await NativeBiometric.getCredentials({
        server: this.serverKey
      });

      return {
        email: credentials.username,
        password: credentials.password
      };
    } catch (error) {
      return null;
    }
  }

  async hasStoredCredentials(): Promise<boolean> {
    const credentials = await this.getCredentials();
    return !!credentials?.email && !!credentials?.password;
  }

  async clearCredentials(): Promise<void> {
    if (Capacitor.getPlatform() === 'web') {
      localStorage.removeItem('biometric_enabled_web');
      localStorage.removeItem('biometric_email_web');
      localStorage.removeItem('biometric_password_web');
      return;
    }

    try {
      await NativeBiometric.deleteCredentials({
        server: this.serverKey
      });
    } catch (error) {
      console.warn('No fue posible borrar credenciales biométricas:', error);
    }
  }
}
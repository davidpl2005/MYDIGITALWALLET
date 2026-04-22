import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token } from '@capacitor/push-notifications';
import { FirestoreService } from './firestore.service';
import { AuthService } from './auth.service';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NotificationService {

  private readonly BACKEND_URL = 'https://sendnotificationfirebase-production.up.railway.app';
  private jwtToken: string | null = null;
  private fcmToken: string | null = null;

  private readonly BACKEND_EMAIL    = 'isac.pachecolopez@unicolombo.edu.co';
  private readonly BACKEND_PASSWORD = 'david2005#';

  private loginPromise: Promise<boolean> | null = null;
  private initialized = false;

  constructor(
    private http: HttpClient,
    private firestoreService: FirestoreService,
    private authService: AuthService
  ) {}

  // ── PASO 1: Inicializar todo ─────────────────────────────────────
  async initPushNotifications(): Promise<void> {
    if (this.initialized) return;
    if (!Capacitor.isNativePlatform()) {
      console.log('Push solo disponible en dispositivo nativo.');
      return;
    }

    await this.loginBackend();
    await this.registerPush();
    this.initialized = true;
  }

  // ── PASO 2: Login Railway ────────────────────────────────────────
  async loginBackend(): Promise<boolean> {
    if (this.loginPromise) return this.loginPromise;

    this.loginPromise = this._doLogin().finally(() => {
      this.loginPromise = null;
    });
    return this.loginPromise;
  }

  private async _doLogin(): Promise<boolean> {
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${this.BACKEND_URL}/user/login`, {
          email:    this.BACKEND_EMAIL,
          password: this.BACKEND_PASSWORD
        })
      );

      const raw: string | null =
        res?.data?.access_token ??
        res?.access_token       ??
        res?.token              ??
        null;

      this.jwtToken = raw;
      console.log('✅ JWT Railway obtenido:', !!this.jwtToken);
      return !!this.jwtToken;

    } catch (error: any) {
      console.error('❌ Error login Railway:', error?.message);
      return false;
    }
  }

  // ── PASO 3: Registrar push y obtener FCM token ───────────────────
  private async registerPush(): Promise<void> {
    let permission = await PushNotifications.checkPermissions();
    if (permission.receive === 'prompt') {
      permission = await PushNotifications.requestPermissions();
    }

    if (permission.receive !== 'granted') {
      console.warn('⚠️ Permiso de notificaciones denegado.');
      return;
    }

    await PushNotifications.removeAllListeners();

    await PushNotifications.addListener('registration', async (token: Token) => {
      console.log('✅ FCM Token obtenido:', token.value);
      this.fcmToken = token.value;

      const uid = this.authService.getCurrentUser()?.uid;
      if (uid) {
        try {
          await this.firestoreService.updateDocument('users', uid, {
            fcmToken: token.value
          });
          console.log('✅ FCM Token guardado en Firestore');
        } catch (e) {
          console.error('❌ Error guardando FCM Token:', e);
        }
      }
    });

    await PushNotifications.addListener('registrationError', (err) => {
      console.error('❌ Error FCM registro:', JSON.stringify(err));
    });

    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('📬 Notificación recibida en foreground:', notification);
    });

    await PushNotifications.register();
    console.log('📲 Push notifications registradas');
  }

  // ── PASO 4: Enviar notificación ──────────────────────────────────
  async sendPaymentNotification(merchant: string, amount: number): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    if (!this.jwtToken) {
      const ok = await this.loginBackend();
      if (!ok) {
        console.warn('⚠️ No se pudo obtener JWT, notificación cancelada.');
        return;
      }
    }

    if (!this.fcmToken) {
      await this.loadFcmTokenFromFirestore();
    }

    if (!this.fcmToken) {
      console.warn('⚠️ Sin FCM token, notificación cancelada.');
      return;
    }

    await this._sendNotification(merchant, amount, false);
  }

  private async _sendNotification(
    merchant: string,
    amount: number,
    isRetry: boolean
  ): Promise<void> {
    const authHeader = this.jwtToken!.startsWith('Bearer ')
      ? this.jwtToken!
      : `Bearer ${this.jwtToken!}`;

    const headers = new HttpHeaders({
      'Authorization': authHeader,
      'Content-Type':  'application/json'
    });

    const body = {
      token: this.fcmToken,
      notification: {
        title: '💳 Pago Exitoso',
        body:  `Pagaste $${amount.toLocaleString('es-CO')} en ${merchant}`
      },
      android: {
        priority: 'high',
        data: {
          key:      'payment',
          merchant: merchant,
          amount:   amount.toString()
        }
      }
    };

    try {
      const res = await firstValueFrom(
        this.http.post(`${this.BACKEND_URL}/notifications/`, body, { headers })
      );
      console.log('✅ Notificación enviada correctamente:', res);

    } catch (error: any) {
      const status = error?.status;
      console.error(`❌ Error enviando notificación (status ${status}):`, error?.message);

      if (!isRetry && (status === 401 || status === 403)) {
        console.warn('🔄 Token expirado, renovando JWT...');
        this.jwtToken = null;
        const ok = await this.loginBackend();
        if (ok) {
          await this._sendNotification(merchant, amount, true);
        }
      }
    }
  }

  // ── Recuperar FCM token de Firestore ─────────────────────────────
  private async loadFcmTokenFromFirestore(): Promise<void> {
    const uid = this.authService.getCurrentUser()?.uid;
    if (!uid) {
      console.warn('⚠️ Sin uid para cargar FCM token');
      return;
    }

    try {
      const data: any = await firstValueFrom(
        this.firestoreService.getDocument('users', uid)
      );
      if (data?.fcmToken) {
        this.fcmToken = data.fcmToken;
        console.log('✅ FCM token cargado desde Firestore');
      } else {
        console.warn('⚠️ No hay FCM token en Firestore para este usuario');
      }
    } catch (e) {
      console.error('❌ Error cargando FCM token desde Firestore:', e);
    }
  }

  getFcmToken(): string | null { return this.fcmToken; }
  getJwtToken(): string | null { return this.jwtToken; }
}
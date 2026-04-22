import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HttpService {
  private readonly BASE_URL = 'https://sendnotificationfirebase-production.up.railway.app';
  private jwtToken: string | null = null;

  constructor(private http: HttpClient) {}

  async login(email: string, password: string): Promise<void> {
    const res: any = await firstValueFrom(
      this.http.post(`${this.BASE_URL}/user/login`, { email, password })
    );
    // El backend puede devolver el token con distintos nombres
    this.jwtToken = res?.token ?? res?.access_token ?? res?.accessToken ?? null;
  }

  async sendNotification(payload: object): Promise<void> {
    if (!this.jwtToken) {
      console.warn('HttpService: no hay JWT, no se puede enviar notificación');
      return;
    }
    const headers = new HttpHeaders({ Authorization: this.jwtToken });
    await firstValueFrom(
      this.http.post(`${this.BASE_URL}/notifications/`, payload, { headers })
    );
  }

  isLoggedIn(): boolean {
    return !!this.jwtToken;
  }
}
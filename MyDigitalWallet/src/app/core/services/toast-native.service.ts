import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Toast } from '@capacitor/toast';

@Injectable({
  providedIn: 'root'
})
export class ToastNativeService {
  private get isNative(): boolean {
    const platform = Capacitor.getPlatform();
    return platform === 'android' || platform === 'ios';
  }

  async show(message: string): Promise<void> {
    try {
      if (this.isNative) {
        await Toast.show({
          text: message,
          duration: 'short',
          position: 'bottom'
        });
      } else {
        console.log('TOAST:', message);
      }
    } catch (error) {
      console.error('Toast error:', error);
    }
  }

  async success(message: string): Promise<void> {
    await this.show(message);
  }

  async error(message: string): Promise<void> {
    await this.show(message);
  }
}
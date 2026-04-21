import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  Haptics,
  ImpactStyle,
  NotificationType
} from '@capacitor/haptics';

@Injectable({
  providedIn: 'root'
})
export class HapticsService {
  private get platform(): string {
    return Capacitor.getPlatform();
  }

  private get isAndroid(): boolean {
    return this.platform === 'android';
  }

  private get isIOS(): boolean {
    return this.platform === 'ios';
  }

  private get isNativePlatform(): boolean {
    return this.isAndroid || this.isIOS;
  }

  async light(): Promise<void> {
    if (!this.isNativePlatform) {
      return;
    }

    try {
      if (this.isAndroid) {
        await Haptics.vibrate({ duration: 35 });
        return;
      }

      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (error) {
      console.warn('Haptics light error:', error);
    }
  }

  async medium(): Promise<void> {
    if (!this.isNativePlatform) {
      return;
    }

    try {
      if (this.isAndroid) {
        await Haptics.vibrate({ duration: 60 });
        return;
      }

      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (error) {
      console.warn('Haptics medium error:', error);
    }
  }

  async heavy(): Promise<void> {
    if (!this.isNativePlatform) {
      return;
    }

    try {
      if (this.isAndroid) {
        await Haptics.vibrate({ duration: 90 });
        return;
      }

      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (error) {
      console.warn('Haptics heavy error:', error);
    }
  }

  async success(): Promise<void> {
    if (!this.isNativePlatform) {
      return;
    }

    try {
      if (this.isAndroid) {
        await Haptics.vibrate({ duration: 80 });
        return;
      }

      await Haptics.notification({ type: NotificationType.Success });
    } catch (error) {
      console.warn('Haptics success error:', error);
    }
  }

  async warning(): Promise<void> {
    if (!this.isNativePlatform) {
      return;
    }

    try {
      if (this.isAndroid) {
        await Haptics.vibrate({ duration: 120 });
        return;
      }

      await Haptics.notification({ type: NotificationType.Warning });
    } catch (error) {
      console.warn('Haptics warning error:', error);
    }
  }

  async error(): Promise<void> {
    if (!this.isNativePlatform) {
      return;
    }

    try {
      if (this.isAndroid) {
        await Haptics.vibrate({ duration: 150 });
        return;
      }

      await Haptics.notification({ type: NotificationType.Error });
    } catch (error) {
      console.warn('Haptics error error:', error);
    }
  }

  async selection(): Promise<void> {
    if (!this.isNativePlatform) {
      return;
    }

    try {
      if (this.isAndroid) {
        await Haptics.vibrate({ duration: 45 });
        return;
      }

      await Haptics.selectionStart();
      await Haptics.selectionChanged();
      await Haptics.selectionEnd();
    } catch (error) {
      console.warn('Haptics selection error:', error);
    }
  }

  async test(): Promise<void> {
    if (!this.isNativePlatform) {
      return;
    }

    try {
      await Haptics.vibrate({ duration: 200 });
    } catch (error) {
      console.warn('Haptics test error:', error);
    }
  }
}
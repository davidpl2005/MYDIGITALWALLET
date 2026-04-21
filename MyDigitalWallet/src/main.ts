import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { SplashScreen } from '@capacitor/splash-screen';

import { AppModule } from './app/app.module';

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .then(async () => {
    try {
      setTimeout(async () => {
        await SplashScreen.hide();
      }, 1200);
    } catch (error) {
      console.warn('No se pudo ocultar SplashScreen:', error);
    }
  })
  .catch(err => console.error(err));
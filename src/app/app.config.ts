import {
  type ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import Aura from '@primeuix/themes/lara';
import { providePrimeNG } from 'primeng/config';
import { routes } from 'src/app/app.routes';
import { AuthService } from 'src/app/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAppInitializer(async () => {
      const authService = inject(AuthService);
      const authorized = await authService.auth();
      if (!authorized) {
        const elem = document.querySelector('app-root');
        if (elem) {
          elem.innerHTML = '';
        } else {
          document.body.innerHTML = '';
        }
        return new Promise(() => {});
      }
      return Promise.resolve();
    }),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: false || 'none',
        },
      },
    }),
  ],
};

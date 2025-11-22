import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './app.routes';
import { authInterceptor } from './aplicacion/custom/auth-interceptor';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';


export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
    provideCharts(withDefaultRegisterables())

  ]
};

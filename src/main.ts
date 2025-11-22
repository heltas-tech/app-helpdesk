import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import 'zone.js';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

// Extendemos el appConfig con el provider de charts
bootstrapApplication(App, {
  ...appConfig,
  providers: [
    ...(appConfig.providers || []),
    provideCharts(withDefaultRegisterables()),
    provideHttpClient(),

  ],
}).catch((err) => console.error(err));

import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';

// Configuración global de la app:
//  - provideZoneChangeDetection: activa el modo clásico de Angular
//    con Zone.js. Sin esto, Angular 21 no refresca la pantalla
//    automáticamente al cambiar variables (era nuestro bug).
//  - eventCoalescing: agrupa eventos seguidos para evitar
//    re-renderizar varias veces seguidas (mejora rendimiento).
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient()
  ]
};

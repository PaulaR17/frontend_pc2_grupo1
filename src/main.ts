// Importamos zone.js ANTES que cualquier cosa de Angular.
// Zone.js es la librería que permite a Angular detectar
// automáticamente los cambios (al recibir datos de un HTTP,
// al pulsar un botón, etc.) y refrescar la pantalla sola.
import 'zone.js';

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));

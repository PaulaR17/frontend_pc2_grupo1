// ============================================================
//  Entorno de DESARROLLO de EcoTraffic
//  - Todos los servicios leen environment.apiUrl desde aqui.
//  - Si cambia la URL del backend en local, se edita SOLO este
//    archivo.
//  - Para produccion existe environment.production.ts; Angular
//    lo sustituye automaticamente al compilar con
//    "ng build" (configuracion production).
// ============================================================

export const environment = {
  production: false,
  apiUrl: 'http://127.0.0.1:8000/api'
};

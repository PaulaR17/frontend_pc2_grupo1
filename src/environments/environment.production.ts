// ============================================================
//  Entorno de PRODUCCIÓN (build para Docker / MV de LORCA)
//  Angular sustituye environment.ts por este archivo cuando
//  se compila con "ng build" (configuración "production").
//  La ruta es relativa para que sea servida por nginx en el
//  mismo dominio del frontend (ver nginx.conf).
// ============================================================

export const environment = {
  production: true,
  apiUrl: '/api'
};

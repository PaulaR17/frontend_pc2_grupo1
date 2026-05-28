//convierte una fecha ISO ("2026-05-16T00:00:00.000000Z") en algo legible
//tipo "vie, 16 may 2026". si no se puede parsear devuelve el string tal cual.
export function formatearFecha(iso: string | null | undefined): string {
  let texto = '';

  if (iso) {
    const fecha = new Date(iso);
    const valida = !isNaN(fecha.getTime());

    if (valida) {
      texto = fecha.toLocaleDateString('es-ES', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } else {
      //si por lo que sea el backend manda algo raro, no rompemos la UI
      texto = iso;
    }
  }

  return texto;
}

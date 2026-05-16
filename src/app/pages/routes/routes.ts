import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth';
import {
  RouteService,
  HistoryRoute,
  FavoriteRoute
} from '../../core/services/route';

// Página "Mis rutas" con dos pestañas:
//   - Historial: rutas calculadas por el usuario.
//   - Favoritos: rutas guardadas como favoritas.

@Component({
  selector: 'app-routes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './routes.html',
  styleUrls: ['./routes.scss']
})
export class RoutesComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private routeService = inject(RouteService);

  // Pestaña visible.
  pestanaActiva: 'historial' | 'favoritos' = 'historial';

  // Datos cargados del backend.
  historial: HistoryRoute[] = [];
  favoritos: FavoriteRoute[] = [];

  // Guardamos los IDs de history que están en favoritos para
  // pintar correctamente el botón "favorito / no favorito".
  idsEnFavoritos: Set<number> = new Set();

  loading = true;
  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    this.cargarTodo();
  }

  // -------------------------------------------------------
  //  CARGA DE DATOS
  // -------------------------------------------------------

  private cargarTodo(): void {
    const userId = this.authService.getCurrentUserId();

    if (userId === null) {
      this.errorMessage = 'No se ha podido identificar al usuario.';
      this.loading = false;
    } else {
      this.cargarHistorial(userId);
    }
  }

  private cargarHistorial(userId: number): void {
    this.routeService.getHistory(userId).subscribe({
      next: (lista) => {
        this.historial = lista || [];
        this.cargarFavoritos(userId);
      },
      error: () => {
        this.errorMessage = 'No se pudo cargar el historial.';
        this.loading = false;
      }
    });
  }

  private cargarFavoritos(userId: number): void {
    this.routeService.getFavorites(userId).subscribe({
      next: (lista) => {
        this.favoritos = lista || [];
        this.recalcularIdsFavoritos();
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'No se pudieron cargar los favoritos.';
        this.loading = false;
      }
    });
  }

  // Rellena el conjunto de history_ids que están en favoritos.
  private recalcularIdsFavoritos(): void {
    this.idsEnFavoritos = new Set();

    for (const fav of this.favoritos) {
      this.idsEnFavoritos.add(fav.history_id);
    }
  }

  // -------------------------------------------------------
  //  ACCIONES SOBRE EL HISTORIAL
  // -------------------------------------------------------

  borrarHistorial(item: HistoryRoute): void {
    this.limpiarMensajes();
    const userId = this.authService.getCurrentUserId();
    const confirmado = window.confirm('¿Quieres borrar esta ruta del historial?');

    if (userId !== null && confirmado) {
      this.routeService.deleteHistory(userId, item.id).subscribe({
        next: () => {
          this.historial = this.historial.filter(r => r.id !== item.id);
          this.favoritos = this.favoritos.filter(f => f.history_id !== item.id);
          this.recalcularIdsFavoritos();
          this.successMessage = 'Ruta borrada del historial.';
        },
        error: () => {
          this.errorMessage = 'No se pudo borrar la ruta.';
        }
      });
    }
  }

  // Marca una ruta del historial como favorita.
  marcarFavorito(item: HistoryRoute): void {
    this.limpiarMensajes();
    const userId = this.authService.getCurrentUserId();

    if (userId !== null) {
      this.routeService.addFavorite(userId, item.id).subscribe({
        next: (favorito) => {
          this.favoritos = [...this.favoritos, favorito];
          this.idsEnFavoritos.add(item.id);
          this.successMessage = 'Ruta añadida a favoritos.';
        },
        error: () => {
          this.errorMessage = 'No se pudo añadir a favoritos.';
        }
      });
    }
  }

  // Quita una ruta de favoritos.
  quitarFavorito(fav: FavoriteRoute): void {
    this.limpiarMensajes();
    const userId = this.authService.getCurrentUserId();

    if (userId !== null) {
      this.routeService.removeFavorite(userId, fav.id).subscribe({
        next: () => {
          this.favoritos = this.favoritos.filter(f => f.id !== fav.id);
          this.idsEnFavoritos.delete(fav.history_id);
          this.successMessage = 'Ruta quitada de favoritos.';
        },
        error: () => {
          this.errorMessage = 'No se pudo quitar de favoritos.';
        }
      });
    }
  }

  // Atajo desde la tabla de favoritos: quita por history_id.
  quitarFavoritoPorHistory(historyId: number): void {
    const fav = this.favoritos.find(f => f.history_id === historyId);

    if (fav) {
      this.quitarFavorito(fav);
    }
  }

  // -------------------------------------------------------
  //  AYUDANTES
  // -------------------------------------------------------

  // ¿Esta ruta del historial está en favoritos?
  esFavorita(historyId: number): boolean {
    return this.idsEnFavoritos.has(historyId);
  }

  // Texto corto con las coordenadas (para que la tabla quepa).
  coordsCortas(lat: number, lon: number): string {
    const latRedondeada = Math.round(lat * 1000) / 1000;
    const lonRedondeada = Math.round(lon * 1000) / 1000;
    return `${latRedondeada} ; ${lonRedondeada}`;
  }

  cambiarPestana(nombre: 'historial' | 'favoritos'): void {
    this.pestanaActiva = nombre;
    this.limpiarMensajes();
  }

  private limpiarMensajes(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  volver(): void {
    this.router.navigate(['/user-home']);
  }
}

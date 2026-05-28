import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth';
import {
  RouteService,
  HistoryRoute,
  FavoriteRoute
} from '../../core/services/route';
import { HeaderComponent } from '../../core/components/header/header';
import { FooterComponent } from '../../core/components/footer/footer';

//mis rutas, con historial y favoritos
@Component({
  selector: 'app-routes',
  standalone: true,
  imports: [CommonModule, HeaderComponent, FooterComponent],
  templateUrl: './routes.html',
  styleUrls: ['./routes.scss']
})
export class RoutesComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private routeService = inject(RouteService);

  pestanaActiva: 'historial' | 'favoritos' = 'historial';

  historial: HistoryRoute[] = [];
  favoritos: FavoriteRoute[] = [];

  //history_ids que ya estan en favoritos
  idsEnFavoritos: Set<number> = new Set();

  loading = true;
  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    this.cargarTodo();
  }

  //carga historial y luego favoritos
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

  //rellena el set con los history_ids de favoritos
  private recalcularIdsFavoritos(): void {
    this.idsEnFavoritos = new Set();

    for (const fav of this.favoritos) {
      this.idsEnFavoritos.add(fav.history_id);
    }
  }

  //acciones sobre el historial

  borrarHistorial(item: HistoryRoute): void {
    this.limpiarMensajes();
    const userId = this.authService.getCurrentUserId();
    const confirmado = window.confirm('¿Quieres borrar esta ruta del historial?');

    if (userId !== null && confirmado) {
      this.routeService.deleteHistory(userId, item.id).subscribe({
        next: () => {
          //al borrar del historial tambien quitamos de favoritos si estaba
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

  //atajo desde la tabla de favoritos: localiza el fav por history_id
  //y reutiliza quitarFavorito
  quitarFavoritoPorHistory(historyId: number): void {
    const fav = this.favoritos.find(f => f.history_id === historyId);

    if (fav) {
      this.quitarFavorito(fav);
    }
  }

  //ayudantes

  esFavorita(historyId: number): boolean {
    return this.idsEnFavoritos.has(historyId);
  }

  //etiqueta del origen o destino: si hay nombre guardado lo usamos, si no
  //caemos a las coordenadas redondeadas para que la tabla siga teniendo info
  etiquetaPunto(label: string | null | undefined, lat: number, lon: number): string {
    let res = '';
    if (label && label.trim() !== '') {
      res = label;
    } else {
      const latRedondeada = Math.round(lat * 1000) / 1000;
      const lonRedondeada = Math.round(lon * 1000) / 1000;
      res = `${latRedondeada}, ${lonRedondeada}`;
    }
    return res;
  }

  //compatibilidad: el HTML antiguo aun llama a coordsCortas; lo conservamos
  coordsCortas(lat: number, lon: number): string {
    return this.etiquetaPunto(null, lat, lon);
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

  //navega a user-home con los puntos de la ruta como query params para
  //que se rellene el formulario y se calcule automaticamente
  recalcular(ruta: HistoryRoute): void {
    this.router.navigate(['/user-home'], {
      queryParams: {
        origin_lat: ruta.origin_lat,
        origin_lon: ruta.origin_lon,
        origin_label: ruta.origin_label ?? '',
        dest_lat: ruta.dest_lat,
        dest_lon: ruta.dest_lon,
        dest_label: ruta.dest_label ?? ''
      }
    });
  }

  //version del recalcular para una entrada de favoritos
  recalcularFavorito(fav: FavoriteRoute): void {
    if (fav.history) {
      this.recalcular(fav.history);
    }
  }
}

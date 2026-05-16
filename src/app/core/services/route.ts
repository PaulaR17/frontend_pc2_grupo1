import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Servicio para el historial de rutas del usuario y sus favoritos.
// Endpoints:
//   GET    /users/{id}/routes/history
//   DELETE /users/{id}/routes/history/{historyId}
//   GET    /users/{id}/routes/favorites
//   POST   /users/{id}/routes/favorites
//   DELETE /users/{id}/routes/favorites/{favoriteId}

// Una fila del historial (una ruta calculada por el usuario).
export interface HistoryRoute {
  id: number;
  user_id: number;
  origin_lat: number;
  origin_lon: number;
  dest_lat: number;
  dest_lon: number;
  distance_km: number | null;
  duration_min: number | null;
  created_at: string;
}

// Un favorito (apunta a una entrada del historial).
export interface FavoriteRoute {
  id: number;
  user_id: number;
  history_id: number;
  history?: HistoryRoute;
}

@Injectable({
  providedIn: 'root'
})
export class RouteService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // -------------------------------------------------------
  //  HISTORIAL
  // -------------------------------------------------------

  // Devuelve todas las rutas que el usuario ha calculado.
  getHistory(userId: number): Observable<HistoryRoute[]> {
    return this.http.get<HistoryRoute[]>(
      `${this.apiUrl}/users/${userId}/routes/history`,
      { headers: this.getAuthHeaders() }
    );
  }

  // Borra una entrada del historial.
  deleteHistory(userId: number, historyId: number): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/users/${userId}/routes/history/${historyId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  // -------------------------------------------------------
  //  FAVORITOS
  // -------------------------------------------------------

  // Lista de favoritos del usuario.
  getFavorites(userId: number): Observable<FavoriteRoute[]> {
    return this.http.get<FavoriteRoute[]>(
      `${this.apiUrl}/users/${userId}/routes/favorites`,
      { headers: this.getAuthHeaders() }
    );
  }

  // Marca una entrada del historial como favorita.
  addFavorite(userId: number, historyId: number): Observable<FavoriteRoute> {
    return this.http.post<FavoriteRoute>(
      `${this.apiUrl}/users/${userId}/routes/favorites`,
      { history_id: historyId },
      { headers: this.getAuthHeaders() }
    );
  }

  // Quita una entrada de favoritos.
  removeFavorite(userId: number, favoriteId: number): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/users/${userId}/routes/favorites/${favoriteId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  // -------------------------------------------------------
  //  AUXILIAR
  // -------------------------------------------------------

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }
}

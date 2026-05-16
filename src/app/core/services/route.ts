import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

//historial de rutas y favoritos del usuario
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

//un favorito referencia una entrada del historial
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

  getHistory(userId: number): Observable<HistoryRoute[]> {
    return this.http.get<HistoryRoute[]>(
      `${this.apiUrl}/users/${userId}/routes/history`,
      { headers: this.getAuthHeaders() }
    );
  }

  deleteHistory(userId: number, historyId: number): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/users/${userId}/routes/history/${historyId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  getFavorites(userId: number): Observable<FavoriteRoute[]> {
    return this.http.get<FavoriteRoute[]>(
      `${this.apiUrl}/users/${userId}/routes/favorites`,
      { headers: this.getAuthHeaders() }
    );
  }

  addFavorite(userId: number, historyId: number): Observable<FavoriteRoute> {
    return this.http.post<FavoriteRoute>(
      `${this.apiUrl}/users/${userId}/routes/favorites`,
      { history_id: historyId },
      { headers: this.getAuthHeaders() }
    );
  }

  removeFavorite(userId: number, favoriteId: number): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/users/${userId}/routes/favorites/${favoriteId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }
}

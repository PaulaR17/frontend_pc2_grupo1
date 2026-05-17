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
  origin_label: string | null;
  dest_lat: number;
  dest_lon: number;
  dest_label: string | null;
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

//perfil con ubicaciones guardadas (casa/trabajo)
export interface UserProfile {
  user_id: number;
  home_lat: number | null;
  home_lon: number | null;
  work_lat: number | null;
  work_lon: number | null;
}

//punto geografico simple para pasarlo al backend de rutas
export interface RoutePoint {
  lat: number;
  lon: number;
}

//zona de riesgo atravesada por la ruta
export interface RiskZone {
  district: number;
  level: string;
  probability: number;
}

//respuesta del endpoint de calculo de ruta (preview o calculate)
export interface RouteResponse {
  summary?: { distance_km: number; duration_min: number };
  geometry?: string | null;
  risk_zones?: RiskZone[];
  history_id?: number;
  reward?: {
    coins: number;
    xp: number;
    level_up: boolean;
    new_level: number | null;
    action: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class RouteService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  //calcula una ruta sin guardarla; endpoint publico
  preview(origin: RoutePoint, destination: RoutePoint, profile: string = 'driving-car'): Observable<RouteResponse> {
    return this.http.post<RouteResponse>(
      `${this.apiUrl}/routes/preview?include=summary,geometry`,
      { origin, destination, profile }
    );
  }

  //calcula la ruta y la guarda en el historial del usuario
  //calcula y guarda la ruta. origin/destination pueden traer ".label" con
  //el nombre legible (p.ej. "Centro" o "Aeropuerto") para mostrarlo luego
  //en el historial en vez de las coordenadas crudas.
  calculate(
    userId: number,
    origin: RoutePoint & { label?: string },
    destination: RoutePoint & { label?: string },
    profile: string = 'driving-car',
  ): Observable<RouteResponse> {
    return this.http.post<RouteResponse>(
      `${this.apiUrl}/routes?include=summary,geometry`,
      { user_id: userId, origin, destination, profile },
      { headers: this.getAuthHeaders() }
    );
  }

  //perfil del usuario con casa y trabajo
  getProfile(userId: number): Observable<UserProfile> {
    return this.http.get<UserProfile>(
      `${this.apiUrl}/users/${userId}/profile`,
      { headers: this.getAuthHeaders() }
    );
  }

  setHome(userId: number, lat: number, lon: number): Observable<UserProfile> {
    return this.http.put<UserProfile>(
      `${this.apiUrl}/users/${userId}/locations/home`,
      { lat, lon },
      { headers: this.getAuthHeaders() }
    );
  }

  setWork(userId: number, lat: number, lon: number): Observable<UserProfile> {
    return this.http.put<UserProfile>(
      `${this.apiUrl}/users/${userId}/locations/work`,
      { lat, lon },
      { headers: this.getAuthHeaders() }
    );
  }

  clearHome(userId: number): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/users/${userId}/locations/home`,
      { headers: this.getAuthHeaders() }
    );
  }

  clearWork(userId: number): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/users/${userId}/locations/work`,
      { headers: this.getAuthHeaders() }
    );
  }

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

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Servicio para consultar predicciones generadas por PC1.
// Las predicciones son el resultado del modelo de ML aplicado a
// cada (distrito, día). El frontend las pinta en el mapa.

export type PredictionLevel = 'BAJO' | 'MEDIO' | 'ALTO';

export interface Prediction {
  id: number;
  district: number;
  for_date: string;
  probability: number;
  level: PredictionLevel;
  predicted_at: string;
  model_type: string;
  target_type: string;
}

@Injectable({
  providedIn: 'root'
})
export class PredictionService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // Listado con filtros opcionales (target, fecha, nivel).
  // Por defecto el backend devuelve solo el lote más reciente.
  getPredictions(filtros: {
    target_type?: string;
    for_date?: string;
    level?: PredictionLevel;
    district?: number;
    limit?: number;
  } = {}): Observable<Prediction[]> {
    const params: string[] = [];

    if (filtros.target_type) {
      params.push(`target_type=${encodeURIComponent(filtros.target_type)}`);
    }
    if (filtros.for_date) {
      params.push(`for_date=${encodeURIComponent(filtros.for_date)}`);
    }
    if (filtros.level) {
      params.push(`level=${filtros.level}`);
    }
    if (filtros.district !== undefined) {
      params.push(`district=${filtros.district}`);
    }
    if (filtros.limit) {
      params.push(`limit=${filtros.limit}`);
    }

    const query = params.length > 0 ? `?${params.join('&')}` : '';
    return this.http.get<Prediction[]>(`${this.apiUrl}/predictions${query}`);
  }

  // Última predicción global (la más reciente generada).
  getLatest(): Observable<Prediction | null> {
    return this.http.get<Prediction | null>(`${this.apiUrl}/predictions/latest`);
  }

  // Últimas N predicciones para un distrito concreto.
  getByDistrict(district: number): Observable<Prediction[]> {
    return this.http.get<Prediction[]>(`${this.apiUrl}/predictions/districts/${district}`);
  }
}

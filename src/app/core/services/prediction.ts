import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

//lee las predicciones de PC1 desde la BD
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

  //listado filtrado, por defecto el ultimo lote
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

  //la mas reciente
  getLatest(): Observable<Prediction | null> {
    return this.http.get<Prediction | null>(`${this.apiUrl}/predictions/latest`);
  }

  //predicciones de un distrito
  getByDistrict(district: number): Observable<Prediction[]> {
    return this.http.get<Prediction[]>(`${this.apiUrl}/predictions/districts/${district}`);
  }
}

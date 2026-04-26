import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export type FuelType = 'electric' | 'hybrid' | 'gasoline' | 'diesel';

export interface BackendVehicle {
  id: number;
  user_id: number;
  vehicle_label_id: number | null;
  type: 'CAR' | 'MOTORBIKE' | 'VAN';
  nickname: string | null;

  brand: string | null;
  model: string | null;
  year: number | null;
  plate: string | null;
  fuel_type: FuelType | null;
  color_hex: string | null;
  color_name: string | null;

  is_electric: boolean;
  is_default: boolean;
  label?: any;
}

export interface VehiclePayload {
  type: 'CAR' | 'MOTORBIKE' | 'VAN';
  vehicle_label_id?: number | null;
  nickname?: string | null;

  brand: string;
  model: string;
  year?: number | null;
  plate?: string | null;
  fuel_type: FuelType;
  color_hex?: string | null;
  color_name?: string | null;

  is_electric?: boolean;
  is_default?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class VehicleService {
  private http = inject(HttpClient);
  private apiUrl = 'http://127.0.0.1:8000/api';

  getVehicles(userId: number): Observable<BackendVehicle[]> {
    return this.http.get<BackendVehicle[]>(`${this.apiUrl}/users/${userId}/vehicles`, {
      headers: this.getAuthHeaders()
    });
  }

  createVehicle(userId: number, payload: VehiclePayload): Observable<BackendVehicle> {
    return this.http.post<BackendVehicle>(`${this.apiUrl}/users/${userId}/vehicles`, payload, {
      headers: this.getAuthHeaders()
    });
  }

  updateVehicle(userId: number, vehicleId: number, payload: Partial<VehiclePayload>): Observable<BackendVehicle> {
    return this.http.put<BackendVehicle>(`${this.apiUrl}/users/${userId}/vehicles/${vehicleId}`, payload, {
      headers: this.getAuthHeaders()
    });
  }

  deleteVehicle(userId: number, vehicleId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${userId}/vehicles/${vehicleId}`, {
      headers: this.getAuthHeaders()
    });
  }

  setDefault(userId: number, vehicleId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${userId}/vehicles/${vehicleId}/default`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';

    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }
}
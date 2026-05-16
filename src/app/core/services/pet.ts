import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

//mascota virtual del usuario
export interface Pet {
  id: number;
  user_id: number;
  name: string;
  level: number;
  xp: number;
  image: string | null;
  updated_at?: string | null;
}

//todos opcionales para cambios parciales
export interface PetPayload {
  name?: string;
  level?: number;
  xp?: number;
  image?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class PetService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getPet(userId: number): Observable<Pet> {
    return this.http.get<Pet>(`${this.apiUrl}/users/${userId}/pet`, {
      headers: this.getAuthHeaders()
    });
  }

  updatePet(userId: number, payload: PetPayload): Observable<Pet> {
    return this.http.put<Pet>(`${this.apiUrl}/users/${userId}/pet`, payload, {
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

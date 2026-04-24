import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  // Esta URL debe ser la de tu php artisan serve
  private apiUrl = 'http://127.0.0.1:8000/api'; 

  // AQUÍ ESTÁ EL MÉTODO QUE TE FALTA
  login(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, data);
  }
}
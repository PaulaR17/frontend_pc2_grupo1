import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ConexionService {
  private http = inject(HttpClient);

  probarConexion() {
    return this.http.get('http://localhost:8000/api/health');
  }
}
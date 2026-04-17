import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ConexionService {
  private http = inject(HttpClient);

  probarConexion() {
    // Apuntamos a la ruta de salud que creamos en Laravel
    return this.http.get('http://localhost:8000/api/health');
  }
}
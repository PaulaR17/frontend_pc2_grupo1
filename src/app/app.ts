import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { RouterOutlet } from '@angular/router';
import { ConexionService } from './conexion.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class AppComponent implements OnInit {
  private conexionService = inject(ConexionService);
  
  mensaje: string = 'Cargando conexión...';
  conectado: boolean = false;

  ngOnInit() {
    this.conexionService.probarConexion().subscribe({
      next: (res: any) => {
        this.mensaje = '✅ ' + res.status;
        this.conectado = true;
      },
      error: (err) => {
        this.mensaje = '❌ Error: No se pudo conectar con Laravel';
        this.conectado = false;
        console.error('Detalle del error:', err);
      }
    });
  }
}